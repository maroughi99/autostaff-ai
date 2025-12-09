# Stripe Integration API Reference

## Stripe Module Endpoints

### Webhook Endpoint

```
POST /stripe/webhook
```

**Headers:**
- `stripe-signature`: Required - Stripe webhook signature for verification

**Body:** Raw JSON from Stripe (automatically parsed)

**Response:**
```json
{
  "received": true
}
```

**Events Handled:**
- `payment_intent.succeeded` - Auto-records payment, updates invoice to paid
- `payment_intent.payment_failed` - Records failed payment attempt

**Example Webhook Payload (payment_intent.succeeded):**
```json
{
  "id": "evt_...",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_...",
      "amount": 139900,
      "metadata": {
        "invoiceId": "cmis...",
        "invoiceNumber": "INV-123456",
        "leadId": "cmir...",
        "leadEmail": "customer@example.com"
      }
    }
  }
}
```

---

## Invoices Module - Enhanced Endpoints

### Send Invoice (with Payment Link)

```
POST /invoices/:id/send
```

**Behavior:**
1. Generates Stripe Payment Link (if amount due > 0)
2. Creates professional email with "Pay Now" button
3. Attaches PDF invoice
4. Updates invoice status to "sent"
5. Stores `stripePaymentLinkId` in database

**Payment Link Properties:**
- Includes all line items, tax, discounts
- Redirect to frontend after payment
- Allows promotion codes
- Collects billing address
- Shipping address collection (US/CA)

**Response:**
```json
{
  "id": "cmis...",
  "invoiceNumber": "INV-1764892399243",
  "stripePaymentLinkId": "plink_...",
  "status": "sent",
  ...
}
```

---

## StripeService Methods

### createPaymentLink(invoiceId: string)

Creates a new Stripe Payment Link for an invoice.

**Features:**
- Reuses existing active payment links
- Converts line items to Stripe format
- Handles tax and discounts
- Stores metadata for webhook processing
- Configurable success redirect URL

**Returns:** Payment link URL (string)

**Example:**
```typescript
const paymentUrl = await stripeService.createPaymentLink('cmis3d7ja000e12clubscphrd');
// https://buy.stripe.com/test_...
```

---

### getPaymentLinkUrl(invoiceId: string)

Retrieves existing payment link URL.

**Returns:** URL string or null

**Example:**
```typescript
const url = await stripeService.getPaymentLinkUrl('cmis...');
if (url) {
  console.log('Payment link:', url);
}
```

---

### handleWebhook(body: Buffer, signature: string)

Processes Stripe webhook events.

**Security:**
- Verifies webhook signature
- Prevents replay attacks
- Validates event source

**Automatic Actions:**
- Creates Payment record
- Updates invoice amountPaid and amountDue
- Changes status to 'paid' or 'partial'
- Sets paidAt timestamp
- Links payment to Stripe payment intent

---

## Database Schema Updates

### Invoice Model

```prisma
model Invoice {
  // ... existing fields
  
  // New Stripe fields
  stripePaymentLinkId    String?  @unique
  stripePaymentIntentId  String?
  
  // ... relationships
}
```

**Field Descriptions:**
- `stripePaymentLinkId`: Stripe Payment Link ID (e.g., `plink_...`)
- `stripePaymentIntentId`: Payment Intent ID from webhook (e.g., `pi_...`)

---

## Environment Variables

### Required for Payment Links

```bash
STRIPE_SECRET_KEY=sk_test_...
```

### Required for Webhooks

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Optional (for frontend)

```bash
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Email Template

### Invoice Email with Payment Button

```html
<div style="margin: 30px 0; text-align: center;">
  <a href="https://buy.stripe.com/test_..." 
     style="display: inline-block; padding: 15px 40px; background-color: #5469d4; 
            color: white; text-decoration: none; border-radius: 6px; 
            font-weight: bold; font-size: 16px;">
    💳 Pay Now with Credit Card
  </a>
  <p style="margin-top: 10px; font-size: 14px; color: #666;">
    Secure payment powered by Stripe
  </p>
</div>
```

---

## Payment Flow States

```
Invoice Status Transitions:

draft → sent (via Send Invoice button)
  ↓
sent → partial (via webhook: payment < total)
  ↓
partial → paid (via webhook: payment >= total)
```

**Payment Record Statuses:**
- `pending` - Payment initiated
- `completed` - Payment successful
- `failed` - Payment declined
- `refunded` - Payment refunded (manual)

---

## Error Handling

### Stripe Not Configured

```typescript
if (!secretKey || secretKey.includes('YOUR_STRIPE')) {
  logger.warn('⚠️  Stripe not configured - payment links will not work');
  // Continues without payment link
}
```

**Result:** Invoice sends without payment button

### Payment Link Creation Failed

```typescript
try {
  paymentLink = await this.stripeService.createPaymentLink(id);
} catch (error) {
  logger.warn('Failed to create payment link (continuing without it)');
  // Invoice still sends, just without payment button
}
```

### Webhook Signature Invalid

```typescript
try {
  event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
} catch (err) {
  throw new Error(`Webhook Error: ${err.message}`);
  // Returns 400 status to Stripe
}
```

---

## Testing Scenarios

### 1. Full Payment

**Card:** 4242 4242 4242 4242  
**Expected:**
- Payment intent succeeds
- Webhook records $X payment
- Invoice status → `paid`
- amountPaid = total
- amountDue = 0
- paidAt timestamp set

### 2. Partial Payment (not currently supported)

Payment links pay full amount only. For partial payments, use manual "Record Payment" feature.

### 3. Payment Failure

**Card:** 4000 0000 0000 0002  
**Expected:**
- Payment fails at checkout
- Webhook records failed payment
- Invoice status remains `sent`
- Payment record with status = `failed`

---

## Monitoring & Logging

### Server Logs

```bash
[StripeService] ✅ Created Stripe payment link for invoice INV-123: https://...
[EmailPollerService] 💳 Created payment link for invoice INV-123
[StripeService] 🔔 Stripe webhook received: payment_intent.succeeded
[StripeService] ✅ Payment recorded: $1389.9 for invoice INV-123 (Status: paid)
```

### Stripe Dashboard

Monitor payments at: https://dashboard.stripe.com/test/payments

**Check:**
- Payment status
- Customer details
- Metadata (invoiceId, etc.)
- Webhook delivery status
- Event logs

---

## Advanced Features (Future Enhancements)

### Potential Additions:

1. **Refund Handling**
```typescript
case 'charge.refunded':
  await this.handleRefund(event.data.object);
  break;
```

2. **Subscription Support**
```typescript
case 'invoice.payment_succeeded':
  await this.handleRecurringPayment(event.data.object);
  break;
```

3. **Payment Method Save/Reuse**
```typescript
const paymentLink = await stripe.paymentLinks.create({
  // ... existing config
  payment_method_collection: 'if_required',
  customer: customerId, // Link to existing customer
});
```

4. **ACH Bank Transfers**
```typescript
payment_method_types: ['card', 'us_bank_account'],
```

5. **Payment Plans/Installments**
```typescript
// Create subscription with fixed payment count
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  metadata: { installments: 3, invoiceId: '...' }
});
```

---

## Security Checklist

- [x] Webhook signature verification implemented
- [x] API keys stored in environment variables (not code)
- [x] `.env` files in `.gitignore`
- [x] Raw body parsing for webhook endpoint
- [x] HTTPS required for production webhooks
- [ ] Rate limiting on webhook endpoint (consider adding)
- [ ] Idempotency keys for duplicate prevention (consider adding)

---

## Production Deployment

### Pre-Launch Checklist:

1. [ ] Switch to live Stripe API keys
2. [ ] Update webhook endpoint to production URL
3. [ ] Verify webhook signing secret
4. [ ] Test with small real payment
5. [ ] Monitor first few transactions
6. [ ] Set up Stripe alerts/notifications
7. [ ] Configure payout schedule
8. [ ] Review Stripe fee structure
9. [ ] Set up dispute handling process
10. [ ] Add refund policy to emails

---

## Support Resources

**Stripe Dashboard:**
- Payments: https://dashboard.stripe.com/payments
- Webhooks: https://dashboard.stripe.com/webhooks
- Logs: https://dashboard.stripe.com/logs
- API Keys: https://dashboard.stripe.com/apikeys

**Documentation:**
- Payment Links: https://stripe.com/docs/payment-links
- Webhooks: https://stripe.com/docs/webhooks
- Testing: https://stripe.com/docs/testing
- Metadata: https://stripe.com/docs/payments/payment-intents/usage#metadata

**Status:**
- Check Stripe uptime: https://status.stripe.com
