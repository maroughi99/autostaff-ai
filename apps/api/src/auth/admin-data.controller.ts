import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
export class AdminDataController {
  constructor(private prisma: PrismaService) {}

  private isAdmin(email: string): boolean {
    const adminEmails = ['tonymaroughi@gmail.com', 'sarkon.shlemoon@gmail.com', 'sarkonshlemoon@gmail.com', 'gtaconcretemasonryinc@gmail.com'];
    return adminEmails.includes(email?.toLowerCase());
  }

  @Get('all-users')
  async getAllUsers(@Query('adminEmail') adminEmail: string) {
    if (!this.isAdmin(adminEmail)) {
      return { error: 'Unauthorized' };
    }

    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        aiConversationsUsed: true,
        aiConversationsLimit: true,
        gmailConnected: true,
        calendarConnected: true,
        createdAt: true,
        stripeCustomerId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { users, total: users.length };
  }

  @Get('all-leads')
  async getAllLeads(@Query('adminEmail') adminEmail: string) {
    if (!this.isAdmin(adminEmail)) {
      return { error: 'Unauthorized' };
    }

    const leads = await this.prisma.lead.findMany({
      include: {
        user: {
          select: {
            email: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { leads, total: leads.length };
  }

  @Get('stats')
  async getStats(@Query('adminEmail') adminEmail: string) {
    if (!this.isAdmin(adminEmail)) {
      return { error: 'Unauthorized' };
    }

    const [
      totalUsers,
      activeSubscriptions,
      trialUsers,
      cancelledUsers,
      totalLeads,
      gmailConnected,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { subscriptionStatus: 'active' } }),
      this.prisma.user.count({ where: { subscriptionStatus: 'trial' } }),
      this.prisma.user.count({ where: { subscriptionStatus: 'cancelled' } }),
      this.prisma.lead.count(),
      this.prisma.user.count({ where: { gmailConnected: true } }),
    ]);

    return {
      totalUsers,
      activeSubscriptions,
      trialUsers,
      cancelledUsers,
      totalLeads,
      gmailConnected,
    };
  }
}
