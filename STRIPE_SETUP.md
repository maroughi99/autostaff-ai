# Stripe Payment Integration - Setup Guide

## ✅ Implementation Complete!

The Stripe payment integration has been successfully added to your AutoStaff AI billing system. Here's what was implemented:

### Features Implemented

1. **Payment Link Generation**
   - Automatic Stripe Payment Link creation when sending invoices
   - Payment links include all invoice line items, tax, and discounts
   - Links are stored in database (`stripePaymentLinkId` field)
   - Reuses existing payment links instead of creating duplicates

2. **Email Integration**
   - Professional "Pay Now with Credit Card" button in invoice emails
   - Button styled with Stripe branding colors
   - Only shows payment button when amount is due
   - Gracefully handles missing Stripe configuration

3. **Webhook Handler**
   - POST `/stripe/webhook` endpoint for payment notifications
   - Webhook signature verification for security
   - Automatic payment recording when customer pays
   - Auto-updates invoice status (draft → sent → paid)
   - Handles payment failures with proper logging

4. **Database Updates**
   - Added `stripePaymentLinkId` (unique) to Invoice model
   - Added `stripePaymentIntentId` to track webhook payments
   - Prisma schema migrated successfully

### Files Created/Modified

**New Files:**
- `apps/api/src/stripe/stripe.service.ts` - Core Stripe integration logic
- `apps/api/src/stripe/stripe.controller.ts` - Webhook endpoint
- `apps/api/src/stripe/stripe.module.ts` - NestJS module configuration

**Modified Files:**
- `apps/api/src/invoices/invoices.service.ts` - Added payment link generation
- `apps/api/src/invoices/invoices.module.ts` - Import StripeModule
- `apps/api/src/app.module.ts` - Register StripeModule
- `packages/database/prisma/schema.prisma` - Added Stripe fields
- `apps/api/.env` - Added Stripe API keys (placeholders)
- `apps/web/.env.local` - Added publishable key (placeholder)

---

## 🔧 Required Setup Steps

### Step 1: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/register (create account if needed)
2. After logging in, go to **Developers → API keys**
3. You'll see:
   - **Publishable key**: `pk_test_...` (starts with pk_test for test mode)
   - **Secret key**: Click "Reveal test key" to see `sk_test_...`

### Step 2: Configure Environment Variables

**In `apps/api/.env`:**
```bash
# Replace these placeholder values with your actual Stripe keys
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE  # Get this in Step 3
```

**In `apps/web/.env.local`:**
```bash
# Replace with your actual publishable key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE
```

### Step 3: Set Up Webhook (for automatic payment recording)

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   - **Production**: `https://yourdomain.com/stripe/webhook`
   - **Development (using ngrok)**:
     - Install ngrok: https://ngrok.com/download
     - Run: `ngrok http 3001`
     - Use URL like: `https://abc123.ngrok.io/stripe/webhook`
4. Select events to listen to:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

### Step 4: Restart Your Server

```bash
# The dev server should auto-restart, but if not:
npm run dev
```

---

## 🧪 Testing the Integration

### Test Mode (Recommended for Development)

Stripe provides test card numbers that simulate real payments without charging:

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

**Failed Payment:**
- Card: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits

More test cards: https://stripe.com/docs/testing

### Testing Workflow

1. **Create an Invoice**
   - Go to http://localhost:3000/dashboard/billing
   - Click "Record Payment" or send an existing invoice

2. **Send Invoice with Payment Link**
   - Click "Send Invoice" button
   - Invoice email will include "Pay Now with Credit Card" button
   - Payment link is automatically generated

3. **Make Test Payment**
   - Click payment link in email
   - Use test card `4242 4242 4242 4242`
   - Complete checkout

4. **Verify Webhook**
   - Check Stripe Dashboard → Webhooks → View events
   - Payment should auto-record in your app
   - Invoice status should update to "paid"
   - Payment record should be created with reference to Stripe payment intent

---

## 🔒 Security Notes

1. **Never commit API keys to Git**
   - `.env` files are already in `.gitignore`
   - Use environment variables in production

2. **Webhook Signature Verification**
   - Already implemented in `stripe.controller.ts`
   - Protects against fake webhook requests
   - Requires `STRIPE_WEBHOOK_SECRET` to work

3. **Test vs Production Keys**
   - Test keys start with `pk_test_` and `sk_test_`
   - Production keys start with `pk_live_` and `sk_live_`
   - Never use test keys in production!

---

## 📊 Payment Flow

```
1. User clicks "Send Invoice"
   ↓
2. System creates Stripe Payment Link
   ↓
3. Payment link stored in database
   ↓
4. Email sent with "Pay Now" button
   ↓
5. Customer clicks button → Stripe checkout
   ↓
6. Customer enters card → Completes payment
   ↓
7. Stripe sends webhook to your server
   ↓
8. Webhook verifies signature
   ↓
9. System records payment automatically
   ↓
10. Invoice status updated to "paid"
   ↓
11. Payment confirmation logged
```

---

## 🐛 Troubleshooting

### Payment Link Not Created
- **Error**: "Stripe not configured"
- **Fix**: Add valid `STRIPE_SECRET_KEY` to `.env`

### Webhook Not Working
- **Symptoms**: Payments succeed but invoice stays "sent"
- **Fix**: 
  1. Check `STRIPE_WEBHOOK_SECRET` in `.env`
  2. Verify webhook endpoint URL in Stripe Dashboard
  3. Check webhook logs in Stripe Dashboard
  4. Check NestJS logs for webhook errors

### Cannot Test Locally
- **Problem**: Stripe can't reach localhost
- **Solution**: Use ngrok to create public tunnel:
  ```bash
  ngrok http 3001
  # Use the https URL as webhook endpoint
  ```

### Payment Succeeds but Amount Wrong
- **Issue**: Stripe uses cents, not dollars
- **Fix**: Already handled in code (multiplies by 100)

---

## 💰 Stripe Fees

**Per Transaction:**
- 2.9% + $0.30 for US cards
- Check https://stripe.com/pricing for your region

**Example:**
- Invoice total: $1,000.00
- Stripe fee: $29.30 (2.9%) + $0.30 = $29.60
- You receive: $970.40

---

## 🚀 Going Live

When ready for production:

1. Activate your Stripe account (verify business info)
2. Switch to **live mode** in Stripe Dashboard
3. Get **live API keys** (start with `pk_live_` and `sk_live_`)
4. Update production environment variables
5. Update webhook endpoint to production URL
6. Test with small real payment first!

---

## 📚 Resources

- Stripe Dashboard: https://dashboard.stripe.com
- Stripe API Docs: https://stripe.com/docs/api
- Payment Links Guide: https://stripe.com/docs/payment-links
- Webhooks Guide: https://stripe.com/docs/webhooks
- Test Cards: https://stripe.com/docs/testing

---

## ✅ Next Steps

1. [ ] Get Stripe test API keys
2. [ ] Add keys to `.env` files
3. [ ] Set up ngrok for local development
4. [ ] Configure webhook endpoint
5. [ ] Test end-to-end payment flow
6. [ ] Verify webhook payment recording
7. [ ] Test with different payment scenarios
8. [ ] Consider adding refund handling
9. [ ] Set up production keys when ready

---

**Need Help?**
- Stripe Support: https://support.stripe.com
- Stripe Status: https://status.stripe.com
- Check server logs at http://localhost:3001 for integration errors
