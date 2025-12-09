import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { SubscriptionGuard } from '../guards/subscription.guard';

@Controller('calendar')
@UseGuards(SubscriptionGuard)
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get('bookings')
  async getBookings(@Query('userId') userId: string) {
    // Return empty array for test users
    if (userId?.toString().startsWith('test-')) {
      return [];
    }
    // For real users, this would fetch their calendar events/bookings
    return this.calendarService.getUpcomingEvents(userId);
  }

  @Get('available-slots')
  async getAvailableSlots(
    @Query('userId') userId: string,
    @Query('duration') duration?: number,
    @Query('daysAhead') daysAhead?: number,
  ) {
    return this.calendarService.getAvailableSlots(
      userId,
      duration ? parseInt(String(duration)) : 60,
      daysAhead ? parseInt(String(daysAhead)) : 14,
    );
  }

  @Post('create-event')
  async createEvent(@Body() body: {
    userId: string;
    summary: string;
    description: string;
    startTime: string;
    endTime: string;
    attendeeEmail?: string;
  }) {
    return this.calendarService.createEvent(
      body.userId,
      body.summary,
      body.description,
      body.startTime,
      body.endTime,
      body.attendeeEmail,
    );
  }
}
