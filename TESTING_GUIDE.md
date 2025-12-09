# Feature Testing Checklist

## 🔍 Manual Testing Guide for All Features

### Prerequisites
- ✅ API Server running on `http://localhost:3001`
- ✅ Frontend running on `http://localhost:3000`

---

## Test Scenarios by Subscription Tier

### 1️⃣ NO SUBSCRIPTION (New User / Cancelled)

**Expected Behavior:**
- Should be redirected to `/dashboard/subscription` for ALL pages except subscription page
- Should see "No active subscription" message
- Should see upgrade prompts on all feature pages

**Pages to Test:**
- ✅ `/dashboard` → Redirect to subscription page
- ✅ `/dashboard/leads` → Show FeatureLocked component
- ✅ `/dashboard/quotes` → Show FeatureLocked component  
- ✅ `/dashboard/billing` → Show FeatureLocked component
- ✅ `/dashboard/calendar` → Show FeatureLocked component
- ✅ `/dashboard/inbox` → Show FeatureLocked component
- ✅ `/dashboard/subscription` → **SHOULD BE ACCESSIBLE**
- ✅ `/dashboard/settings` → Accessible (basic settings)

**API Tests:**
```powershell
# All should return 402 Payment Required or 401 Unauthorized
curl http://localhost:3001/leads?userId=YOUR_USER_ID
curl http://localhost:3001/quotes?userId=YOUR_USER_ID
curl http://localhost:3001/invoices?userId=YOUR_USER_ID
curl http://localhost:3001/messages?userId=YOUR_USER_ID
```

---

### 2️⃣ STARTER PLAN ($99/month)

**Expected Behavior:**
- Access to all BASIC features
- Should see feature pages WITHOUT upgrade prompts
- Limited to 50 AI conversations/month

**Included Features:**
- ✅ Email Integration
- ✅ Calendar Management  
- ✅ Lead Tracking
- ✅ Invoice Generation
- ✅ Quote Generation
- ✅ Payment Processing

**Pages to Test:**
- ✅ `/dashboard/leads` → Full access
- ✅ `/dashboard/quotes` → Full access
- ✅ `/dashboard/billing` → Full access
- ✅ `/dashboard/calendar` → Full access
- ✅ `/dashboard/inbox` → Full access

**What Should Be LOCKED:**
- ❌ Advanced lead scoring features
- ❌ Contract generation
- ❌ Custom AI training
- ❌ Team collaboration

---

### 3️⃣ PRO PLAN ($199/month)

**Expected Behavior:**
- Access to STARTER + ADVANCED features
- 200 AI conversations/month

**Additional Features (vs Starter):**
- ✅ Lead Scoring
- ✅ Contract Generation
- ✅ Custom AI Training
- ✅ Team Collaboration

**Pages to Test:**
- All pages accessible
- Check for advanced features within pages
- Should NOT show upgrade prompts for pro features

**What Should Be LOCKED:**
- ❌ White Label
- ❌ API Access
- ❌ Multi-location
- ❌ Priority Support

---

### 4️⃣ ULTIMATE PLAN ($399/month)

**Expected Behavior:**
- Access to ALL features
- UNLIMITED AI conversations
- No upgrade prompts anywhere

**All Features Unlocked:**
- ✅ Everything from Pro
- ✅ White Label
- ✅ API Access
- ✅ Multi-location
- ✅ Priority Support

**Pages to Test:**
- All pages fully accessible
- All advanced features visible
- No restrictions anywhere

---

## 🧪 Test Steps

### Step 1: Test Without Subscription
1. Create new account OR cancel existing subscription
2. Visit each dashboard page
3. Verify FeatureLocked component shows
4. Confirm subscription page is accessible
5. Try to create leads/quotes → Should be blocked

### Step 2: Test Starter Plan
1. Subscribe to Starter plan ($99)
2. Wait for webhook to update subscription
3. Refresh page - verify "Current Plan: Starter"
4. Access leads, quotes, billing, calendar, inbox
5. Verify all work without upgrade prompts
6. Check that AI conversation limit shows 50/month

### Step 3: Test Pro Plan  
1. Upgrade to Pro plan ($199)
2. Verify plan shows as "Pro"
3. Check advanced features are now available
4. Verify AI conversation limit shows 200/month
5. Test team collaboration features

### Step 4: Test Ultimate Plan
1. Upgrade to Ultimate plan ($399)
2. Verify "Ultimate" plan displays
3. Check AI shows "Unlimited"
4. Verify all enterprise features accessible
5. No upgrade prompts anywhere

---

## 🔍 Common Issues to Check

### Frontend Issues:
- [ ] FeatureLocked component displays correctly
- [ ] Upgrade buttons link to subscription page
- [ ] Plan name displays correctly in UI
- [ ] Loading states work properly
- [ ] No console errors

### Backend Issues:
- [ ] Webhooks updating subscription correctly
- [ ] Price ID mapped to correct plan name
- [ ] Subscription status updating (trial/active/cancelled)
- [ ] Auto-cancellation of old subscriptions working
- [ ] API endpoints protected by subscription middleware

### Database Issues:
- [ ] `subscriptionPlan` field updated correctly
- [ ] `subscriptionStatus` matches Stripe
- [ ] `stripeSubscriptionId` present for active subscriptions
- [ ] Cancelled subscriptions clear all fields

---

## 📊 Test Results Template

```
Date: _______________
Tester: _______________

NO SUBSCRIPTION:
- Dashboard redirect: [ PASS / FAIL ]
- Leads blocked: [ PASS / FAIL ]
- Quotes blocked: [ PASS / FAIL ]
- Subscription page accessible: [ PASS / FAIL ]

STARTER PLAN:
- All basic features accessible: [ PASS / FAIL ]
- AI limit shows 50: [ PASS / FAIL ]
- No errors: [ PASS / FAIL ]

PRO PLAN:
- Advanced features accessible: [ PASS / FAIL ]
- AI limit shows 200: [ PASS / FAIL ]
- No upgrade prompts: [ PASS / FAIL ]

ULTIMATE PLAN:
- All features accessible: [ PASS / FAIL ]
- AI shows unlimited: [ PASS / FAIL ]
- Enterprise features work: [ PASS / FAIL ]

OVERALL PASS RATE: ____%
```

---

## 🐛 Bug Reporting

If you find issues, note:
1. **What tier** were you testing?
2. **What page** had the issue?
3. **Expected** behavior
4. **Actual** behavior  
5. **Console errors** (if any)
6. **Network requests** (check DevTools)

---

## 🚀 Quick Test Commands

```powershell
# Check if servers are running
curl http://localhost:3000
curl http://localhost:3001

# Check user subscription status
curl http://localhost:3001/auth/me -H "x-user-id: YOUR_USER_ID"

# Test API protection
curl http://localhost:3001/leads?userId=YOUR_USER_ID

# Watch webhook logs
# Check terminal running `npm run start:dev` in apps/api
```

---

## ✅ Success Criteria

Feature gating is working if:
1. Users without subscriptions CANNOT access any features
2. Starter users can access basic features only
3. Pro users can access advanced features
4. Ultimate users have full access
5. Upgrade prompts show correctly for locked features
6. No console errors or broken pages
7. API endpoints protected correctly
8. Subscription updates reflect immediately
