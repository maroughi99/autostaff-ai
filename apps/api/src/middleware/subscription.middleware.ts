import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

// Feature limits for each subscription tier
const SUBSCRIPTION_LIMITS = {
  starter: {
    features: [
      'email_integration',
      'calendar_management',
      'lead_tracking',
      'invoice_generation',
      'quote_generation',
      'payment_processing',
    ],
  },
  pro: {
    features: [
      'email_integration',
      'calendar_management',
      'lead_tracking',
      'lead_scoring',
      'invoice_generation',
      'quote_generation',
      'contract_generation',
      'payment_processing',
      'custom_ai_training',
      'team_collaboration',
    ],
  },
  ultimate: {
    features: [
      'email_integration',
      'calendar_management',
      'lead_tracking',
      'lead_scoring',
      'invoice_generation',
      'quote_generation',
      'contract_generation',
      'payment_processing',
      'custom_ai_training',
      'team_collaboration',
      'white_label',
      'api_access',
      'multi_location',
      'priority_support',
    ],
  },
};

@Injectable()
export class SubscriptionMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const userId = req.query.userId || req.body.userId || req.params.userId;

    if (!userId) {
      throw new HttpException('User ID required', HttpStatus.BAD_REQUEST);
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
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Check if user has active subscription
    const hasActiveSubscription = 
      user.stripeSubscriptionId && 
      user.subscriptionStatus !== 'cancelled';

    if (!hasActiveSubscription) {
      throw new HttpException(
        'Active subscription required',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Attach subscription info to request
    (req as any).userSubscription = {
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      features: SUBSCRIPTION_LIMITS[user.subscriptionPlan]?.features || [],
    };

    next();
  }
}

// Helper function to check feature access
export function requireFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const subscription = (req as any).userSubscription;

    if (!subscription || !subscription.features.includes(feature)) {
      throw new HttpException(
        `This feature requires a subscription plan with ${feature} access`,
        HttpStatus.FORBIDDEN,
      );
    }

    next();
  };
}
