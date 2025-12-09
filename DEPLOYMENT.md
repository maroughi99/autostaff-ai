# Production Deployment Guide

## Railway (Backend API)

### 1. Create Railway Account
- Go to https://railway.app
- Sign up with GitHub

### 2. Create New Project
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose `maroughi99/autostaff-ai`

### 3. Add PostgreSQL Database
- In your project, click "New"
- Select "Database" → "PostgreSQL"
- Railway will create the database and provide DATABASE_URL

### 4. Configure Environment Variables
Add these variables in Railway dashboard:

```
DATABASE_URL=(automatically set by Railway PostgreSQL)
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_key
CLERK_SECRET_KEY=your_clerk_secret
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_secret
GMAIL_REDIRECT_URI=your_railway_url/gmail/callback
PORT=3001
NODE_ENV=production
```

### 5. Deploy Settings
- Build Command: `npm install && cd packages/database && npx prisma generate && cd ../../apps/api && npm install && npm run build`
- Start Command: `cd packages/database && npx prisma migrate deploy && cd ../../apps/api && npm run start:prod`
- Port: 3001

### 6. Get Your Backend URL
After deployment, Railway will give you a URL like:
`https://autostaff-ai-production.up.railway.app`

---

## Netlify (Frontend)

### 1. Connect to Netlify
- Go to https://netlify.com
- Click "Add new site" → "Import an existing project"
- Choose GitHub and select `maroughi99/autostaff-ai`

### 2. Build Settings
- Base directory: `apps/web`
- Build command: `npm install && npm run build`
- Publish directory: `apps/web/.next`

### 3. Environment Variables
Add in Netlify dashboard:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

### 4. Deploy!
Netlify will auto-deploy on every push to main branch

---

## After Deployment

1. Update Clerk dashboard with production URLs:
   - Add your Netlify URL to allowed origins
   - Update redirect URLs

2. Update Stripe dashboard:
   - Add your Railway URL as webhook endpoint
   - Update redirect URLs

3. Update Gmail OAuth:
   - Add Railway callback URL to Google Console

4. Test everything works!

---

## Ongoing Updates

To deploy changes:
```bash
git add .
git commit -m "Your changes"
git push
```

Both Railway and Netlify will auto-deploy!
