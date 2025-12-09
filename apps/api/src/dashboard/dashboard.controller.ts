import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { SubscriptionGuard } from '../guards/subscription.guard';

@Controller('dashboard')
@UseGuards(SubscriptionGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('overview')
  async getOverview(@Query('userId') userId: string) {
    return this.dashboardService.getOverviewStats(userId);
  }
}
