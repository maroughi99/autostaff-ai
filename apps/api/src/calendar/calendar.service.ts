import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalendarService {
  private oauth2Client;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GMAIL_CLIENT_ID'),
      this.configService.get('GMAIL_CLIENT_SECRET'),
      this.configService.get('GMAIL_REDIRECT_URI'),
    );
  }

  async getCalendarClient(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user?.gmailAccessToken) {
      throw new Error('Calendar not connected');
    }

    this.oauth2Client.setCredentials({
      access_token: user.gmailAccessToken,
      refresh_token: user.gmailRefreshToken,
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async getAvailableSlots(userId: string, durationMinutes: number = 60, daysAhead: number = 14) {
    try {
      const calendar = await this.getCalendarClient(userId);

      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      // Get all events in the next 14 days
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const busySlots = response.data.items || [];

      // Define working hours (9 AM - 5 PM, Monday-Friday)
      const workingHours = { start: 9, end: 17 };
      const availableSlots = [];

      // Generate time slots for next 14 days
      for (let day = 0; day < daysAhead; day++) {
        const date = new Date();
        date.setDate(date.getDate() + day);
        
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        // Skip past days
        if (date < now) continue;

        // Generate hourly slots
        for (let hour = workingHours.start; hour < workingHours.end; hour++) {
          const slotStart = new Date(date);
          slotStart.setHours(hour, 0, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

          // Skip if slot is in the past
          if (slotStart < now) continue;

          // Check if slot conflicts with existing events
          const hasConflict = busySlots.some((event: any) => {
            const eventStart = new Date(event.start.dateTime || event.start.date);
            const eventEnd = new Date(event.end.dateTime || event.end.date);
            
            return (
              (slotStart >= eventStart && slotStart < eventEnd) ||
              (slotEnd > eventStart && slotEnd <= eventEnd) ||
              (slotStart <= eventStart && slotEnd >= eventEnd)
            );
          });

          if (!hasConflict) {
            availableSlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              formatted: slotStart.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              }),
            });
          }
        }
      }

      return availableSlots.slice(0, 10); // Return first 10 available slots
    } catch (error) {
      console.error('Failed to get available slots:', error);
      throw error;
    }
  }

  async createEvent(
    userId: string,
    summary: string,
    description: string,
    startTime: string,
    endTime: string,
    attendeeEmail?: string,
  ) {
    try {
      const calendar = await this.getCalendarClient(userId);

      const event = {
        summary,
        description,
        start: {
          dateTime: startTime,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: endTime,
          timeZone: 'America/New_York',
        },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all', // Send email notifications
      });

      return response.data;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  async getUpcomingEvents(userId: string) {
    try {
      const calendar = await this.getCalendarClient(userId);

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: thirtyDaysFromNow.toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Failed to get calendar events:', error);
      return [];
    }
  }
}
