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

  @Cron(CronExpression.EVERY_MINUTE)
  async pollEmails() {
    this.logger.log('🔍 Checking for new emails...');

    try {
      // Get all users with Gmail connected
      const users = await this.prisma.user.findMany({
        where: {
          gmailConnected: true,
          gmailAccessToken: { not: null },
        },
      });

      this.logger.log(`Found ${users.length} users with Gmail connected`);

      for (const user of users) {
        try {
          await this.processUserEmails(user.id, user.clerkId);
        } catch (error) {
          this.logger.error(
            `Error processing emails for user ${user.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error in email polling:', error);
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

    // Extract lead info and classify message with AI
    this.logger.log(`🔍 Extracting lead information from email...`);
    const leadInfo = await this.aiService.extractLeadInfo(body);
    this.logger.log(`📊 Extracted info: ${JSON.stringify(leadInfo)}`);
    
    const classification = await this.aiService.classifyMessage(body);
    this.logger.log(`🏷️ Classification: ${JSON.stringify(classification)}`);

    // Parse email address
    const emailMatch = from.match(/<(.+?)>/);
    const senderEmail = emailMatch ? emailMatch[1] : from;
    const senderName = from.replace(/<.*?>/, '').trim() || senderEmail;

    // Find or create lead
    let lead = await this.prisma.lead.findFirst({
      where: {
        userId: userId,
        email: senderEmail,
      },
    });

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
          priority: 'medium',
          stage: 'new',
          aiClassification: classification.category,
          aiIntent: classification.intent,
          sentiment: null,
        },
      });
    } else {
      this.logger.log(`📌 Existing lead: ${lead.name}`);
      // Update lead with new info if available
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          phone: leadInfo.phone || lead.phone,
          address: leadInfo.address || lead.address,
          serviceType: leadInfo.serviceType || lead.serviceType,
          aiClassification: classification.category,
          aiIntent: classification.intent,
        },
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

      // If customer requested a quote, mark lead for manual quoting
      // DO NOT auto-generate quotes - they need real measurements and assessment
      if (aiReply.quoteRequested) {
        this.logger.log('💰 Quote request detected - marking lead for manual review');
        
        try {
          // Update lead to "quoted" stage so it appears in dashboard for manual quote creation
          await this.prisma.lead.update({
            where: { id: lead.id },
            data: { 
              stage: 'contacted', // Keep in contacted stage until manual quote is created
              priority: 'high', // Bump priority since they want pricing
            },
          });

          this.logger.log(`✅ Lead ${lead.name} marked as high priority - needs manual quote`);
        } catch (error) {
          this.logger.error(`❌ Failed to update lead:`, error.message);
        }
      }

      // Get user settings to check auto-approve
      const userSettings = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { aiAutoApprove: true },
      });

      // If user has auto-approve ON, send automatically
      // (The AI service always sets needsApproval=true for safety, so we override it here)
      const shouldAutoSend = userSettings?.aiAutoApprove === true;

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
