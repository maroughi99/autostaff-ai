# Automation Testing Guide

## Prerequisites
1. Deploy latest changes to production
2. Have Gmail & Calendar connected
3. Access to automation settings page

---

## 1. Working Hours ✅
**Test:** Send message outside working hours

1. Go to Automation → Set working hours (e.g., 9 AM - 5 PM)
2. Enable "Respect Working Hours"
3. Send test email to your business Gmail AFTER hours
4. **Expected:** AI drafts response but doesn't auto-send until morning
5. **Check:** Dashboard → Inbox → Should see draft pending

---

## 2. Response Settings ✅
**Test:** AI uses your tone/length preferences

1. Go to Automation → Response Settings
2. Set Tone: "Professional", Length: "Brief", Enable signature
3. Send test email asking for quote
4. **Expected:** AI reply is professional, brief, includes signature
5. **Check:** Review AI-generated draft

---

## 3. AI Behavior ✅
**Test:** Auto-respond, categorization, priority

### Auto-Respond:
1. **ON:** Send email → AI auto-replies (if within hours)
2. **OFF:** Send email → AI creates draft but needs approval

### Auto-Categorize:
1. **ON:** Send quote request → Lead auto-categorized
2. **OFF:** Lead marked as "inquiry" (default)

### Auto-Assign Priority:
1. Send "URGENT: broken pipe" → Should be HIGH priority
2. Send "just checking in" → Should be LOW priority
3. **Check:** Dashboard → Leads → Priority column

---

## 4. Auto Follow-Up ✅
**Test:** System follows up on old leads

1. Go to Automation → Enable "Auto Follow-Up"
2. Set delay: 3 days
3. Find a lead with last message 3+ days ago
4. Wait for hourly cron (or 1 hour)
5. **Expected:** Follow-up email sent automatically
6. **Check:** Logs for "🔄 Checking for leads needing follow-up"

---

## 5. Quote & Estimate Automation ✅
**Test:** Auto-generate quotes

1. Go to Automation → Enable "Auto-Generate Quotes"
2. Set min: $100, max: $10,000
3. Send email: "Need quote for 10x10 concrete patio"
4. **Expected:** AI generates quote automatically
5. **Check:** Dashboard → Quotes → New quote created
6. If requireApproval=ON → Quote needs review before sending

---

## 6. Calendar & Booking ✅
**Test:** Auto-booking and reminders

### Auto-Book:
1. **ON:** Send "Can you come Monday at 2pm?" → Event created automatically
2. **OFF:** Booking needs manual approval

### Buffer Time:
1. Set buffer: 30 minutes
2. Check available slots → Should have 30min gaps between bookings

### Max Bookings Per Day:
1. Set max: 5
2. Book 5 appointments in one day
3. Check available slots → No more slots that day

### Booking Reminders:
1. Enable "Send Booking Reminders" (24 hours before)
2. Create appointment for tomorrow
3. Wait for hourly cron
4. **Expected:** Customer receives reminder email
5. **Check:** Logs for "⏰ Checking for appointments needing reminders"

---

## 7. Email Filters ✅
**Test:** Spam, marketing, new contacts

### Spam Filter:
1. Enable "Spam Filter"
2. Send test with subject: "URGENT - Claim your prize NOW!!!"
3. **Expected:** Marked as spam, not processed
4. **Check:** Gmail → Should be in Spam folder

### Auto-Archive Marketing:
1. Enable "Auto-Archive Marketing"
2. Send email with "Unsubscribe" link and promotional content
3. **Expected:** Auto-archived (not in inbox)
4. **Check:** Email should be archived, not responded to

### Require Approval for New Contacts:
1. Enable "Require Approval for New Contacts"
2. Send email from NEW email address
3. **Expected:** AI drafts reply but requires approval
4. **Check:** Dashboard → Inbox → Draft needs approval
5. Send from EXISTING lead → Auto-sends (if auto-respond ON)

---

## Quick Verification Checklist

After deployment, check backend logs for:

```bash
# Working Hours
[WORKING HOURS] Current time is outside working hours

# Auto-categorize
🤖 Auto-categorize enabled - classifying message

# Auto-assign priority
🚨 High priority detected: urgent keywords found

# Auto follow-up
🔄 Checking for leads needing follow-up

# Auto-quote generation
✅ Created AI-generated quote #QT-xxx

# Booking reminders
⏰ Checking for appointments needing reminders

# Email filters
🚫 Spam detected - skipping email
📮 Marketing email detected - archiving
👤 New contact detected - requiring approval
```

---

## Common Issues

**Problem:** Settings saved but not applied
- **Solution:** Already fixed! Settings are now checked before processing

**Problem:** Cron jobs not running
- **Solution:** Check if backend is running continuously (not just on requests)

**Problem:** Gmail not connected
- **Solution:** Reconnect Gmail with calendar permissions in Settings

**Problem:** Auto-send not working
- **Solution:** Check: autoRespondEmails=ON, within working hours, not new contact (if filter enabled)

---

## Testing Priority

**Most Critical (Test First):**
1. Working hours (affects all auto-send)
2. Email filters (prevents spam processing)
3. Auto-respond toggle (main automation switch)

**Medium Priority:**
1. Auto-categorize & priority
2. Quote generation
3. Booking automation

**Lower Priority (Requires Time):**
1. Auto follow-up (hourly cron)
2. Booking reminders (hourly cron)

---

## Monitoring

Watch these metrics after deployment:
- Draft messages requiring approval (should align with settings)
- Auto-sent messages (should respect working hours)
- Lead categorization accuracy
- Quote generation success rate
- Spam/marketing emails filtered
- Follow-up messages sent
- Booking reminders delivered
