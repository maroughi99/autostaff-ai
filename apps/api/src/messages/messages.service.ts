import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GmailService } from '../gmail/gmail.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private gmailService: GmailService,
  ) {}

  async findAll(userId: string, filter?: string) {
    // Check if userId is a Clerk ID and convert to database ID
    let dbUserId = userId;
    if (userId.startsWith('user_')) {
      const user = await this.prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });
      if (user) {
        dbUserId = user.id;
      }
    }

    // Filter messages by user through the Lead relationship
    const where: any = {
      lead: {
        userId: dbUserId,
      },
    };

    // Apply filters
    if (filter === 'unread') {
      where.readAt = null;
      where.direction = 'inbound';
    } else if (filter === 'leads') {
      where.lead = {
        ...where.lead,
        aiClassification: 'lead',
      };
    } else if (filter === 'ai-pending') {
      where.isAiGenerated = true;
      // Show all AI-generated messages that haven't been sent yet
      where.sentAt = null;
    }

    return this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            stage: true,
            priority: true,
            serviceType: true,
          },
        },
      },
      take: 100, // Limit to 100 messages
    });
  }

  async findByLead(leadId: string) {
    return this.prisma.message.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: any) {
    return this.prisma.message.create({
      data,
    });
  }

  async createReply(data: any) {
    return this.prisma.message.create({
      data: {
        ...data,
        direction: 'outbound',
        isAiGenerated: true,
      },
    });
  }

  async findById(messageId: string) {
    return this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            userId: true,
          },
        },
      },
    });
  }

  async markAsRead(messageId: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }

  async updateDraft(messageId: string, updates: { subject?: string; content?: string }) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: updates,
    });
  }

  async approveDraft(messageId: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        aiApprovalNeeded: false,
        aiApprovedAt: new Date(),
      },
    });
  }

  async rejectDraft(messageId: string) {
    return this.prisma.message.delete({
      where: { id: messageId },
    });
  }

  async sendMessage(messageId: string, userClerkId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            userId: true,
          },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (!message.toEmail) {
      throw new Error('No recipient email');
    }

    // Send via Gmail
    try {
      await this.gmailService.sendMessage(
        userClerkId,
        message.toEmail,
        message.subject || 'Re: Your inquiry',
        message.content,
      );

      // Mark as sent
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          sentAt: new Date(),
          aiApprovalNeeded: false,
        },
      });

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async deleteMessage(id: string) {
    await this.prisma.message.delete({
      where: { id },
    });
    return { success: true, message: 'Message deleted' };
  }
}
