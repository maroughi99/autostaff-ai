# Production Testing Guide 🛡️

Test your live site on **autostaffai.com** automatically!

---

## Quick Start

### Option 1: Simple (PowerShell)
```powershell
.\run-warden.ps1
```

### Option 2: Direct Commands
```powershell
# Full test suite
node test-production.js

# Quick health check (30 seconds)
node test-production.js --quick

# Continuous monitoring (every 5 minutes)
node test-production.js --continuous
```

---

## Setup for Authenticated Testing

To test logged-in features, you need to provide credentials:

### Step 1: Get Your User ID

1. Sign in to https://autostaffai.com
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Run: `document.cookie`
5. Find your `__session` cookie value
6. Or go to your profile and copy the user ID from the URL

### Step 2: Configure Credentials

Create a file called `.env.test.local`:

```bash
# Copy from .env.test and fill in:
TEST_USER_ID=user_2xxxxxxxxxxxxx
TEST_EMAIL=your-email@example.com
CLERK_SESSION_TOKEN=your-session-token-if-needed
```

### Step 3: Run Tests

```powershell
node test-production.js
```

---

## What Gets Tested

### ✅ Basic Checks (No Auth Required)
- Website availability & load time
- SSL certificate & security headers
- API health endpoints
- Public page accessibility (homepage, sign-in, etc.)
- Database connectivity

### ✅ Authenticated Checks (Requires Credentials)
- Leads API
- Quotes API
- Invoices API
- Messages API
- Dashboard stats
- Email poller service activity

### ✅ Security Checks
- HTTPS enabled
- HSTS header
- X-Frame-Options
- X-Content-Type-Options

---

## Test Modes

### 1. Full Test Suite
Runs all tests (takes ~1-2 minutes)

```powershell
node test-production.js
```

**Output Example:**
```
🛡️  AutoStaffAI Production Test Warden
   Target: https://autostaffai.com
   Started: 12/25/2025, 3:45:30 PM

============================================================
🛡️  Website Availability Check
============================================================
✓ Website Reachable
  Load time: 234ms

============================================================
🛡️  API Health Check
============================================================
✓ Health Endpoint
  Response time: 145ms
✓ Auth Status
  Response time: 89ms

... (more tests)

============================================================
🛡️  Test Summary
============================================================

Total Tests: 18
✓ Passed: 16
✗ Failed: 0
⚠ Warnings: 2

Duration: 45.23s
Pass Rate: 100.0%

🎉 All systems operational!
```

### 2. Quick Health Check
Fast check for critical services (takes ~10 seconds)

```powershell
node test-production.js --quick
```

Use this for:
- Quick status checks
- Pre-deployment verification
- CI/CD health checks

### 3. Continuous Monitoring
Runs health checks every 5 minutes

```powershell
node test-production.js --continuous
```

Great for:
- Monitoring production during deployments
- Catching issues early
- Overnight monitoring

---

## Setting Up Alerts

Get notified when tests fail!

### Discord Alerts

1. Create a webhook in your Discord server:
   - Server Settings → Integrations → Webhooks
   - Copy webhook URL

2. Add to `.env.test.local`:
```bash
DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
```

### Slack Alerts

1. Create a webhook in Slack:
   - Go to https://api.slack.com/apps
   - Create New App → Incoming Webhooks
   - Copy webhook URL

2. Add to `.env.test.local`:
```bash
SLACK_WEBHOOK=https://hooks.slack.com/services/...
```

Now you'll get alerts when tests fail! 🚨

---

## Common Use Cases

### Before Deployment
```powershell
# Run full tests to ensure nothing breaks
node test-production.js
```

### After Deployment
```powershell
# Quick check that everything still works
node test-production.js --quick
```

### During Deployment
```powershell
# Monitor continuously during deployment
node test-production.js --continuous
```

### Daily Monitoring
Set up a scheduled task to run daily:

```powershell
# Windows Task Scheduler
schtasks /create /tn "AutoStaffAI-Warden" /tr "node C:\path\to\test-production.js --quick" /sc daily /st 09:00
```

---

## Troubleshooting

### "Website not reachable"
- Check if autostaffai.com is actually down
- Check your internet connection
- Try accessing the site in a browser

### "Authentication failed" (401)
- Your session token expired
- Get a new session token from browser
- Update `.env.test.local`

### "No active subscription" (402)
- This is expected if your test user doesn't have a subscription
- Use a test account with an active plan
- Or ignore this warning (it's not a failure)

### Tests are slow
- Some tests query the database
- Network latency to production server
- Use `--quick` mode for faster results

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Production Health Check
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  test-production:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Run production tests
        env:
          TEST_USER_ID: ${{ secrets.TEST_USER_ID }}
          DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK }}
        run: node test-production.js --quick
```

### Add secrets to GitHub:
- Settings → Secrets → Actions
- Add `TEST_USER_ID` and `DISCORD_WEBHOOK`

---

## Advanced Usage

### Run specific test only

Modify `test-production.js` to comment out tests you don't need:

```javascript
await testWebsiteAvailability();
// await testAPIHealth();
// await testDashboardPages();
await testSSL();
```

### Custom test intervals

For continuous mode, change the interval:

```javascript
// In test-production.js, find:
await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 minutes

// Change to 1 minute:
await new Promise(resolve => setTimeout(resolve, 1 * 60 * 1000));
```

### Export results to file

```powershell
node test-production.js > test-results.txt
```

---

## What This DOESN'T Test

- Email sending (requires Gmail API access)
- Stripe webhooks (needs webhook simulation)
- AI responses (requires OpenAI key)
- Calendar booking (needs Google Calendar API)

For those, use the manual tests in `AUTOMATION_TESTING.md`

---

## Questions?

If a test fails:
1. Check the error message
2. Try accessing the feature manually
3. Check server logs on your hosting platform
4. Check if the issue reproduces locally

**Happy Testing!** 🎉
