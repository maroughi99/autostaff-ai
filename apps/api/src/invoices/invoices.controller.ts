import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UnauthorizedException,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { SubscriptionGuard } from '../guards/subscription.guard';

@Controller('invoices')
@UseGuards(SubscriptionGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    return this.invoicesService.findAll(userId, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  async create(
    @Headers('clerk-user-id') userId: string,
    @Body() createDto: any,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    return this.invoicesService.create(userId, createDto);
  }

  @Post('from-quote/:quoteId')
  async createFromQuote(
    @Headers('clerk-user-id') userId: string,
    @Param('quoteId') quoteId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    return this.invoicesService.convertQuoteToInvoice(quoteId, userId);
  }

  @Post('progress-from-quote/:quoteId')
  async createProgressInvoice(
    @Param('quoteId') quoteId: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    return this.invoicesService.createProgressInvoice(quoteId, userId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.invoicesService.update(id, updateDto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.invoicesService.updateStatus(id, status);
  }

  @Post(':id/send')
  async send(@Param('id') id: string) {
    return this.invoicesService.sendInvoice(id);
  }

  @Post(':id/record-payment')
  async recordPayment(
    @Param('id') id: string,
    @Body() paymentData: {
      amount: number;
      method: string;
      reference?: string;
      notes?: string;
    },
  ) {
    return this.invoicesService.recordPayment(id, paymentData);
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.invoicesService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    return this.invoicesService.delete(id, userId);
  }
}
