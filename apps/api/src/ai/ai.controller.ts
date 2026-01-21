import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private aiService: AiService,
    private prisma: PrismaService,
  ) {}

  @Post('classify')
  async classifyMessage(@Body() data: { content: string }) {
    return this.aiService.classifyMessage(data.content);
  }

  @Post('generate-response')
  async generateResponse(@Body() data: { message: string; context?: any }) {
    return this.aiService.generateResponse(data.message, data.context);
  }

  @Post('extract-info')
  async extractInfo(@Body() data: { message: string }) {
    return this.aiService.extractLeadInfo(data.message);
  }

  @Post('generate-quote')
  async generateQuote(@Body() data: { prompt: string; businessType?: string; conversationHistory?: any[]; userId?: string }) {
    const result = await this.aiService.generateQuote(data.prompt, data.businessType, data.conversationHistory, data.userId);
    
    // Track AI usage if userId is provided
    if (data.userId) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: data.userId },
          select: { aiConversationsUsed: true, aiConversationsLimit: true },
        });

        if (user) {
          await this.prisma.user.update({
            where: { id: data.userId },
            data: { aiConversationsUsed: { increment: 1 } },
          });
          this.logger.log(`📊 AI quote generated for user ${data.userId}: ${user.aiConversationsUsed + 1}/${user.aiConversationsLimit || '∞'} conversations used`);
        }
      } catch (error) {
        this.logger.error(`Failed to track AI usage for user ${data.userId}:`, error);
      }
    }
    
    return result;
  }

  @Get('automation-settings')
  async getAutomationSettings(@Query('userId') userId: string) {
    if (!userId) {
      return { error: 'userId is required' };
    }

    try {
      // Find user by Clerk ID or database ID
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { clerkId: userId },
          ],
        },
        select: {
          aiAutoApprove: true,
          automationSettings: true,
        },
      });

      if (!user) {
        this.logger.error(`User not found: ${userId}`);
        return { error: 'User not found' };
      }

      // Parse automation settings if they exist
      const settings = user.automationSettings ? JSON.parse(user.automationSettings as string) : {};

      this.logger.log(`📖 Loaded automation settings for user ${userId}`);
      return {
        aiAutoApprove: user.aiAutoApprove,
        ...settings,
      };
    } catch (error) {
      this.logger.error('Failed to get automation settings:', error.message);
      return { error: 'Failed to load settings' };
    }
  }

  @Post('automation-settings')
  async saveAutomationSettings(@Body() data: any) {
    const { userId, ...settings } = data;

    if (!userId) {
      return { error: 'userId is required' };
    }

    // Validate working hours if provided
    if (settings.workingHoursStart && settings.workingHoursEnd) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (!timeRegex.test(settings.workingHoursStart)) {
        return { error: 'Invalid workingHoursStart format. Expected HH:MM in 24-hour format (e.g., 09:00, 18:00).' };
      }
      
      if (!timeRegex.test(settings.workingHoursEnd)) {
        return { error: 'Invalid workingHoursEnd format. Expected HH:MM in 24-hour format (e.g., 09:00, 18:00).' };
      }

      // Note: We allow end time <= start time to support overnight shifts (e.g., 22:00 to 06:00)
      // The logic in email-poller and messages services will handle this correctly
    }

    try {
      // Find user by Clerk ID or database ID
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { clerkId: userId },
          ],
        },
      });

      if (!user) {
        this.logger.error(`User not found: ${userId}`);
        return { error: 'User not found' };
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          aiAutoApprove: settings.aiAutoApprove,
          automationSettings: JSON.stringify(settings),
        },
      });

      this.logger.log(`💾 Automation settings saved for user ${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to save automation settings:', error.message);
      return { error: 'Failed to save settings' };
    }
  }
}

