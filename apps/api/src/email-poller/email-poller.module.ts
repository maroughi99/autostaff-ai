import { Module } from '@nestjs/common';
import { EmailPollerService } from './email-poller.service';
import { GmailModule } from '../gmail/gmail.module';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CalendarModule } from '../calendar/calendar.module';
import { QuotesModule } from '../quotes/quotes.module';

@Module({
  imports: [PrismaModule, GmailModule, AiModule, CalendarModule, QuotesModule],
  providers: [EmailPollerService],
  exports: [EmailPollerService],
})
export class EmailPollerModule {}
