import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { GmailService } from '../gmail/gmail.service';
import { AiService } from '../ai/ai.service';
import { CalendarService } from '../calendar/calendar.service';
import { QuotesService } from '../quotes/quotes.service';

@Injectable()
export class EmailPollerService {
  private readonly logger = new Logger(EmailPollerService.name);

  constructor(
    private prisma: PrismaService,
    private gmailService: GmailService,
    private aiService: AiService,
    private calendarService: CalendarService,
    private quotesService: QuotesService,
  ) {}

  private isSpamEmail(from: string, subject: string, body: string): boolean {
    const spamIndicators = [
      // Common spam phrases
      'click here now', 'act now', 'limited time offer', 'free money',
      'weight loss', 'viagra', 'cialis', 'casino', 'lottery',
      'nigerian prince', 'inheritance', 'wire transfer',
      'congratulations you won', 'claim your prize',
      // Suspicious patterns
      'dear sir/madam', 'dear friend',
    ];

    const textToCheck = `${subject} ${body}`.toLowerCase();
    const hasSpamIndicator = spamIndicators.some(indicator => 
      textToCheck.includes(indicator)
    );

    // Check for suspicious sender patterns
    const suspiciousSenders = [
      'noreply@', 'no-reply@', 'donotreply@',
    ];
    const hasSuspiciousSender = suspiciousSenders.some(pattern =>
      from.toLowerCase().includes(pattern)
    );

    return hasSpamIndicator || hasSuspiciousSender;
  }

  private isMarketingEmail(from: string, subject: string, body: string, headers: any[]): boolean {
    const marketingIndicators = [
      'unsubscribe', 'manage your preferences', 'email preferences',
      'newsletter', 'promotional', 'special offer', 'discount',
      'sale', 'limited time', 'shop now', 'buy now',
      'follow us on', 'connect with us',
    ];

    const textToCheck = `${subject} ${body}`.toLowerCase();
    const hasMarketingIndicator = marketingIndicators.some(indicator =>
      textToCheck.includes(indicator)
    );

    // Check for list-unsubscribe header (standard for marketing emails)
    const hasUnsubscribeHeader = headers.some((h: any) =>
      h.name?.toLowerCase() === 'list-unsubscribe'
    );

    // Check for bulk/marketing sender patterns
    const bulkSenders = [
      'newsletter@', 'marketing@', 'promo@', 'info@',
      'news@', 'updates@', 'notifications@',
    ];
    const isBulkSender = bulkSenders.some(pattern =>
      from.toLowerCase().includes(pattern)
    );

    return hasMarketingIndicator || hasUnsubscribeHeader || isBulkSender;
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
      this.logger.log(`[WORKING HOURS] Current day (${currentDay}) is not a working day`);
      return false;
    }

    // Parse working hours (format: "HH:MM")
    const startTime = settings.workingHoursStart || '09:00';
    const endTime = settings.workingHoursEnd || '17:00';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const isWithinHours = currentTime >= startMinutes && currentTime < endMinutes;
    
    if (!isWithinHours) {
      this.logger.log(`[WORKING HOURS] Current time ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} is outside working hours ${startTime}-${endTime}`);
    }

    return isWithinHours;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async pollEmails() {
    this.logger.log('🔍 Checking for new emails...');

    try {
      // Get all users with Gmail connected, excluding those with too many failures
      const users = await this.prisma.user.findMany({
        where: {
          gmailConnected: true,
          gmailAccessToken: { not: null },
          gmailConsecutiveFailures: { lt: 5 }, // Skip users with 5+ failures
        },
      });

      this.logger.log(`Found ${users.length} users with Gmail connected`);

      for (const user of users) {
        try {
          await this.processUserEmails(user.id, user.clerkId);
        } catch (error) {
          this.logger.error(
            `Error processing emails for user ${user.id}:`,
            error.stack || error,
          );
          // Continue to next user even if this one fails
        }
      }
    } catch (error) {
      this.logger.error('Error in email polling:', error.stack || error);
      // Cron will continue and retry next minute
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkFollowUps() {
    this.logger.log('🔄 Checking for leads needing follow-up...');

    try {
      // Get all users with Gmail connected
      const users = await this.prisma.user.findMany({
        where: {
          gmailConnected: true,
          gmailAccessToken: { not: null },
        },
      });

      this.logger.log(`Found ${users.length} users to check for follow-ups`);

      for (const user of users) {
        try {
          await this.processFollowUps(user.id, user.clerkId);
        } catch (error) {
          this.logger.error(
            `Error processing follow-ups for user ${user.id}:`,
            error.stack || error,
          );
          // Continue to next user even if this one fails
        }
      }
    } catch (error) {
      this.logger.error('Error in follow-up check:', error.stack || error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendBookingReminders() {
    this.logger.log('⏰ Checking for appointments needing reminders...');

    try {
      // Get all users with booking reminders enabled
      const users = await this.prisma.user.findMany({
        where: {
          gmailConnected: true,
          gmailAccessToken: { not: null },
        },
      });

      for (const user of users) {
        try {
          // Load automation settings
          let automationSettings: any = {};
          try {
            automationSettings = (user as any).automationSettings 
              ? JSON.parse((user as any).automationSettings as string) 
              : {};
          } catch (error) {
            this.logger.error('Failed to parse automation settings:', error);
            continue;
          }

          const sendBookingReminders = automationSettings.sendBookingReminders !== false;
          const reminderHoursBefore = automationSettings.reminderHoursBefore || 24;

          if (!sendBookingReminders) {
            continue;
          }

          // Calculate the reminder window
          const reminderWindowStart = new Date();
          reminderWindowStart.setHours(reminderWindowStart.getHours() + reminderHoursBefore - 1);
          const reminderWindowEnd = new Date();
          reminderWindowEnd.setHours(reminderWindowEnd.getHours() + reminderHoursBefore + 1);

          // Find leads with appointments in the reminder window that haven't been reminded
          const leadsNeedingReminder = await this.prisma.lead.findMany({
            where: {
              userId: user.id,
              appointmentDate: {
                gte: reminderWindowStart,
                lte: reminderWindowEnd,
              },
              stage: 'scheduled',
              // Only send if we haven't sent a reminder recently
              updatedAt: {
                lt: new Date(Date.now() - 60 * 60 * 1000), // At least 1 hour since last update
              },
            },
          });

          this.logger.log(`Found ${leadsNeedingReminder.length} appointments needing reminders for user ${user.email}`);

          for (const lead of leadsNeedingReminder) {
            try {
              await this.sendReminderEmail(user, lead, reminderHoursBefore);
            } catch (error) {
              this.logger.error(`Failed to send reminder for lead ${lead.id}:`, error);
            }
          }
        } catch (error) {
          this.logger.error(`Error processing reminders for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error in booking reminder check:', error);
    }
  }

  private async sendReminderEmail(user: any, lead: any, hoursBefore: number) {
    const appointmentDate = new Date(lead.appointmentDate);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const subject = `Reminder: Appointment Tomorrow at ${formattedTime}`;
    const body = `Hi ${lead.name},

This is a friendly reminder about your upcoming appointment:

📅 Date: ${formattedDate}
⏰ Time: ${formattedTime}
📍 Location: ${lead.address || 'To be confirmed'}
${lead.serviceType ? `🔧 Service: ${lead.serviceType}` : ''}

${lead.appointmentNotes ? `Notes: ${lead.appointmentNotes}` : ''}

If you need to reschedule or have any questions, please let us know!

Best regards,
${user.businessName || 'Your Team'}`;

    try {
      // Send via Gmail
      await this.gmailService.sendMessage(
        user.id,
        lead.email,
        subject,
        body,
      );

      this.logger.log(`✅ Sent booking reminder to ${lead.email} for appointment on ${formattedDate}`);

      // Update lead to mark reminder sent
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { updatedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Failed to send reminder email to ${lead.email}:`, error);
      throw error;
    }
  }

  private async processFollowUps(userId: string, clerkId: string) {
    // Load user automation settings
    const userFull: any = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userFull) {
      return;
    }

    const automationSettings = userFull.automationSettings 
      ? JSON.parse(userFull.automationSettings) 
      : {};

    // Check if auto-follow-up is enabled
    const autoFollowUp = automationSettings.autoFollowUp === true;
    const autoScheduleFollowUp = automationSettings.autoScheduleFollowUp === true;
    
    if (!autoFollowUp && !autoScheduleFollowUp) {
      this.logger.debug(`Follow-up disabled for user ${userId}`);
      return;
    }

    const followUpDelayDays = automationSettings.followUpDelayDays || 3;
    const followUpDelayMs = followUpDelayDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - followUpDelayMs);

    this.logger.log(`📅 Looking for leads with no response since ${cutoffDate.toISOString()}`);

    // Find leads that need follow-up:
    // 1. Last message was inbound (from customer)
    // 2. No outbound response sent after it
    // 3. Created/last message is older than followUpDelayDays
    // 4. Lead is not in 'won', 'lost', or 'completed' stage
    const leads = await this.prisma.lead.findMany({
      where: {
        userId: userId,
        stage: {
          notIn: ['won', 'lost', 'completed'],
        },
        updatedAt: {
          lte: cutoffDate,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    this.logger.log(`Found ${leads.length} potential leads for follow-up`);

    for (const lead of leads) {
      try {
        // Skip if no messages
        if (lead.messages.length === 0) {
          continue;
        }

        // Get the most recent message
        const lastMessage = lead.messages[0];

        // Skip if last message was outbound (we already responded)
        if (lastMessage.direction === 'outbound') {
          continue;
        }

        // Skip if last message was too recent
        const timeSinceLastMessage = Date.now() - new Date(lastMessage.createdAt).getTime();
        if (timeSinceLastMessage < followUpDelayMs) {
          continue;
        }

        // Check if we already sent a follow-up for this message
        const followUpExists = await this.prisma.message.findFirst({
          where: {
            leadId: lead.id,
            inReplyToId: lastMessage.id,
            isAiGenerated: true,
            createdAt: {
              gte: new Date(lastMessage.createdAt),
            },
          },
        });

        if (followUpExists) {
          this.logger.debug(`Follow-up already sent for lead ${lead.name}`);
          continue;
        }

        this.logger.log(`📬 Generating follow-up for lead: ${lead.name} (${lead.email})`);
        await this.generateFollowUp(lead, lastMessage, userId, clerkId, automationSettings);

      } catch (error) {
        this.logger.error(`Failed to process follow-up for lead ${lead.id}:`, error);
      }
    }
  }

  private async generateFollowUp(lead: any, lastMessage: any, userId: string, clerkId: string, automationSettings: any) {
    try {
      // Get conversation history
      const conversationHistory = lead.messages
        .slice(0, 10)
        .reverse()
        .map(msg => ({
          role: msg.direction === 'inbound' ? 'user' : 'assistant',
          content: msg.content,
        }));

      // Generate follow-up message
      const followUpReply = await this.aiService.generateFollowUpMessage({
        leadInfo: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          serviceType: lead.serviceType,
          stage: lead.stage,
          priority: lead.priority,
        },
        lastMessage: lastMessage.content,
        lastMessageDate: lastMessage.createdAt,
        conversationHistory,
        businessContext: {
          name: automationSettings.businessName || 'AutoStaff AI',
          type: automationSettings.businessType || 'Service Business',
        },
        userId: clerkId,
      });

      // Check working hours
      const isWithinWorkingHours = this.isWithinWorkingHours(automationSettings);

      // Check if we should auto-send (requires both auto-approve AND within working hours)
      const shouldAutoSend = automationSettings.aiAutoApprove === true && isWithinWorkingHours;

      // Create the follow-up message
      const followUpMessage = await this.prisma.message.create({
        data: {
          leadId: lead.id,
          direction: 'outbound',
          channel: 'email',
          subject: followUpReply.subject,
          content: followUpReply.body,
          fromEmail: lastMessage.toEmail, // Business email
          toEmail: lead.email,
          isAiGenerated: true,
          aiApprovalNeeded: !shouldAutoSend,
          aiConfidence: followUpReply.confidence,
          inReplyToId: lastMessage.id,
          sentAt: shouldAutoSend ? new Date() : null,
        },
      });

      if (shouldAutoSend) {
        // Auto-send the follow-up
        try {
          await this.gmailService.sendMessage(
            clerkId,
            lead.email,
            followUpReply.subject,
            followUpReply.body,
          );
          this.logger.log(`📤 Auto-sent follow-up to ${lead.name} (ID: ${followUpMessage.id})`);
        } catch (error) {
          this.logger.error(`❌ Failed to auto-send follow-up:`, error);
        }
      } else if (!isWithinWorkingHours) {
        this.logger.log(`⏰ Follow-up delayed - outside working hours for ${lead.name} (ID: ${followUpMessage.id})`);
      } else {
        this.logger.log(`✋ Follow-up needs approval for ${lead.name} (ID: ${followUpMessage.id})`);
      }

    } catch (error) {
      this.logger.error(`Failed to generate follow-up for lead ${lead.id}:`, error);
    }
  }

  private async processUserEmails(userId: string, clerkId: string) {
    try {
      // Get Gmail client for this user
      const gmail = await this.gmailService.getGmailClient(clerkId);

      // List unread messages
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread', // Only unread emails
        maxResults: 10,
      });

      const messages = response.data.messages || [];
      this.logger.log(
        `User ${userId}: Found ${messages.length} unread emails`,
      );

      // Reset failure count on successful connection
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          gmailConsecutiveFailures: 0,
          gmailLastFailureAt: null,
        },
      });

      if (messages.length === 0) return;

      for (const message of messages) {
        try {
          await this.processMessage(userId, clerkId, message.id);
        } catch (error) {
          this.logger.error(
            `Error processing message ${message.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error getting emails for user ${userId}:`, error);
      
      // Check if it's an invalid_grant error (expired/revoked token)
      if (error.message?.includes('invalid_grant') || error.toString().includes('invalid_grant')) {
        this.logger.warn(`🔐 Invalid grant detected for user ${userId}`);
        
        // Increment failure count
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { gmailConsecutiveFailures: true },
        });
        
        const failureCount = (user?.gmailConsecutiveFailures || 0) + 1;
        
        if (failureCount >= 5) {
          // Disconnect Gmail after 5 consecutive failures
          this.logger.error(`❌ Disconnecting Gmail for user ${userId} after ${failureCount} failures`);
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              gmailConnected: false,
              gmailConsecutiveFailures: failureCount,
              gmailLastFailureAt: new Date(),
            },
          });
          // TODO: Send notification email to user about disconnection
        } else {
          this.logger.warn(`⚠️ Gmail failure ${failureCount}/5 for user ${userId}`);
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              gmailConsecutiveFailures: failureCount,
              gmailLastFailureAt: new Date(),
            },
          });
        }
      }
    }
  }

  private async processMessage(
    userId: string,
    clerkId: string,
    messageId: string,
  ) {
    // Check if we've already processed this specific Gmail message
    const existing = await this.prisma.message.findFirst({
      where: {
        gmailMessageId: messageId,
      },
    });

    if (existing) {
      this.logger.debug(`Message ${messageId} already processed, skipping`);
      return;
    }

    // Get full message details
    const gmail = await this.gmailService.getGmailClient(clerkId);
    const messageData = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    // Extract email details
    const headers = messageData.data.payload?.headers || [];
    const fromHeader = headers.find((h) => h.name === 'From');
    const subjectHeader = headers.find((h) => h.name === 'Subject');
    const toHeader = headers.find((h) => h.name === 'To');
    const messageIdHeader = headers.find((h) => h.name === 'Message-ID');
    const referencesHeader = headers.find((h) => h.name === 'References');

    const from = fromHeader?.value || '';
    const subject = subjectHeader?.value || '';
    const to = toHeader?.value || '';
    const threadId = messageData.data.threadId || '';
    const incomingMessageId = messageIdHeader?.value || '';
    const references = referencesHeader?.value || '';

    // Extract email body
    let body = '';
    if (messageData.data.payload?.parts) {
      const textPart = messageData.data.payload.parts.find(
        (part) => part.mimeType === 'text/plain',
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    } else if (messageData.data.payload?.body?.data) {
      body = Buffer.from(
        messageData.data.payload.body.data,
        'base64',
      ).toString('utf-8');
    }

    this.logger.log(`📧 New email from: ${from}`);
    this.logger.log(`📋 Subject: ${subject}`);

    // Load user automation settings early
    const userSettingsData: any = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    const userAutomationSettings = userSettingsData?.automationSettings 
      ? JSON.parse(userSettingsData.automationSettings) 
      : {};

    // Apply email filters
    const spamFilter = userAutomationSettings.spamFilter !== false; // Default true
    const autoArchiveMarketing = userAutomationSettings.autoArchiveMarketing === true; // Default false
    const requireApprovalForNew = userAutomationSettings.requireApprovalForNew === true; // Default false

    // *** CHECK FOR AUTOMATIC REPLIES TO PREVENT INFINITE LOOPS ***
    
    // 1. Check for auto-reply/out-of-office headers
    const autoSubmittedHeader = headers.find((h) => h.name?.toLowerCase() === 'auto-submitted');
    const autoReplyHeader = headers.find((h) => h.name?.toLowerCase() === 'x-autoreply');
    const precedenceHeader = headers.find((h) => h.name?.toLowerCase() === 'precedence');
    
    if (autoSubmittedHeader?.value && autoSubmittedHeader.value !== 'no') {
      this.logger.log(`🚫 Detected auto-submitted header: ${autoSubmittedHeader.value} - skipping automatic reply`);
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
      return;
    }
    
    if (autoReplyHeader?.value) {
      this.logger.log(`🚫 Detected X-AutoReply header - skipping automatic reply`);
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
      return;
    }
    
    if (precedenceHeader?.value && ['auto_reply', 'auto-reply', 'bulk'].includes(precedenceHeader.value.toLowerCase())) {
      this.logger.log(`🚫 Detected precedence header: ${precedenceHeader.value} - skipping automatic reply`);
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
      return;
    }
    
    // 2. Check for repeated "Automatic reply:" or "Re:" patterns in subject (indicating a loop)
    const subjectLower = subject.toLowerCase();
    const automaticReplyCount = (subject.match(/automatic reply:/gi) || []).length;
    const reCount = (subject.match(/re:/gi) || []).length;
    
    if (automaticReplyCount >= 2) {
      this.logger.log(`🚫 Detected reply loop - subject contains ${automaticReplyCount} "Automatic reply:" patterns - STOPPING`);
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
      return;
    }
    
    if (reCount >= 5) {
      this.logger.log(`🚫 Detected potential reply loop - subject contains ${reCount} "Re:" patterns - STOPPING`);
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
      return;
    }
    
    // 3. Check for phrases indicating the email cannot receive replies
    const noReplyPhrases = [
      'cannot receive replies',
      'do not reply',
      'no-reply',
      'noreply',
      'automatically generated',
      'automatic reply',
      'auto-reply',
      'out of office',
      'out of the office',
      'away from my desk',
    ];
    
    const bodyLower = body.toLowerCase();
    const hasNoReplyPhrase = noReplyPhrases.some(phrase => bodyLower.includes(phrase));
    
    if (hasNoReplyPhrase || subjectLower.includes('automatic reply') || subjectLower.includes('auto-reply') || subjectLower.includes('out of office')) {
      this.logger.log(`🚫 Detected automatic reply or no-reply email - skipping response to prevent loop`);
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
      return;
    }
    
    // 4. Check from address for no-reply patterns
    const fromLower = from.toLowerCase();
    if (fromLower.includes('noreply@') || fromLower.includes('no-reply@') || fromLower.includes('donotreply@')) {
      this.logger.log(`🚫 Detected no-reply sender address: ${from} - skipping response`);
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
      return;
    }

    // Check spam filter
    if (spamFilter && this.isSpamEmail(from, subject, body)) {
      this.logger.log(`🚫 Spam detected - skipping email from ${from}`);
      // Mark as read and skip processing
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
          addLabelIds: ['SPAM'],
        },
      });
      return;
    }

    // Check marketing filter
    if (autoArchiveMarketing && this.isMarketingEmail(from, subject, body, headers)) {
      this.logger.log(`📮 Marketing email detected - archiving from ${from}`);
      // Archive and mark as read
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD', 'INBOX'],
        },
      });
      return;
    }

    // Extract sender email
    const senderEmail = from.match(/<(.+)>/)?.[1] || from;

    // Check if this is a new contact (requireApprovalForNew)
    let existingLead = await this.prisma.lead.findFirst({
      where: {
        userId,
        email: senderEmail,
      },
    });

    const isNewContact = !existingLead;

    // Extract lead info and classify message with AI
    this.logger.log(`🔍 Extracting lead information from email...`);
    const leadInfo = await this.aiService.extractLeadInfo(body);
    this.logger.log(`📊 Extracted info: ${JSON.stringify(leadInfo)}`);
    
    // Only classify with AI if auto-categorize is enabled
    let classification = { category: 'inquiry', intent: 'general' };
    const autoCategorizeleads = userAutomationSettings.autoCategorizeleads !== false; // Default true
    
    if (autoCategorizeleads) {
      this.logger.log(`🤖 Auto-categorize enabled - classifying message with AI`);
      classification = await this.aiService.classifyMessage(body);
      this.logger.log(`🏷️ Classification: ${JSON.stringify(classification)}`);
    } else {
      this.logger.log(`⚠️ Auto-categorize disabled - using default classification`);
    }

    // Parse email address and sender name
    const senderName = from.replace(/<.*?>/, '').trim() || senderEmail;

    // Find or create lead
    let lead = await this.prisma.lead.findFirst({
      where: {
        userId: userId,
        email: senderEmail,
      },
    });

    // Determine priority based on AI analysis if auto-assign is enabled
    const autoAssignPriority = userAutomationSettings.autoAssignPriority !== false; // Default true
    let determinedPriority = 'medium';
    
    if (autoAssignPriority) {
      // Analyze urgency keywords and classification
      const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediately', 'critical', 'broken', 'leaking', 'flooding'];
      const isUrgent = urgentKeywords.some(keyword => body.toLowerCase().includes(keyword));
      
      const highValueKeywords = ['commercial', 'business', 'multiple', 'large project', 'building'];
      const isHighValue = highValueKeywords.some(keyword => body.toLowerCase().includes(keyword));
      
      if (isUrgent) {
        determinedPriority = 'high';
        this.logger.log(`🚨 High priority detected: urgent keywords found`);
      } else if (isHighValue || classification.category === 'quote') {
        determinedPriority = 'high';
        this.logger.log(`💰 High priority detected: high-value or quote request`);
      } else if (classification.category === 'general' || classification.category === 'spam') {
        determinedPriority = 'low';
        this.logger.log(`📝 Low priority detected: general inquiry`);
      } else {
        determinedPriority = 'medium';
      }
    } else {
      this.logger.log(`⚠️ Auto-assign priority disabled - using default 'medium'`);
    }

    if (!lead) {
      this.logger.log(`👤 Creating new lead: ${senderName}`);
      lead = await this.prisma.lead.create({
        data: {
          userId: userId,
          name: leadInfo.name || senderName,
          email: senderEmail,
          phone: leadInfo.phone,
          address: leadInfo.address,
          source: 'email',
          serviceType: leadInfo.serviceType,
          description: body.substring(0, 500),
          priority: determinedPriority,
          stage: 'new',
          aiClassification: classification.category,
          aiIntent: classification.intent,
          sentiment: null,
        },
      });
    } else {
      this.logger.log(`📌 Existing lead: ${lead.name}`);
      // Update lead with new info if available
      const updateData: any = {
        phone: leadInfo.phone || lead.phone,
        address: leadInfo.address || lead.address,
        serviceType: leadInfo.serviceType || lead.serviceType,
        aiClassification: classification.category,
      };
      
      // Update priority if auto-assign is enabled and it's higher priority
      if (autoAssignPriority) {
        const priorityLevels = { low: 1, medium: 2, high: 3 };
        if (priorityLevels[determinedPriority] > priorityLevels[lead.priority]) {
          updateData.priority = determinedPriority;
          this.logger.log(`📊 Updating lead priority from ${lead.priority} to ${determinedPriority}`);
        }
      }
      
      // Add aiIntent to update data
      updateData.aiIntent = classification.intent;
      
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: updateData,
      });
    }

    // Store the incoming message
    const inboundMessage = await this.prisma.message.create({
      data: {
        leadId: lead.id,
        direction: 'inbound',
        channel: 'email',
        subject,
        content: body,
        fromEmail: senderEmail,
        toEmail: to,
        gmailMessageId: messageId,
        isAiGenerated: false,
        aiClassification: classification.category,
        aiSentiment: null,
        sentAt: new Date(),
      },
    });

    this.logger.log(`💾 Stored inbound message ${inboundMessage.id}`);

    // Check if auto-respond is enabled (we already loaded settings earlier)
    const autoRespondEnabled = userAutomationSettings.autoRespondEmails !== false; // Default true
    
    if (!autoRespondEnabled) {
      this.logger.log(`🚫 Auto-respond disabled for user - skipping AI response generation`);
      return;
    }

    // *** CIRCUIT BREAKER: Check for rapid back-and-forth to prevent loops ***
    const recentMessages = await this.prisma.message.findMany({
      where: {
        leadId: lead.id,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Count consecutive outbound messages in recent history
    const recentOutboundCount = recentMessages.filter(m => m.direction === 'outbound').length;
    
    if (recentOutboundCount >= 3) {
      this.logger.warn(`🛑 CIRCUIT BREAKER TRIGGERED: ${recentOutboundCount} outbound messages sent to ${senderEmail} in the last hour. Stopping to prevent loop.`);
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
      return;
    }
    
    // Check if the last 4 messages alternate between inbound/outbound (possible loop)
    if (recentMessages.length >= 4) {
      const last4 = recentMessages.slice(0, 4);
      const isAlternating = last4.every((msg, idx) => {
        if (idx === 0) return true;
        return msg.direction !== last4[idx - 1].direction;
      });
      
      if (isAlternating) {
        this.logger.warn(`🛑 CIRCUIT BREAKER TRIGGERED: Detected alternating message pattern (possible auto-reply loop). Stopping.`);
        await gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: { removeLabelIds: ['UNREAD'] },
        });
        return;
      }
    }

    // Generate AI response
    try {
      this.logger.log(`🤖 Generating AI response...`);
      
      // Check AI conversation limit before generating response
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { 
          aiConversationsUsed: true,
          aiConversationsLimit: true,
          lastResetAt: true,
          subscriptionPlan: true,
          businessName: true,
          businessType: true,
        },
      });

      // Check if monthly reset is needed (reset on the 1st of each month)
      const now = new Date();
      const lastReset = new Date(user.lastResetAt);
      const shouldReset = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();

      if (shouldReset) {
        this.logger.log(`📅 Monthly reset: Resetting AI conversation counter`);
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            aiConversationsUsed: 0,
            lastResetAt: now,
          },
        });
        user.aiConversationsUsed = 0;
      }

      // Check if user has hit their AI conversation limit
      if (user.aiConversationsLimit !== null && user.aiConversationsUsed >= user.aiConversationsLimit) {
        this.logger.warn(`🚫 AI conversation limit reached for user ${userId} (${user.aiConversationsUsed}/${user.aiConversationsLimit})`);
        
        // Store a system message instead of AI response
        await this.prisma.message.create({
          data: {
            leadId: lead.id,
            direction: 'outbound',
            channel: 'email',
            subject: `Re: ${subject}`,
            content: `[SYSTEM] AI conversation limit reached (${user.aiConversationsUsed}/${user.aiConversationsLimit}). Please upgrade your plan to continue using AI responses.`,
            fromEmail: to,
            toEmail: senderEmail,
            isAiGenerated: false,
            aiApprovalNeeded: true,
            aiClassification: 'limit_reached',
            sentAt: null,
          },
        });

        this.logger.log(`⚠️ User needs to upgrade from ${user.subscriptionPlan} plan to continue`);
        return; // Don't generate AI response
      }

      // Get conversation history for context (increased to 20 messages)
      const previousMessages = await this.prisma.message.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'asc' },
        take: 20, // Last 20 messages for better context retention
      });

      const conversationHistory = previousMessages.map(msg => ({
        role: msg.direction === 'inbound' ? 'user' : 'assistant',
        content: msg.content,
      }));

      // User info already fetched above
      const userInfo = { 
        businessName: user.businessName, 
        businessType: user.businessType 
      };

      // Check calendar connection status
      const calendarUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { calendarConnected: true, email: true },
      });
      this.logger.log(`🗓️ User ${calendarUser.email} - Calendar connected: ${calendarUser.calendarConnected}`);

      // Check if this is a booking request and get calendar slots
      const bookingKeywords = ['schedule', 'book', 'appointment', 'visit', 'meeting', 'consultation', 'come out', 'stop by', 'when are you available'];
      const isBookingRequest = bookingKeywords.some(keyword => 
        body.toLowerCase().includes(keyword)
      );

      this.logger.log(`🔍 Booking request detected: ${isBookingRequest} (message contains: "${body.substring(0, 50)}...")`);

      let availableSlots = [];
      if (isBookingRequest && calendarUser.calendarConnected) {
        try {
          this.logger.log(`📅 Fetching calendar slots for clerkId: ${clerkId}`);
          availableSlots = await this.calendarService.getAvailableSlots(clerkId, 60, 14);
          this.logger.log(`✅ Found ${availableSlots.length} available time slots`);
          if (availableSlots.length > 0) {
            this.logger.log(`First slot: ${availableSlots[0].formatted}`);
          }
        } catch (error) {
          this.logger.error(`❌ Failed to fetch calendar slots: ${error.message}`);
          this.logger.error(error.stack);
        }
      } else if (isBookingRequest && !calendarUser.calendarConnected) {
        this.logger.warn(`⚠️ Booking request detected but calendar not connected for user ${calendarUser.email}`);
      }

      const aiReply = await this.aiService.generateEmailReply({
        inboundMessage: body,
        subject,
        leadInfo: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          serviceType: lead.serviceType,
          stage: lead.stage,
          priority: lead.priority,
        },
        businessContext: {
          name: userInfo?.businessName || 'AutoStaff AI',
          type: userInfo?.businessType || 'Service Business',
        },
        conversationHistory,
        userId: clerkId,
        availableSlots: availableSlots.slice(0, 5), // Only pass first 5 slots to AI
      });

      // If customer confirmed a time slot, create calendar event
      if (aiReply.confirmedSlot) {
        this.logger.log(`🎯 Customer confirmed slot: ${JSON.stringify(aiReply.confirmedSlot)}`);
        
        try {
          // Fetch latest lead data with all fields
          const latestLead = await this.prisma.lead.findUnique({
            where: { id: lead.id },
          });

          this.logger.log(`📋 Lead details - Phone: ${latestLead.phone}, Address: ${latestLead.address}`);

          const eventSummary = `Site Visit - ${latestLead.name}`;
          const eventDescription = `Site visit for ${latestLead.serviceType || 'service'}\n\nCustomer: ${latestLead.name}\nEmail: ${latestLead.email}\nPhone: ${latestLead.phone || 'N/A'}\nAddress: ${latestLead.address || 'N/A'}`;
          
          this.logger.log(`📅 Creating calendar event: ${eventSummary} from ${aiReply.confirmedSlot.start} to ${aiReply.confirmedSlot.end}`);
          
          await this.calendarService.createEvent(
            clerkId,
            eventSummary,
            eventDescription,
            aiReply.confirmedSlot.start,
            aiReply.confirmedSlot.end,
            latestLead.email,
          );
          
          this.logger.log(`✅ Created calendar event for ${lead.name} at ${aiReply.confirmedSlot.formatted}`);
          
          // Update lead with appointment info
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
              appointmentDate: new Date(aiReply.confirmedSlot.start),
              appointmentNotes: `Site visit scheduled via AI`,
              stage: 'scheduled',
            },
          });
        } catch (error) {
          this.logger.error(`❌ Failed to create calendar event:`, error.message);
          this.logger.error(`Error details:`, error);
        }
      } else {
        this.logger.debug('No confirmed slot in AI reply');
      }

      // If customer requested a quote, check automation settings
      if (aiReply.quoteRequested) {
        this.logger.log('💰 Quote request detected - checking automation settings');
        
        const autoGenerateQuotes = userAutomationSettings.autoGenerateQuotes === true;
        const requireQuoteApproval = userAutomationSettings.requireQuoteApproval !== false; // Default true
        const minQuoteAmount = userAutomationSettings.minQuoteAmount || 100;
        const maxQuoteAmount = userAutomationSettings.maxQuoteAmount || 10000;
        
        // Check if we have enough information to generate a meaningful quote
        const hasProjectDetails = body.length > 50; // At least some description
        const hasSufficientInfo = leadInfo.serviceType || leadInfo.address || 
                                  body.toLowerCase().includes('sq ft') || 
                                  body.toLowerCase().includes('square') ||
                                  /\d+\s*(ft|feet|yard|meter)/i.test(body);
        
        if (!hasSufficientInfo) {
          this.logger.log('⚠️ Insufficient information for quote - AI should ask for more details first');
        }
        
        if (autoGenerateQuotes && hasSufficientInfo) {
          this.logger.log(`🤖 Auto-generate quotes enabled - generating AI quote`);
          
          try {
            // Generate quote using AI
            const quoteResult = await this.aiService.generateQuote(
              body, // Customer's request
              userInfo.businessType,
              conversationHistory,
              clerkId,
            );

            // Calculate if quote is within auto-approve limits
            const quoteTotal = quoteResult.items.reduce((sum: number, item: any) => 
              sum + (item.quantity * item.unitPrice), 0
            );
            const withTax = quoteTotal * (1 + (quoteResult.taxRate || 0) / 100);

            const isWithinLimits = withTax >= minQuoteAmount && withTax <= maxQuoteAmount;
            const needsApproval = requireQuoteApproval || !isWithinLimits;

            this.logger.log(`📊 Quote total: $${withTax.toFixed(2)} (limits: $${minQuoteAmount}-$${maxQuoteAmount})`);

            // Create the quote in database
            const quoteData = await this.quotesService.create({
              leadId: lead.id,
              title: quoteResult.title || `Quote for ${lead.name}`,
              description: quoteResult.description || '',
              notes: quoteResult.notes || '',
              items: quoteResult.items,
              taxRate: quoteResult.taxRate || 13,
              discount: 0,
              expiresAt: userAutomationSettings.quoteValidityDays 
                ? new Date(Date.now() + userAutomationSettings.quoteValidityDays * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
            });

            this.logger.log(`✅ Created AI-generated quote #${quoteData.quoteNumber} for ${lead.name}`);

            // Update lead stage
            await this.prisma.lead.update({
              where: { id: lead.id },
              data: { 
                stage: 'quoted',
                priority: 'high',
              },
            });

            // If doesn't need approval and within working hours, could auto-send
            // For now, quotes always need review before sending to customer
            if (needsApproval) {
              this.logger.log(`✋ Quote needs approval (approval required: ${requireQuoteApproval}, within limits: ${isWithinLimits})`);
            } else {
              this.logger.log(`✅ Quote approved - within limits and approval not required`);
            }

          } catch (error) {
            this.logger.error(`❌ Failed to auto-generate quote:`, error.message);
            // Fall back to manual quote creation
            await this.prisma.lead.update({
              where: { id: lead.id },
              data: { 
                stage: 'contacted',
                priority: 'high',
              },
            });
            this.logger.log(`⚠️ Marked lead for manual quote creation`);
          }
        } else {
          this.logger.log('📝 Auto-generate quotes disabled - marking for manual review');
          
          // Mark lead for manual quoting
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { 
              stage: 'contacted',
              priority: 'high',
            },
          });

          this.logger.log(`✅ Lead ${lead.name} marked as high priority - needs manual quote`);
        }
      }

      // Get user settings to check auto-approve (we already have automation settings)
      const userSettings = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { 
          aiAutoApprove: true,
        },
      });

      // Check if we're within working hours (using already-loaded settings)
      const isWithinWorkingHours = this.isWithinWorkingHours(userAutomationSettings);

      // Check if approval needed due to new contact filter
      const needsApprovalDueToNewContact = requireApprovalForNew && isNewContact;
      
      if (needsApprovalDueToNewContact) {
        this.logger.log(`👤 New contact detected - requiring approval before responding`);
      }

      // If user has auto-approve ON AND we're within working hours AND not a new contact (or filter disabled), send automatically
      const shouldAutoSend = userSettings?.aiAutoApprove === true && isWithinWorkingHours && !needsApprovalDueToNewContact;

      // Store AI-generated draft response
      const draftMessage = await this.prisma.message.create({
        data: {
          leadId: lead.id,
          direction: 'outbound',
          channel: 'email',
          subject: aiReply.subject,
          content: aiReply.body,
          fromEmail: to, // Business email
          toEmail: senderEmail,
          isAiGenerated: true,
          aiApprovalNeeded: !shouldAutoSend,
          aiConfidence: aiReply.confidence,
          inReplyToId: inboundMessage.id,
          sentAt: shouldAutoSend ? new Date() : null,
        },
      });

      if (shouldAutoSend) {
        // Auto-send the email
        try {
          await this.gmailService.sendMessage(
            clerkId,
            senderEmail,
            aiReply.subject,
            aiReply.body,
            threadId,
            incomingMessageId,
            references ? `${references} ${incomingMessageId}` : incomingMessageId,
          );
          this.logger.log(`📤 Auto-sent AI response (ID: ${draftMessage.id})`);
        } catch (error) {
          this.logger.error(`❌ Failed to auto-send:`, error);
        }
      } else if (!isWithinWorkingHours) {
        this.logger.log(`⏰ AI response delayed - outside working hours (ID: ${draftMessage.id})`);
      } else if (aiReply.needsApproval) {
        this.logger.log(`✋ AI response needs approval (ID: ${draftMessage.id})`);
      } else {
        this.logger.log(`✅ AI response ready to send (ID: ${draftMessage.id})`);
      }

      // Increment AI conversation counter after successful generation
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          aiConversationsUsed: { increment: 1 },
        },
      });
      this.logger.log(`📊 AI conversations used: ${user.aiConversationsUsed + 1}/${user.aiConversationsLimit || '∞'}`);

    } catch (error) {
      this.logger.error(`❌ Failed to generate AI response:`, error);
    }

    // Update lead stage
    if (lead.stage === 'new') {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { stage: 'contacted' },
      });
    }

    // Mark email as read in Gmail
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });

    this.logger.log(`📬 Marked email as read in Gmail`);
  }
}
