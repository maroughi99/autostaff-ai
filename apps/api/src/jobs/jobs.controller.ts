import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { SubscriptionGuard } from '../guards/subscription.guard';

@Controller('jobs')
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Get()
  @UseGuards(SubscriptionGuard)
  async findAll(@Query('customerId') customerId?: string) {
    return this.jobsService.findAll(customerId);
  }

  @Get(':id')
  @UseGuards(SubscriptionGuard)
  async findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Post()
  @UseGuards(SubscriptionGuard)
  async create(@Body() data: any) {
    try {
      return await this.jobsService.create(data);
    } catch (error) {
      throw new Error(error.message || 'Failed to create job');
    }
  }

  @Patch(':id')
  @UseGuards(SubscriptionGuard)
  async update(@Param('id') id: string, @Body() data: any) {
    return this.jobsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(SubscriptionGuard)
  async delete(@Param('id') id: string) {
    return this.jobsService.delete(id);
  }
}
