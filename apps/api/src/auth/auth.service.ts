import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async findOrCreateUser(clerkUserId: string, email: string, name?: string) {
    let user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    // Admin emails get ultimate plan with unlimited features
    const emailLowercase = email.toLowerCase().trim();
    const adminEmails = ['sarkon.shlemoon@gmail.com', 'sarkonshlemoon@gmail.com', 'tonymaroughi@gmail.com', 'gtaconcretemasonryinc@gmail.com', 'jonmormont.414817@gmail.com'];
    const isAdmin = adminEmails.includes(emailLowercase);

    // If user exists and is admin, upgrade them to ultimate plan
    if (user && isAdmin) {
      if (user.subscriptionPlan !== 'ultimate' || user.subscriptionStatus !== 'active') {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionPlan: 'ultimate',
            subscriptionStatus: 'active',
            aiConversationsLimit: null, // unlimited
            hasUsedTrial: true,
          },
        });
      }
      return user;
    }

    if (!user) {
      // Check if this email has been used before for a trial (prevent abuse)
      const emailLowercase = email.toLowerCase().trim();
      
      // Admin emails get ultimate plan with unlimited features
      const adminEmails = ['sarkon.shlemoon@gmail.com', 'sarkonshlemoon@gmail.com', 'tonymaroughi@gmail.com', 'gtaconcretemasonryinc@gmail.com', 'jonmormont.414817@gmail.com'];
      const isAdmin = adminEmails.includes(emailLowercase);
      const existingUserWithEmail = await this.prisma.user.findFirst({
        where: { 
          email: emailLowercase,
          hasUsedTrial: true,
        },
      });

      // If email was used before, don't give another trial
      const shouldGrantTrial = !existingUserWithEmail;
      
      // Calculate trial end date (7 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      user = await this.prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: emailLowercase,
          name,
          hasUsedTrial: isAdmin ? true : shouldGrantTrial,
          subscriptionStatus: isAdmin ? 'active' : (shouldGrantTrial ? 'trial' : 'cancelled'),
          subscriptionPlan: isAdmin ? 'ultimate' : 'starter',
          trialStartedAt: shouldGrantTrial && !isAdmin ? new Date() : null,
          trialEndsAt: shouldGrantTrial && !isAdmin ? trialEndsAt : null,
          aiConversationsLimit: isAdmin ? null : undefined, // null = unlimited for admin
        },
      });
    } else if (user.subscriptionStatus === 'trial' && !user.hasUsedTrial) {
      // If existing user is on trial but hasn't been marked as having used trial, mark it now
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          hasUsedTrial: true,
          trialStartedAt: user.trialStartedAt || new Date(),
        },
      });
    }

    return user;
  }
}
