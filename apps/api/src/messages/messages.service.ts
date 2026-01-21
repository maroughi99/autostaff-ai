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
    console.log('[APPROVE SERVICE] Looking for message:', messageId);
    
    // Check if message exists first
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    
    if (!message) {
      console.error('[APPROVE SERVICE] Message not found:', messageId);
      throw new Error('Message not found');
    }
    
    console.log('[APPROVE SERVICE] Message found, updating...');
    
    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        aiApprovalNeeded: false,
        aiApprovedAt: new Date(),
      },
    });
  }

  async rejectDraft(messageId: string, userId: string) {
    // Verify the message belongs to the user
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        lead: {
          OR: [
            { userId },
            { user: { clerkId: userId } },
          ],
        },
      },
    });

    if (!message) {
      throw new Error('Message not found or access denied');
    }

    return this.prisma.message.delete({
      where: { id: messageId },
    });
  }

  private isWithinWorkingHours(settings: any): boolean {
    if (!settings?.respectWorkingHours) {
      return true; // No restrictions
    }

    const now = new Date();
    const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Check if current day is a working day
    const workingDays = settings.workingDays || ['mon', 'tue', 'wed', 'thu', 'fri'];
    if (!workingDays.includes(currentDay)) {
      console.log(`[WORKING HOURS] Current day (${currentDay}) is not a working day`);
      return false;
    }

    // Parse working hours (format: "HH:MM")
    const startTime = settings.workingHoursStart || '09:00';
    const endTime = settings.workingHoursEnd || '17:00';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle both same-day shifts and overnight shifts
    let isWithinHours: boolean;
    
    if (endMinutes > startMinutes) {
      // Same-day shift (e.g., 09:00 to 17:00)
      isWithinHours = currentTime >= startMinutes && currentTime < endMinutes;
    } else {
      // Overnight shift (e.g., 22:00 to 06:00)
      // Within hours if: after start time OR before end time
      isWithinHours = currentTime >= startMinutes || currentTime < endMinutes;
      console.log(`[WORKING HOURS] Overnight shift detected: ${startTime}-${endTime}`);
    }
    
    if (!isWithinHours) {
      console.log(`[WORKING HOURS] Current time ${now.getHours()}:${now.getMinutes()} is outside working hours ${startTime}-${endTime}`);
    }

    return isWithinHours;
  }

  async sendMessage(messageId: string, userClerkId: string) {
    console.log('[SEND MESSAGE] Starting send for message:', messageId, 'userClerkId:', userClerkId);
    
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
      console.error('[SEND MESSAGE] Message not found:', messageId);
      throw new Error('Message not found');
    }

    console.log('[SEND MESSAGE] Message details:', {
      id: message.id,
      toEmail: message.toEmail,
      subject: message.subject,
      leadName: message.lead?.name,
      direction: message.direction,
    });

    if (!message.toEmail) {
      console.error('[SEND MESSAGE] No recipient email');
      throw new Error('No recipient email');
    }

    // Check working hours settings
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: message.lead.userId },
          { clerkId: userClerkId },
        ],
      },
      select: {
        automationSettings: true,
      },
    });

    const settings = user?.automationSettings ? JSON.parse(user.automationSettings as string) : {};
    
    if (!this.isWithinWorkingHours(settings)) {
      console.log('[SEND MESSAGE] Message blocked - outside working hours');
      throw new Error('Cannot send messages outside of working hours. Please try again during business hours or disable working hours restrictions in automation settings.');
    }

    // Send via Gmail
    try {
      console.log('[SEND MESSAGE] Calling Gmail service to send to:', message.toEmail);
      
      const gmailResult = await this.gmailService.sendMessage(
        userClerkId,
        message.toEmail,
        message.subject || 'Re: Your inquiry',
        message.content,
      );

      console.log('[SEND MESSAGE] Gmail send successful, result:', gmailResult);

      // Mark as sent
      await this.prisma.message.update({
        where: { id: messageId },
        data: {
          sentAt: new Date(),
          aiApprovalNeeded: false,
        },
      });

      console.log('[SEND MESSAGE] Message marked as sent in database');
      return { success: true, gmailMessageId: gmailResult.id };
    } catch (error) {
      console.error('[SEND MESSAGE] Failed to send:', error.message, error.stack);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async deleteMessage(id: string, userId: string) {
    // Verify the message belongs to the user
    const message = await this.prisma.message.findFirst({
      where: {
        id,
        lead: {
          OR: [
            { userId },
            { user: { clerkId: userId } },
          ],
        },
      },
    });

    if (!message) {
      throw new Error('Message not found or access denied');
    }

    await this.prisma.message.delete({
      where: { id },
    });
    return { success: true, message: 'Message deleted' };
  }
}
