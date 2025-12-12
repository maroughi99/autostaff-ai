import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async parseAndStorePricingGuide(userId: string, file: Express.Multer.File) {
    try {
      this.logger.log(`📄 Processing pricing guide for user ${userId}: ${file.originalname}`);

      // Find user by Clerk ID
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { clerkId: userId },
          ],
        },
      });

      if (!user) {
        return { error: 'User not found' };
      }

      // Convert file to text based on type
      const fileText = await this.extractTextFromFile(file);
      
      this.logger.log(`📝 Extracted ${fileText.length} characters from file`);

      // Use AI to parse pricing guide into structured items
      const pricingItems = await this.aiService.parsePricingGuide(fileText, file.originalname);

      this.logger.log(`✅ AI parsed ${pricingItems.length} pricing items`);

      // Store each pricing item
      const stored = [];
      for (const item of pricingItems) {
        const created = await this.prisma.pricingItem.create({
          data: {
            userId: user.id,
            name: item.name,
            category: item.category,
            subcategory: item.subcategory,
            description: item.description,
            pricing: item.pricing,
            adjustments: item.adjustments || {},
            costBreakdown: item.costBreakdown || {},
            aiHints: item.aiHints || {},
            rules: item.rules || {},
            aiConfidence: item.aiConfidence || 0.8,
            needsReview: item.aiConfidence < 0.7,
            sourceFile: file.originalname,
            parsedFrom: this.getFileType(file.originalname),
          },
        });
        stored.push(created);
      }

      this.logger.log(`💾 Stored ${stored.length} pricing items`);

      return {
        success: true,
        itemsCreated: stored.length,
        items: stored,
        needsReview: stored.filter(i => i.needsReview).length,
      };
    } catch (error) {
      this.logger.error('Failed to parse pricing guide:', error);
      return { error: 'Failed to parse pricing guide', details: error.message };
    }
  }

  async getPricingItems(userId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { clerkId: userId },
          ],
        },
      });

      if (!user) {
        return { error: 'User not found' };
      }

      const items = await this.prisma.pricingItem.findMany({
        where: {
          userId: user.id,
          isActive: true,
        },
        orderBy: {
          category: 'asc',
        },
      });

      return { items };
    } catch (error) {
      this.logger.error('Failed to get pricing items:', error);
      return { error: 'Failed to load pricing items' };
    }
  }

  async getPricingSettings(userId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { clerkId: userId },
          ],
        },
        select: {
          usePricingGuide: true,
        },
      });

      if (!user) {
        return { error: 'User not found' };
      }

      return { usePricingGuide: user.usePricingGuide };
    } catch (error) {
      this.logger.error('Failed to get pricing settings:', error);
      return { error: 'Failed to load settings' };
    }
  }

  async updatePricingSettings(userId: string, usePricingGuide: boolean) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { clerkId: userId },
          ],
        },
      });

      if (!user) {
        return { error: 'User not found' };
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { usePricingGuide },
      });

      this.logger.log(`🔄 Updated pricing guide setting to ${usePricingGuide} for user ${userId}`);

      return { success: true, usePricingGuide };
    } catch (error) {
      this.logger.error('Failed to update pricing settings:', error);
      return { error: 'Failed to update settings' };
    }
  }

  async deletePricingItem(id: string, userId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { clerkId: userId },
          ],
        },
      });

      if (!user) {
        return { error: 'User not found' };
      }

      await this.prisma.pricingItem.update({
        where: { id, userId: user.id },
        data: { isActive: false },
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to delete pricing item:', error);
      return { error: 'Failed to delete item' };
    }
  }

  async updatePricingItem(id: string, data: any) {
    try {
      const updated = await this.prisma.pricingItem.update({
        where: { id },
        data: {
          name: data.name,
          category: data.category,
          subcategory: data.subcategory,
          description: data.description,
          pricing: data.pricing,
          adjustments: data.adjustments,
          costBreakdown: data.costBreakdown,
          aiHints: data.aiHints,
          rules: data.rules,
          needsReview: false,
          version: { increment: 1 },
        },
      });

      return { success: true, item: updated };
    } catch (error) {
      this.logger.error('Failed to update pricing item:', error);
      return { error: 'Failed to update item' };
    }
  }

  private async extractTextFromFile(file: Express.Multer.File): Promise<string> {
    const content = file.buffer.toString('utf-8');
    return content;
  }

  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'pdf';
      case 'csv': return 'csv';
      case 'xls':
      case 'xlsx': return 'excel';
      case 'txt': return 'text';
      default: return 'unknown';
    }
  }
}
