import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.query.userId || request.body.userId || request.params.userId;

    if (!userId) {
      throw new HttpException('User ID required', HttpStatus.BAD_REQUEST);
    }

    // TEST MODE: Allow test users with specific patterns to simulate subscriptions
    // Format: test-{tier}-{timestamp} where tier is: none, starter, pro, ultimate
    // This allows automated testing without creating real database users
    const userIdStr = userId.toString();
    if (userIdStr.startsWith('test-')) {
      const tierMatch = userIdStr.match(/^test-(none|starter|pro|ultimate)-/);
      
      if (tierMatch) {
        const tier = tierMatch[1];
        console.log(`[TEST MODE] User ${userIdStr} - Tier: ${tier}`);
        
        // Block "none" tier (no subscription)
        if (tier === 'none') {
          throw new HttpException(
            'Active subscription required',
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
        
        // Allow other test tiers (starter, pro, ultimate) with mock subscription data
        request.userSubscription = {
          plan: tier,
          status: 'active',
          stripeSubscriptionId: `test_sub_${tier}`,
        };
        return true;
      }
    }

    // Get user subscription
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: userId as string },
          { clerkId: userId as string },
        ],
      },
      select: {
        email: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        trialEndsAt: true,
        hasUsedTrial: true,
      },
    });

    // If user not found or no active subscription, require payment
    if (!user) {
      throw new HttpException(
        'Active subscription required',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Admin users bypass all subscription checks
    const adminEmails = [
      'tonymaroughi@gmail.com',
      'sarkon.shlemoon@gmail.com',
      'sarkonshlemoon@gmail.com',
      'gtaconcretemasonryinc@gmail.com',
    ];
    
    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
      request.userSubscription = {
        plan: 'ultimate',
        status: 'active',
        stripeSubscriptionId: 'admin_bypass',
      };
      return true;
    }

    // Check if user has active subscription or trial
    const hasActiveSubscription = 
      user.stripeSubscriptionId && 
      user.subscriptionStatus !== 'cancelled';
    
    // Check if trial is valid (not expired)
    const now = new Date();
    const hasActiveTrial = 
      user.subscriptionStatus === 'trial' && 
      user.trialEndsAt && 
      new Date(user.trialEndsAt) > now;

    // If trial expired but status still shows 'trial', auto-update to cancelled
    if (user.subscriptionStatus === 'trial' && user.trialEndsAt && new Date(user.trialEndsAt) <= now) {
      // Find the user again to get the unique identifier for update
      const userToUpdate = await this.prisma.user.findFirst({
        where: {
          OR: [
            { id: userId as string },
            { clerkId: userId as string },
          ],
        },
        select: { id: true },
      });
      
      if (userToUpdate) {
        await this.prisma.user.update({
          where: { id: userToUpdate.id },
          data: {
            subscriptionStatus: 'cancelled',
          },
        });
      }
    }

    if (!hasActiveSubscription && !hasActiveTrial) {
      throw new HttpException(
        'Active subscription required. Your trial has ended.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Attach subscription info to request for controllers to use
    request.userSubscription = {
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      stripeSubscriptionId: user.stripeSubscriptionId,
    };

    return true;
  }
}
