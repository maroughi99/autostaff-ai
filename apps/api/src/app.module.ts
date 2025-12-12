import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LeadsModule } from './leads/leads.module';
import { MessagesModule } from './messages/messages.module';
import { QuotesModule } from './quotes/quotes.module';
import { InvoicesModule } from './invoices/invoices.module';
import { AiModule } from './ai/ai.module';
import { GmailModule } from './gmail/gmail.module';
import { EmailPollerModule } from './email-poller/email-poller.module';
import { CalendarModule } from './calendar/calendar.module';
import { StripeModule } from './stripe/stripe.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CustomersModule } from './customers/customers.module';
import { JobsModule } from './jobs/jobs.module';
import { PricingModule } from './pricing/pricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    LeadsModule,
    MessagesModule,
    QuotesModule,
    InvoicesModule,
    StripeModule,
    AiModule,
    GmailModule,
    EmailPollerModule,
    CalendarModule,
    DashboardModule,
    CustomersModule,
    JobsModule,
    PricingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
