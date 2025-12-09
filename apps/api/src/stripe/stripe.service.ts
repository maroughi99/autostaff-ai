import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey || secretKey.includes('YOUR_STRIPE')) {
      this.logger.warn('⚠️  Stripe not configured - payment links will not work. Add STRIPE_SECRET_KEY to .env');
    }
    this.stripe = new Stripe(secretKey || 'sk_test_placeholder', {
      apiVersion: '2025-11-17.clover',
    });
  }

  /**
   * Create a Stripe Payment Link for an invoice
   */
  async createPaymentLink(invoiceId: string): Promise<string> {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          lead: true,
          items: true,
        },
      });

      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      // Check if payment link already exists
      if (invoice.stripePaymentLinkId) {
        const existingLink = await this.stripe.paymentLinks.retrieve(
          invoice.stripePaymentLinkId,
        );
        if (existingLink.active) {
          this.logger.debug(`Using existing payment link for invoice ${invoice.invoiceNumber}`);
          return existingLink.url;
        }
      }

      // Create line items for Stripe
      const lineItems: Stripe.PaymentLinkCreateParams.LineItem[] = invoice.items.map((item) => ({
        price_data: {
          currency: 'cad',
          product_data: {
            name: item.description,
          },
          unit_amount: Math.round(item.unitPrice * 100), // Convert to cents
        },
        quantity: item.quantity,
      }));

      // Add tax line item if applicable
      if (invoice.tax > 0) {
        lineItems.push({
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'Tax',
            },
            unit_amount: Math.round(invoice.tax * 100),
          },
          quantity: 1,
        });
      }

      // Apply discount if applicable
      if (invoice.discount > 0) {
        lineItems.push({
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'Discount',
            },
            unit_amount: -Math.round(invoice.discount * 100), // Negative amount for discount
          },
          quantity: 1,
        });
      }

      // Create payment link
      const paymentLink = await this.stripe.paymentLinks.create({
        line_items: lineItems,
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          leadId: invoice.leadId,
          leadEmail: invoice.lead.email,
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            url: `${this.configService.get('FRONTEND_URL')}/dashboard/billing?payment=success&invoice=${invoice.invoiceNumber}`,
          },
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        shipping_address_collection: {
          allowed_countries: ['US', 'CA'], // Adjust based on your business
        },
      });

      // Save payment link ID to database
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { stripePaymentLinkId: paymentLink.id },
      });

      this.logger.log(`✅ Created Stripe payment link for invoice ${invoice.invoiceNumber}: ${paymentLink.url}`);
      return paymentLink.url;
    } catch (error) {
      this.logger.error(`Failed to create payment link for invoice ${invoiceId}:`, error);
      throw error;
    }
  }

  /**
   * Get payment link URL for an invoice
   */
  async getPaymentLinkUrl(invoiceId: string): Promise<string | null> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { stripePaymentLinkId: true },
    });

    if (!invoice?.stripePaymentLinkId) {
      return null;
    }

    try {
      const paymentLink = await this.stripe.paymentLinks.retrieve(invoice.stripePaymentLinkId);
      return paymentLink.active ? paymentLink.url : null;
    } catch (error) {
      this.logger.error(`Failed to retrieve payment link:`, error);
      return null;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(body: Buffer, signature: string): Promise<any> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret || webhookSecret.includes('YOUR_WEBHOOK')) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`⚠️  Webhook signature verification failed:`, err.message);
      throw new Error(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`🔔 Stripe webhook received: ${event.type}`);

    // Handle the event
    switch (event.type) {
      // Invoice Payment Events
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      // Subscription Events
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    try {
      const invoiceId = paymentIntent.metadata?.invoiceId;
      if (!invoiceId) {
        this.logger.warn('Payment intent missing invoiceId in metadata');
        return;
      }

      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { lead: true },
      });

      if (!invoice) {
        this.logger.error(`Invoice ${invoiceId} not found for payment`);
        return;
      }

      // Record the payment
      const paymentAmount = paymentIntent.amount / 100; // Convert from cents

      const payment = await this.prisma.payment.create({
        data: {
          paymentNumber: `PAY-${Date.now()}`,
          invoiceId: invoice.id,
          leadId: invoice.leadId,
          amount: paymentAmount,
          method: 'credit_card',
          reference: paymentIntent.id,
          notes: `Stripe payment - ${paymentIntent.id}`,
          status: 'completed',
          paymentDate: new Date(),
        },
      });

      // Update invoice
      const newAmountPaid = invoice.amountPaid + paymentAmount;
      const newAmountDue = invoice.total - newAmountPaid;
      const newStatus = newAmountDue <= 0.01 ? 'paid' : 'partial';

      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date() : undefined,
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      this.logger.log(
        `✅ Payment recorded: $${paymentAmount} for invoice ${invoice.invoiceNumber} (Status: ${newStatus})`,
      );

      // TODO: Send payment confirmation email to customer
      // You can integrate with InvoicesService.sendPaymentConfirmation() here

    } catch (error) {
      this.logger.error('Failed to handle payment success:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.warn(`Payment failed for intent ${paymentIntent.id}`);
    
    const invoiceId = paymentIntent.metadata?.invoiceId;
    if (invoiceId) {
      await this.prisma.payment.create({
        data: {
          paymentNumber: `PAY-${Date.now()}`,
          invoiceId,
          leadId: paymentIntent.metadata.leadId,
          amount: paymentIntent.amount / 100,
          method: 'credit_card',
          reference: paymentIntent.id,
          notes: `Stripe payment failed - ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
          status: 'failed',
          paymentDate: new Date(),
        },
      });
    }
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  /**
   * Create a Stripe Checkout Session for subscription
   */
  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Prevent trial abuse: if user has already used trial and tries to get another one
      if (user.hasUsedTrial && user.subscriptionStatus === 'cancelled') {
        this.logger.warn(`User ${user.email} attempted to start new trial after cancellation`);
        throw new Error('Trial period can only be used once. Please subscribe to a paid plan.');
      }

      // Get or create Stripe customer
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
            clerkId: user.clerkId,
          },
        });
        customerId = customer.id;

        // Save customer ID and clear subscription IDs
        await this.prisma.user.update({
          where: { id: userId },
          data: { 
            stripeCustomerId: customerId,
            stripePriceId: null,
            stripeSubscriptionId: null,
            stripeCurrentPeriodEnd: null,
            trialEndsAt: null,
          },
        });

        this.logger.log(`Created Stripe customer ${customerId} for user ${user.email}`);
      } else {
        // Customer exists - cancel any existing subscriptions
        if (user.stripeSubscriptionId) {
          try {
            await this.stripe.subscriptions.cancel(user.stripeSubscriptionId);
            this.logger.log(`Canceled existing subscription ${user.stripeSubscriptionId} for user ${user.email}`);
          } catch (error) {
            this.logger.warn(`Failed to cancel existing subscription: ${error.message}`);
          }
        }
        
        // Also check for any other active subscriptions on the customer
        const existingSubscriptions = await this.stripe.subscriptions.list({
          customer: customerId,
          status: 'all',
        });
        
        for (const sub of existingSubscriptions.data) {
          if (sub.status === 'active' || sub.status === 'trialing') {
            try {
              await this.stripe.subscriptions.cancel(sub.id);
              this.logger.log(`Canceled active subscription ${sub.id} for customer ${customerId}`);
            } catch (error) {
              this.logger.warn(`Failed to cancel subscription ${sub.id}: ${error.message}`);
            }
          }
        }
        
        // Clear subscription IDs from database after cancellation (keep status/plan for history)
        await this.prisma.user.update({
          where: { id: userId },
          data: { 
            stripePriceId: null,
            stripeSubscriptionId: null,
            stripeCurrentPeriodEnd: null,
            trialEndsAt: null,
          },
        });
        this.logger.log(`Cleared subscription IDs for user ${user.email} before new checkout`);
      }

      // Create Checkout Session
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          trial_period_days: 7, // 7-day free trial
          metadata: {
            userId: user.id,
          },
          description: 'AutoStaff AI Subscription',
        },
        allow_promotion_codes: true,
        custom_text: {
          submit: {
            message: 'Subscribe to AutoStaff AI',
          },
        },
      });

      this.logger.log(`Created checkout session ${session.id} for user ${user.email}`);
      return session.url;
    } catch (error) {
      this.logger.error(`Failed to create checkout session:`, error);
      throw error;
    }
  }

  /**
   * Create a Stripe Customer Portal session for subscription management
   */
  async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true, email: true },
      });

      if (!user?.stripeCustomerId) {
        throw new Error('No Stripe customer found for this user');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl,
      });

      this.logger.log(`Created portal session for user ${user.email}`);
      return session.url;
    } catch (error) {
      this.logger.error(`Failed to create portal session:`, error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripeSubscriptionId: true, email: true, hasUsedTrial: true },
      });

      if (!user?.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      await this.stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // When subscription is cancelled, user cannot start a new trial
      // hasUsedTrial flag prevents trial exploitation
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'cancelled',
          // Keep hasUsedTrial: true to prevent re-trialing
        },
      });

      this.logger.log(`Scheduled cancellation for subscription ${user.stripeSubscriptionId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel subscription:`, error);
      throw error;
    }
  }

  /**
   * Map Stripe price ID to plan name
   */
  private getPlanNameFromPriceId(priceId: string): string {
    const planMap: Record<string, string> = {
      'price_1SapXvGndNudz61YnAU6kLOn': 'starter',
      'price_1SapfOGndNudz61Yq2d7vGdX': 'pro',
      'price_1SapgGGndNudz61YR2ky1Psy': 'ultimate',
    };
    return planMap[priceId] || 'starter';
  }

  /**
   * Handle subscription created
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    try {
      const userId = subscription.metadata?.userId;
      if (!userId) {
        this.logger.warn('Subscription missing userId in metadata');
        return;
      }

      const priceId = subscription.items.data[0]?.price.id;
      const planName = this.getPlanNameFromPriceId(priceId);
      
      const updateData: any = {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        subscriptionPlan: planName,
        subscriptionStatus: subscription.status === 'trialing' ? 'trial' : 'active',
      };

      // Set AI conversation limits based on plan (enforced even during trial)
      if (planName === 'starter') {
        updateData.aiConversationsLimit = 50;
      } else if (planName === 'pro') {
        updateData.aiConversationsLimit = 200;
      } else if (planName === 'ultimate') {
        updateData.aiConversationsLimit = null; // null = unlimited
      } else {
        // Default to starter limit if plan not recognized
        updateData.aiConversationsLimit = 50;
      }

      // Reset conversation counter on new subscription
      updateData.aiConversationsUsed = 0;
      updateData.lastResetAt = new Date();

      // Handle trial end date
      if (subscription.trial_end) {
        updateData.trialEndsAt = new Date(subscription.trial_end * 1000);
      }

      // Handle current period end (TypeScript workaround)
      const currentPeriodEnd = (subscription as any).current_period_end;
      if (currentPeriodEnd) {
        updateData.stripeCurrentPeriodEnd = new Date(currentPeriodEnd * 1000);
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      this.logger.log(`✅ Subscription created for user ${userId}: ${subscription.status}`);
    } catch (error) {
      this.logger.error('Failed to handle subscription created:', error);
    }
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (!user) {
        this.logger.warn(`No user found for subscription ${subscription.id}`);
        return;
      }

      let status = 'active';
      if (subscription.status === 'trialing') status = 'trial';
      else if (subscription.status === 'past_due') status = 'past_due';
      else if (subscription.cancel_at_period_end) status = 'cancelled';
      else if (subscription.status === 'canceled') status = 'cancelled';

      const priceId = subscription.items.data[0]?.price.id;
      const planName = this.getPlanNameFromPriceId(priceId);
      
      const updateData: any = {
        stripePriceId: priceId,
        subscriptionPlan: planName,
        subscriptionStatus: status,
      };

      // Update AI conversation limits if plan changed
      if (user.subscriptionPlan !== planName) {
        if (planName === 'starter') {
          updateData.aiConversationsLimit = 50;
        } else if (planName === 'pro') {
          updateData.aiConversationsLimit = 200;
        } else if (planName === 'ultimate') {
          updateData.aiConversationsLimit = null; // unlimited
        } else {
          // Default to starter limit if plan not recognized
          updateData.aiConversationsLimit = 50;
        }
        // Reset counter on plan change (upgrade/downgrade)
        updateData.aiConversationsUsed = 0;
        updateData.lastResetAt = new Date();
      }

      // Handle trial end date
      if (subscription.trial_end) {
        updateData.trialEndsAt = new Date(subscription.trial_end * 1000);
      }

      // Handle current period end (TypeScript workaround)
      const currentPeriodEnd = (subscription as any).current_period_end;
      if (currentPeriodEnd) {
        updateData.stripeCurrentPeriodEnd = new Date(currentPeriodEnd * 1000);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      this.logger.log(`✅ Subscription updated for user ${user.email}: ${status}`);
    } catch (error) {
      this.logger.error('Failed to handle subscription updated:', error);
    }
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (!user) {
        this.logger.warn(`No user found for subscription ${subscription.id}`);
        return;
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
          trialEndsAt: null,
          subscriptionStatus: 'cancelled',
        },
      });

      this.logger.log(`✅ Subscription cancelled for user ${user.email}`);
    } catch (error) {
      this.logger.error('Failed to handle subscription deleted:', error);
    }
  }

  /**
   * Manually sync subscription from Stripe
   */
  async syncSubscriptionFromStripe(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.stripeCustomerId) {
        throw new Error('No Stripe customer found for this user');
      }

      // Get all subscriptions for this customer
      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        this.logger.warn(`No subscriptions found for customer ${user.stripeCustomerId}`);
        return null;
      }

      const subscription = subscriptions.data[0];
      
      this.logger.log(`Subscription data: ${JSON.stringify(subscription, null, 2)}`);
      
      // Get the price to determine the plan
      const priceId = subscription.items.data[0].price.id;
      let plan = 'starter';
      if (priceId === 'price_1SapfOGndNudz61Yq2d7vGdX') {
        plan = 'pro';
      } else if (priceId === 'price_1SapgGGndNudz61YR2ky1Psy') {
        plan = 'ultimate';
      }

      // Get the period end or trial end timestamp
      const periodEnd = subscription.trial_end || (subscription as any).current_period_end;
      
      const updateData: any = {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        subscriptionStatus: subscription.status,
        subscriptionPlan: plan,
      };

      // Set the period end date if available
      if (periodEnd && typeof periodEnd === 'number') {
        updateData.stripeCurrentPeriodEnd = new Date(periodEnd * 1000);
      }
      
      // Set trial end date if in trial
      if (subscription.trial_end && typeof subscription.trial_end === 'number') {
        updateData.trialEndsAt = new Date(subscription.trial_end * 1000);
      }
      
      // Update user with subscription data
      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      this.logger.log(`✅ Synced subscription for user ${user.email}: ${subscription.status}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to sync subscription:', error);
      throw error;
    }
  }

  /**
   * Get billing history (invoices) for a user
   */
  async getBillingHistory(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.stripeCustomerId) {
        return [];
      }

      // Get all invoices for this customer
      const invoices = await this.stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 100,
      });

      return invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount_paid / 100, // Convert cents to dollars
        currency: invoice.currency.toUpperCase(),
        status: invoice.status,
        date: new Date(invoice.created * 1000),
        pdfUrl: invoice.invoice_pdf,
        hostedUrl: invoice.hosted_invoice_url,
      }));
    } catch (error) {
      this.logger.error('Failed to get billing history:', error);
      throw error;
    }
  }
}
