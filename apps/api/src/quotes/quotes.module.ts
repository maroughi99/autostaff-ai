import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { SubscriptionGuard } from '../guards/subscription.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { GmailModule } from '../gmail/gmail.module';

@Module({
  imports: [PrismaModule, GmailModule],
  controllers: [QuotesController],
  providers: [QuotesService, SubscriptionGuard],
  exports: [QuotesService],
})
export class QuotesModule {}
