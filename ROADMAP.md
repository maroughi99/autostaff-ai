# AutoStaff AI - Development Roadmap

## ✅ PHASE 1 — Foundation (Week 1–2) - COMPLETED

### Done
- [x] Project naming: AutoStaff AI
- [x] Tech stack selection
  - [x] Frontend: Next.js + Tailwind + ShadCN
  - [x] Backend: NestJS
  - [x] Database: PostgreSQL + Prisma
  - [x] Auth: Clerk
- [x] Monorepo setup with Turborepo
- [x] Basic frontend structure
- [x] Basic backend structure
- [x] Database schema designed
- [x] Landing page created
- [x] Dashboard shell built
- [x] Authentication flow setup

## 🔧 PHASE 2 — Build MVP (Week 3–6) - NEXT

### Core Features to Build

#### 1. AI Inbox Agent 🤖
- [ ] Email integration (Gmail API)
- [ ] Email polling/webhook system
- [ ] Message classification (lead, question, spam, customer, problem)
- [ ] AI response generation using OpenAI
- [ ] Automatic sending (with approval option)
- [ ] Dashboard view for all messages
- [ ] Response review & edit before sending

**Files to create:**
- `apps/api/src/email/email.module.ts`
- `apps/api/src/email/email.service.ts`
- `apps/api/src/email/gmail.service.ts`
- `apps/web/src/app/dashboard/inbox/page.tsx`

#### 2. AI Lead Handler 📋
- [ ] Lead qualification flow
- [ ] Automatic information gathering (name, email, phone, address)
- [ ] Service type detection
- [ ] Priority assignment
- [ ] Google Calendar integration
- [ ] Appointment booking automation
- [ ] Lead assignment to CRM stages

**Files to create:**
- `apps/api/src/leads/lead-handler.service.ts`
- `apps/api/src/calendar/calendar.module.ts`
- `apps/api/src/calendar/google-calendar.service.ts`

#### 3. Simple CRM 📊
- [ ] Kanban board view (drag & drop)
- [ ] Pipeline stages:
  - New Lead
  - Contacted
  - Needs Quote
  - Sent Quote
  - Scheduled
  - Completed
  - Lost
- [ ] Lead detail view
- [ ] Activity timeline
- [ ] Quick actions (call, email, quote)

**Files to create:**
- `apps/web/src/app/dashboard/leads/page.tsx`
- `apps/web/src/components/kanban/board.tsx`
- `apps/web/src/components/kanban/card.tsx`
- `apps/web/src/components/lead-detail.tsx`

#### 4. Quote Generator 💰
- [ ] Pricing templates management
- [ ] AI-powered quote generation
- [ ] Line item management
- [ ] PDF export
- [ ] Email delivery
- [ ] Quote tracking (sent, viewed, accepted)
- [ ] E-signature integration (future)

**Files to create:**
- `apps/web/src/app/dashboard/quotes/page.tsx`
- `apps/web/src/app/dashboard/quotes/new/page.tsx`
- `apps/api/src/quotes/pdf.service.ts`
- `apps/web/src/components/quote-builder.tsx`

#### 5. Follow-Up Agent 🔄
- [ ] Automated follow-up rules
- [ ] Time-based triggers (24h, 48h, 7 days)
- [ ] Stage-based triggers
- [ ] Email templates
- [ ] SMS follow-ups (Twilio)
- [ ] Follow-up tracking
- [ ] Activity logging

**Files to create:**
- `apps/api/src/automation/automation.module.ts`
- `apps/api/src/automation/follow-up.service.ts`
- `apps/api/src/automation/scheduler.service.ts`
- `apps/api/src/sms/sms.module.ts`
- `apps/api/src/sms/twilio.service.ts`

### Technical Additions Needed
- [ ] BullMQ setup for background jobs
- [ ] Email queue processing
- [ ] Webhook handlers for Gmail
- [ ] Real-time updates with WebSockets/SSE
- [ ] File upload for attachments
- [ ] Image handling for service requests
- [ ] Notification system

## 🎯 PHASE 3 — Beta Launch (Week 6–8)

### Onboarding Flow
- [ ] Multi-step onboarding wizard
  - [ ] Connect email (Gmail OAuth)
  - [ ] Connect calendar (Google Calendar OAuth)
  - [ ] Business information form
  - [ ] Service types configuration
  - [ ] Pricing templates setup
  - [ ] AI training/customization
- [ ] Welcome tutorial
- [ ] Sample data generation

### Beta User Acquisition
- [ ] Beta signup landing page
- [ ] Demo video creation
- [ ] Feedback collection system
- [ ] Usage analytics
- [ ] Bug reporting system

### Testing & Refinement
- [ ] Monitor AI response quality
- [ ] Track user engagement
- [ ] Fix issues quickly
- [ ] Gather feature requests

**Target:** 10 beta users actively using the system

## 💰 PHASE 4 — Monetization (Month 3)

### Pricing Implementation
- [ ] Stripe integration
- [ ] Subscription management
- [ ] Trial period logic (14 days)
- [ ] Usage tracking
- [ ] Billing dashboard
- [ ] Invoice generation

### Plans
- **Starter** - $99/mo
  - 500 messages/month
  - Basic AI features
  - Email support

- **Pro** - $199/mo
  - 2,000 messages/month
  - Advanced AI
  - Calendar integration
  - SMS notifications
  - Priority support

- **Ultimate** - $399/mo
  - Unlimited messages
  - Phone AI agent
  - Multi-location
  - Custom integrations
  - Dedicated support

### Sales Funnel
- [ ] Pricing page redesign
- [ ] Feature comparison table
- [ ] Testimonials section
- [ ] Case studies
- [ ] Demo booking system

## 🚀 PHASE 5 — Growth Engine (Month 4–6)

### Marketing Channels
1. **Facebook Groups**
   - [ ] Content calendar
   - [ ] Success stories
   - [ ] Before/after demos

2. **TikTok/Reels**
   - [ ] Short demo videos
   - [ ] AI in action clips
   - [ ] Customer testimonials

3. **Cold Outreach**
   - [ ] Email templates
   - [ ] LinkedIn automation
   - [ ] Personalized demos

4. **SEO & Content**
   - [ ] Blog setup
   - [ ] How-to guides
   - [ ] Industry-specific pages

5. **Partnerships**
   - [ ] Referral program
   - [ ] Affiliate system
   - [ ] Integration partnerships

### Vertical Expansion
- [ ] HVAC-specific features
- [ ] Plumbing templates
- [ ] Concrete/Masonry workflows
- [ ] Electrical templates
- [ ] Cleaning services presets

## 📈 PHASE 6 — Scale to $1M+ (Month 6–12)

### Voice Agent 🎙️
- [ ] Twilio Voice integration
- [ ] Speech-to-text
- [ ] Text-to-speech
- [ ] Call routing
- [ ] Voicemail transcription
- [ ] Call recording & analytics

### Multi-Location Support
- [ ] Team management
- [ ] Location routing
- [ ] Consolidated dashboard
- [ ] Permission system
- [ ] White-label options

### Enterprise Features
- [ ] API access
- [ ] Custom integrations
- [ ] Advanced reporting
- [ ] Data export
- [ ] SLA guarantees
- [ ] Dedicated infrastructure

### Integrations
- [ ] QuickBooks
- [ ] Housecall Pro
- [ ] Jobber
- [ ] ServiceTitan
- [ ] Slack
- [ ] WhatsApp Business

### Metrics Target
- 300-500 customers
- $99,500 MRR (~$1.2M ARR)
- 90%+ customer retention
- <5% churn rate

---

## 🔥 Immediate Next Steps (This Week)

1. **Setup development environment**
   - Install dependencies
   - Configure environment variables
   - Test database connection

2. **Start AI Inbox Agent**
   - Gmail API integration
   - Basic email reading
   - Simple auto-reply

3. **Build Leads page**
   - Display leads in a table
   - Add basic filters
   - Create lead detail view

4. **Test OpenAI integration**
   - Message classification
   - Response generation
   - Verify API costs

---

## 📊 Success Metrics

### Week 2
- [ ] Can receive an email
- [ ] AI generates a response
- [ ] Response saves to database

### Week 4
- [ ] Full inbox processing
- [ ] Lead qualification working
- [ ] Quotes can be generated

### Week 6
- [ ] First beta user onboarded
- [ ] System running autonomously
- [ ] User feedback collected

### Month 3
- [ ] 10 paying customers
- [ ] $2,000 MRR
- [ ] Positive testimonials

### Month 6
- [ ] 50+ customers
- [ ] $10,000 MRR
- [ ] Profitable operation

### Month 12
- [ ] 300+ customers
- [ ] $60,000 MRR
- [ ] Team of 2-3 people

---

**Remember:** Ship fast, iterate based on real user feedback, and focus on ONE killer feature at a time!
