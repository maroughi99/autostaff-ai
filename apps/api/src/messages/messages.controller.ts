import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SubscriptionGuard } from '../guards/subscription.guard';

@Controller('messages')
@UseGuards(SubscriptionGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  async findAll(
    @Query('userId') userId: string,
    @Query('filter') filter?: string,
  ) {
    return this.messagesService.findAll(userId, filter);
  }

  @Get('lead/:leadId')
  async findByLead(@Param('leadId') leadId: string) {
    return this.messagesService.findByLead(leadId);
  }

  @Post()
  async create(@Body() data: any) {
    return this.messagesService.create(data);
  }

  @Post('reply')
  async createReply(@Body() data: any) {
    return this.messagesService.createReply(data);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.messagesService.findById(id);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.messagesService.markAsRead(id);
  }

  @Post(':id/approve')
  async approveDraft(@Param('id') id: string) {
    console.log('[APPROVE] Approving message:', id);
    try {
      const result = await this.messagesService.approveDraft(id);
      console.log('[APPROVE] Success:', result.id);
      return result;
    } catch (error) {
      console.error('[APPROVE] Failed:', error.message);
      throw error;
    }
  }

  @Post(':id/reject')
  async rejectDraft(@Param('id') id: string) {
    return this.messagesService.rejectDraft(id);
  }

  @Post(':id/edit')
  async updateDraft(
    @Param('id') id: string,
    @Body() data: { subject?: string; content?: string },
  ) {
    return this.messagesService.updateDraft(id, data);
  }

  @Post(':id/send')
  async sendMessage(
    @Param('id') id: string,
    @Body() data: { userClerkId: string },
  ) {
    return this.messagesService.sendMessage(id, data.userClerkId);
  }

  @Delete(':id')
  async deleteMessage(@Param('id') id: string) {
    return this.messagesService.deleteMessage(id);
  }
}
