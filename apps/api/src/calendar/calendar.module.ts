import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionGuard } from '../guards/subscription.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CalendarController],
  providers: [CalendarService, SubscriptionGuard],
  exports: [CalendarService],
})
export class CalendarModule {}
