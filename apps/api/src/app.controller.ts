import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('api')
  getApiInfo() {
    return {
      name: 'AutoStaff AI API',
      version: '1.0.0',
      status: 'operational',
    };
  }
}
