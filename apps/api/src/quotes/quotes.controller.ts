import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { QuotesService } from './quotes.service';
import { SubscriptionGuard } from '../guards/subscription.guard';

@Controller('quotes')
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Get()
  @UseGuards(SubscriptionGuard)
  async findAll(@Query('userId') userId: string) {
    return this.quotesService.findAll(userId);
  }

  @Get(':id')
  @UseGuards(SubscriptionGuard)
  async findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id);
  }

  @Post()
  @UseGuards(SubscriptionGuard)
  async create(@Body() data: any) {
    return this.quotesService.create(data);
  }

  @Patch(':id')
  @UseGuards(SubscriptionGuard)
  async update(@Param('id') id: string, @Body() data: any, @Query('userId') userId: string) {
    return this.quotesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(SubscriptionGuard)
  async delete(@Param('id') id: string, @Query('userId') userId: string) {
    return this.quotesService.delete(id);
  }

  @Post(':id/send')
  @UseGuards(SubscriptionGuard)
  async send(@Param('id') id: string) {
    try {
      return await this.quotesService.sendQuote(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send quote',
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('generate')
  @UseGuards(SubscriptionGuard)
  async generate(@Body() data: any) {
    return this.quotesService.generateQuote(data);
  }

  @Get(':id/accept')
  async accept(@Param('id') id: string, @Res() res: Response) {
    const html = await this.quotesService.acceptQuote(id);
    res.header('Content-Type', 'text/html');
    res.send(html);
  }

  @Get(':id/reject')
  async reject(@Param('id') id: string, @Res() res: Response) {
    const html = await this.quotesService.rejectQuote(id);
    res.header('Content-Type', 'text/html');
    res.send(html);
  }

  @Post('convert-accepted-to-invoices')
  @UseGuards(SubscriptionGuard)
  async convertAcceptedToInvoices(@Query('userId') userId: string) {
    return this.quotesService.convertAcceptedQuotesToInvoices(userId);
  }

  @Patch(':quoteId/items/:itemId/progress')
  @UseGuards(SubscriptionGuard)
  async updateItemProgress(
    @Param('quoteId') quoteId: string,
    @Param('itemId') itemId: string,
    @Body('progress') progress: number,
    @Query('userId') userId: string
  ) {
    return this.quotesService.updateItemProgress(itemId, progress);
  }

  @Get(':id/financial-breakdown')
  @UseGuards(SubscriptionGuard)
  async getFinancialBreakdown(@Param('id') id: string, @Query('userId') userId: string) {
    return this.quotesService.getFinancialBreakdown(id, userId);
  }
}
