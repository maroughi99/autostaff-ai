import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GmailService {
  private oauth2Client;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GMAIL_CLIENT_ID'),
      this.configService.get('GMAIL_CLIENT_SECRET'),
      this.configService.get('GMAIL_REDIRECT_URI'),
    );
  }

  getAuthUrl(userId: string, includeCalendar: boolean = false) {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ];

    if (includeCalendar) {
      scopes.push(
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
      );
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass user ID to retrieve after callback
      prompt: 'consent', // Force consent screen to get refresh token
    });
  }

  async handleCallback(code: string, userId: string) {
    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      
      this.oauth2Client.setCredentials(tokens);

      // Get user's email address
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      // Create or update user with tokens
      await this.prisma.user.upsert({
        where: { clerkId: userId },
        update: {
          gmailAccessToken: tokens.access_token,
          gmailRefreshToken: tokens.refresh_token,
          gmailConnected: true,
          gmailEmail: profile.data.emailAddress,
        },
        create: {
          clerkId: userId,
          email: profile.data.emailAddress || '',
          gmailAccessToken: tokens.access_token,
          gmailRefreshToken: tokens.refresh_token,
          gmailConnected: true,
          gmailEmail: profile.data.emailAddress,
        },
      });

      return {
        success: true,
        email: profile.data.emailAddress,
      };
    } catch (error) {
      console.error('Gmail OAuth error:', error);
      throw error;
    }
  }

  async refreshAccessToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user?.gmailRefreshToken) {
      throw new Error('No refresh token found');
    }

    this.oauth2Client.setCredentials({
      refresh_token: user.gmailRefreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    // Update access token in database
    await this.prisma.user.update({
      where: { clerkId: userId },
      data: {
        gmailAccessToken: credentials.access_token,
      },
    });

    return credentials.access_token;
  }

  async getGmailClient(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user?.gmailAccessToken) {
      throw new Error('Gmail not connected');
    }

    this.oauth2Client.setCredentials({
      access_token: user.gmailAccessToken,
      refresh_token: user.gmailRefreshToken,
    });

    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async listMessages(userId: string, maxResults = 10) {
    try {
      const gmail = await this.getGmailClient(userId);

      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: 'is:unread', // Only unread messages
      });

      return response.data.messages || [];
    } catch (error) {
      if (error.message?.includes('invalid_grant')) {
        // Token expired, try to refresh
        await this.refreshAccessToken(userId);
        return this.listMessages(userId, maxResults);
      }
      throw error;
    }
  }

  async getMessage(userId: string, messageId: string) {
    try {
      const gmail = await this.getGmailClient(userId);

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      return response.data;
    } catch (error) {
      if (error.message?.includes('invalid_grant')) {
        await this.refreshAccessToken(userId);
        return this.getMessage(userId, messageId);
      }
      throw error;
    }
  }

  async sendMessage(userId: string, to: string, subject: string, body: string, threadId?: string, inReplyTo?: string, references?: string) {
    console.log('[GMAIL SERVICE] Sending message:', { userId, to, subject: subject.substring(0, 50), hasThreadId: !!threadId });
    
    try {
      const gmail = await this.getGmailClient(userId);
      console.log('[GMAIL SERVICE] Gmail client obtained successfully');

      // Convert plain text line breaks to HTML
      const htmlBody = body
        .split('\n\n')
        .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('');

      const messageParts = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/html; charset=UTF-8`,
        `MIME-Version: 1.0`,
      ];

      // Add threading headers to keep conversation in same thread
      if (inReplyTo) {
        messageParts.push(`In-Reply-To: ${inReplyTo}`);
      }
      if (references) {
        messageParts.push(`References: ${references}`);
      }

      messageParts.push('', htmlBody);

      const message = messageParts.join('\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const requestBody: any = {
        raw: encodedMessage,
      };

      // If we have a threadId, include it to keep the conversation together
      if (threadId) {
        requestBody.threadId = threadId;
      }

      console.log('[GMAIL SERVICE] Calling Gmail API to send message...');
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody,
      });

      console.log('[GMAIL SERVICE] Message sent successfully! Gmail ID:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('[GMAIL SERVICE] Send failed:', error.message, error.response?.data);
      if (error.message?.includes('invalid_grant')) {
        console.log('[GMAIL SERVICE] Token expired, refreshing...');
        await this.refreshAccessToken(userId);
        return this.sendMessage(userId, to, subject, body);
      }
      throw error;
    }
  }

  async sendMessageWithAttachment(
    userId: string,
    to: string,
    subject: string,
    body: string,
    attachmentName: string,
    attachmentData: string, // base64 encoded
    mimeType: string = 'application/pdf'
  ) {
    try {
      const gmail = await this.getGmailClient(userId);

      const boundary = '----=_Part_' + Date.now();
      
      // Use body as-is if it contains HTML tags, otherwise convert plain text
      const htmlBody = body.includes('<html>') || body.includes('<div>') 
        ? body 
        : body.split('\n\n').map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`).join('');
      
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        `Content-Type: text/html; charset="UTF-8"`,
        '',
        htmlBody,
        '',
        `--${boundary}`,
        `Content-Type: ${mimeType}; name="${attachmentName}"`,
        `Content-Disposition: attachment; filename="${attachmentName}"`,
        `Content-Transfer-Encoding: base64`,
        '',
        attachmentData,
        '',
        `--${boundary}--`,
      ].join('\r\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      return response.data;
    } catch (error) {
      if (error.message?.includes('invalid_grant')) {
        await this.refreshAccessToken(userId);
        return this.sendMessageWithAttachment(userId, to, subject, body, attachmentName, attachmentData, mimeType);
      }
      throw error;
    }
  }
}
