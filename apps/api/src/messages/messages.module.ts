import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { SubscriptionGuard } from '../guards/subscription.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { GmailModule } from '../gmail/gmail.module';

@Module({
  imports: [GmailModule, PrismaModule],
  controllers: [MessagesController],
  providers: [MessagesService, SubscriptionGuard],
  exports: [MessagesService],
})
export class MessagesModule {}
