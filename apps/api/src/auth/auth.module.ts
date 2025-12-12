import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminController } from './admin.controller';
import { AdminDataController } from './admin-data.controller';

@Module({
  controllers: [AuthController, AdminController, AdminDataController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
