import { Controller, Get, Post, Body, Param, Query, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  // Upload and parse pricing guide
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPricingGuide(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string,
  ) {
    return this.pricingService.parseAndStorePricingGuide(userId, file);
  }

  // Get all pricing items for a user
  @Get()
  async getPricingItems(@Query('userId') userId: string) {
    return this.pricingService.getPricingItems(userId);
  }

  // Get pricing guide toggle status
  @Get('settings')
  async getPricingSettings(@Query('userId') userId: string) {
    return this.pricingService.getPricingSettings(userId);
  }

  // Toggle pricing guide usage
  @Post('settings')
  async updatePricingSettings(
    @Body('userId') userId: string,
    @Body('usePricingGuide') usePricingGuide: boolean,
  ) {
    return this.pricingService.updatePricingSettings(userId, usePricingGuide);
  }

  // Delete a pricing item
  @Delete(':id')
  async deletePricingItem(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    return this.pricingService.deletePricingItem(id, userId);
  }

  // Update a pricing item (for manual edits after AI parsing)
  @Post(':id')
  async updatePricingItem(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.pricingService.updatePricingItem(id, data);
  }
}
