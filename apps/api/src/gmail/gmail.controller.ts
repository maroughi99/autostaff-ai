import { Controller, Get, Query, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { GmailService } from './gmail.service';

@Controller('auth/gmail')
export class GmailController {
  constructor(private gmailService: GmailService) {}

  @Get()
  async connect(@Query('userId') userId: string, @Query('includeCalendar') includeCalendar: string, @Res() res: Response) {
    if (!userId) {
      return res.status(400).send('User ID is required');
    }

    const authUrl = this.gmailService.getAuthUrl(userId, includeCalendar === 'true');
    return res.redirect(authUrl);
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') userId: string, @Res() res: Response) {
    try {
      if (!code || !userId) {
        throw new Error('Missing code or user ID');
      }

      const result = await this.gmailService.handleCallback(code, userId);

      // Redirect back to settings page with success message
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/settings?gmail=success&email=${result.email}`,
      );
    } catch (error) {
      console.error('Gmail callback error:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/settings?gmail=error`,
      );
    }
  }

  @Get('disconnect')
  async disconnect(@Query('userId') userId: string) {
    // TODO: Implement disconnect logic
    // Remove tokens from database
    return { success: true };
  }
}
