import { Controller, Post, Body, Get, UseGuards, Req, Patch, Query, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Get('me')
  async getCurrentUser(@Req() req) {
    const userId = req.query.userId || req.user?.id;
    
    if (!userId) {
      return { error: 'No user ID provided' };
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        gmailConnected: true,
        gmailEmail: true,
        calendarConnected: true,
        aiAutoApprove: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        trialEndsAt: true,
        aiConversationsUsed: true,
        aiConversationsLimit: true,
        lastResetAt: true,
      },
    });

    return user || { error: 'User not found' };
  }

  @Post('sync-user')
  async syncUser(@Body() body: { clerkId: string; email: string; name?: string }) {
    const { clerkId, email, name } = body;

    // Check if user exists by clerkId
    const existingUserByClerkId = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, subscriptionPlan: true, aiConversationsLimit: true, email: true },
    });

    // Check if a user with this email already exists (from different Clerk instance)
    const existingUserByEmail = await this.prisma.user.findFirst({
      where: { 
        email: email.toLowerCase().trim(),
        clerkId: { not: clerkId }, // Different clerkId
      },
    });

    // If user exists by email but different clerkId, update their clerkId
    if (existingUserByEmail && !existingUserByClerkId) {
      const user = await this.prisma.user.update({
        where: { id: existingUserByEmail.id },
        data: { 
          clerkId,
          name: name || existingUserByEmail.name,
        },
      });
      return { success: true, user };
    }

    // Prepare update/create data
    const userData: any = { email: email.toLowerCase().trim(), name };

    // For new users, set default starter limit
    if (!existingUserByClerkId) {
      userData.aiConversationsLimit = 50;
      userData.subscriptionPlan = 'starter';
      userData.subscriptionStatus = 'trial';
      userData.aiConversationsUsed = 0;
      userData.lastResetAt = new Date();
      userData.hasUsedTrial = true; // Mark that they've used their trial
      userData.trialStartedAt = new Date();
      userData.trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    } else {
      // For existing users, ensure they have proper limits set based on their plan
      let correctLimit: number | null = null;
      const plan = existingUserByClerkId.subscriptionPlan?.toLowerCase();
      
      if (plan === 'starter') {
        correctLimit = 50;
      } else if (plan === 'pro') {
        correctLimit = 200;
      } else if (plan === 'ultimate') {
        correctLimit = null; // unlimited
      } else {
        // No plan set, default to starter
        correctLimit = 50;
      }

      // Only update if limit is incorrect
      if (existingUserByClerkId.aiConversationsLimit !== correctLimit) {
        userData.aiConversationsLimit = correctLimit;
      }
    }

    // Create or update user
    const user = await this.prisma.user.upsert({
      where: { clerkId },
      update: userData,
      create: { clerkId, ...userData },
    });

    return { success: true, user };
  }

  @Patch('update-settings')
  async updateSettings(
    @Req() req, 
    @Body() body: { 
      businessName?: string; 
      businessType?: string;
      email?: string;
      phone?: string;
      timezone?: string;
      aiAutoApprove?: boolean; 
      calendarConnected?: boolean;
    }
  ) {
    const userId = req.headers.authorization?.replace('Bearer ', '');
    
    if (!userId) {
      return { error: 'No user ID provided' };
    }

    const updateData: any = {};
    if (body.businessName !== undefined) {
      updateData.businessName = body.businessName;
    }
    if (body.businessType !== undefined) {
      updateData.businessType = body.businessType;
    }
    if (body.email !== undefined) {
      updateData.email = body.email;
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone;
    }
    if (body.timezone !== undefined) {
      updateData.timezone = body.timezone;
    }
    if (body.aiAutoApprove !== undefined) {
      updateData.aiAutoApprove = body.aiAutoApprove;
    }
    if (body.calendarConnected !== undefined) {
      updateData.calendarConnected = body.calendarConnected;
    }

    const user = await this.prisma.user.update({
      where: { clerkId: userId },
      data: updateData,
    });

    return { success: true, user };
  }

  @Get('fix-ai-limits')
  async fixAiLimits(@Query('userId') userId: string) {
    if (!userId) {
      throw new NotFoundException('userId query parameter required');
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        subscriptionPlan: true,
        aiConversationsUsed: true,
        aiConversationsLimit: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let aiConversationsLimit: number | null = null;
    const plan = user.subscriptionPlan?.toLowerCase();

    if (plan === 'starter') {
      aiConversationsLimit = 50;
    } else if (plan === 'pro') {
      aiConversationsLimit = 200;
    } else if (plan === 'ultimate') {
      aiConversationsLimit = null; // unlimited
    } else {
      // No active plan, set to starter trial limit
      aiConversationsLimit = 50;
    }

    const updatedUser = await this.prisma.user.update({
      where: { clerkId: userId },
      data: {
        aiConversationsLimit,
        lastResetAt: new Date(),
      },
      select: {
        aiConversationsUsed: true,
        aiConversationsLimit: true,
        subscriptionPlan: true,
      },
    });

    return {
      message: 'AI limits fixed successfully',
      plan: updatedUser.subscriptionPlan || 'trial',
      aiConversationsUsed: updatedUser.aiConversationsUsed,
      aiConversationsLimit: updatedUser.aiConversationsLimit,
    };
  }
}
