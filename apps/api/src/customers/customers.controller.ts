import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { SubscriptionGuard } from '../guards/subscription.guard';

@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @UseGuards(SubscriptionGuard)
  async findAll(@Query('userId') userId: string) {
    return this.customersService.findAll(userId);
  }

  @Get(':id')
  @UseGuards(SubscriptionGuard)
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @UseGuards(SubscriptionGuard)
  async create(@Body() data: any) {
    return this.customersService.create(data);
  }

  @Patch(':id')
  @UseGuards(SubscriptionGuard)
  async update(@Param('id') id: string, @Body() data: any) {
    return this.customersService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(SubscriptionGuard)
  async delete(@Param('id') id: string) {
    return this.customersService.delete(id);
  }
}
