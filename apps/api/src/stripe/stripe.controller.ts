import { Controller, Post, Headers, RawBodyRequest, Req, Logger, Body, Get, Param } from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(private readonly stripeService: StripeService) {}

  /**
   * Stripe webhook endpoint
   * IMPORTANT: This endpoint needs raw body parsing, not JSON
   */
  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      this.logger.error('Missing stripe-signature header');
      throw new Error('Missing stripe-signature header');
    }

    if (!request.rawBody) {
      this.logger.error('Missing raw body for webhook verification');
      throw new Error('Missing raw body');
    }

    try {
      const result = await this.stripeService.handleWebhook(
        request.rawBody,
        signature,
      );
      return result;
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Create Checkout Session for subscription
   */
  @Post('create-checkout-session')
  async createCheckoutSession(
    @Body() body: {
      userId: string;
      priceId: string;
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    const url = await this.stripeService.createCheckoutSession(
      body.userId,
      body.priceId,
      body.successUrl,
      body.cancelUrl,
    );
    return { url };
  }

  /**
   * Create Customer Portal session
   */
  @Post('create-portal-session')
  async createPortalSession(
    @Body() body: {
      userId: string;
      returnUrl: string;
    },
  ) {
    const url = await this.stripeService.createPortalSession(
      body.userId,
      body.returnUrl,
    );
    return { url };
  }

  /**
   * Cancel subscription
   */
  @Post('cancel-subscription/:userId')
  async cancelSubscription(@Param('userId') userId: string) {
    await this.stripeService.cancelSubscription(userId);
    return { success: true };
  }

  /**
   * Manually sync subscription from Stripe
   */
  @Post('sync-subscription/:userId')
  async syncSubscription(@Param('userId') userId: string) {
    const subscription = await this.stripeService.syncSubscriptionFromStripe(userId);
    return { success: true, subscription };
  }

  /**
   * Get billing history (invoices)
   */
  @Get('billing-history/:userId')
  async getBillingHistory(@Param('userId') userId: string) {
    const invoices = await this.stripeService.getBillingHistory(userId);
    return { invoices };
  }
}
