import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { SubscriptionGuard } from '../guards/subscription.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { GmailModule } from '../gmail/gmail.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [PrismaModule, GmailModule, StripeModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, SubscriptionGuard],
  exports: [InvoicesService],
})
export class InvoicesModule {}
