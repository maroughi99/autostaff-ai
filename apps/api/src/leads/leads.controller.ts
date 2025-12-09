import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { SubscriptionGuard } from '../guards/subscription.guard';

@Controller('leads')
@UseGuards(SubscriptionGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  async findAll(@Query('userId') userId: string) {
    return this.leadsService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('userId') userId: string) {
    return this.leadsService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.leadsService.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any, @Query('userId') userId: string) {
    return this.leadsService.update(id, data);
  }

  @Patch(':id/stage')
  async updateStage(@Param('id') id: string, @Body('stage') stage: string, @Query('userId') userId: string) {
    return this.leadsService.updateStage(id, stage);
  }
}
