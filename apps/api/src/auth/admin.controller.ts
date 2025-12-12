import { Controller, Post, Body } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Post('upgrade-user')
  async upgradeUser(@Body() data: { email: string; secret: string }) {
    // Simple security - only works with secret key
    if (data.secret !== 'autostaff_admin_2025') {
      return { error: 'Invalid secret' };
    }

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          email: {
            contains: data.email,
            mode: 'insensitive',
          },
        },
      });

      if (!user) {
        return { error: 'User not found' };
      }

      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: 'active',
          subscriptionPlan: 'ultimate',
          aiConversationsLimit: null,
          hasUsedTrial: true,
        },
      });

      return {
        success: true,
        message: `User ${updated.email} upgraded to Ultimate plan`,
        user: {
          email: updated.email,
          plan: updated.subscriptionPlan,
          status: updated.subscriptionStatus,
        },
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}
