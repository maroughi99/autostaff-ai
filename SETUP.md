# AutoStaff AI - Setup Instructions

## 🚀 Quick Start Guide

### Prerequisites

Make sure you have the following installed:
- Node.js 18+ (https://nodejs.org/)
- PostgreSQL (https://www.postgresql.org/download/)
- Redis (https://redis.io/download)
- Git

### 1. Install Dependencies

```bash
cd c:\Users\Tony\Desktop\Scripts\AIGenerator
npm install
```

### 2. Setup Environment Variables

#### Frontend (.env file in apps/web/)

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### Backend (.env file in apps/api/)

Create `apps/api/.env`:

```env
PORT=3001
DATABASE_URL="postgresql://postgres:password@localhost:5432/workbot"
FRONTEND_URL="http://localhost:3000"

OPENAI_API_KEY=your_openai_api_key

REDIS_URL="redis://localhost:6379"
```

### 3. Setup Clerk Authentication

1. Go to https://clerk.com and create an account
2. Create a new application
3. Copy your publishable key and secret key
4. Paste them into `apps/web/.env.local`

### 4. Setup Database

```bash
# Start PostgreSQL (if not running)
# Create database
createdb workbot

# Generate Prisma client
cd packages/database
npm run db:generate

# Push schema to database
npm run db:push
```

### 5. Start Development Servers

Open 2 terminal windows:

#### Terminal 1 - Frontend
```bash
cd apps/web
npm run dev
```
Frontend will run on http://localhost:3000

#### Terminal 2 - Backend
```bash
cd apps/api
npm run dev
```
Backend will run on http://localhost:3001

### 6. Access the Application

- Landing Page: http://localhost:3000
- Sign Up: http://localhost:3000/sign-up
- Dashboard: http://localhost:3000/dashboard (after signing in)
- API Health: http://localhost:3001

## 📦 Project Structure

```
AIGenerator/
├── apps/
│   ├── web/              # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/      # App router pages
│   │   │   ├── components/ # React components
│   │   │   └── lib/      # Utilities
│   │   └── package.json
│   │
│   └── api/              # NestJS backend
│       ├── src/
│       │   ├── auth/     # Authentication module
│       │   ├── leads/    # Lead management
│       │   ├── messages/ # Message handling
│       │   ├── quotes/   # Quote generation
│       │   └── ai/       # AI services
│       └── package.json
│
├── packages/
│   └── database/         # Prisma schema & client
│       ├── prisma/
│       │   └── schema.prisma
│       └── package.json
│
└── turbo.json           # Turborepo config
```

## 🔑 Get API Keys

### OpenAI API
1. Go to https://platform.openai.com/
2. Create an account
3. Generate API key
4. Add to `apps/api/.env`

### Clerk Auth
1. Go to https://clerk.com
2. Create application
3. Copy keys to `apps/web/.env.local`

### Gmail API (Optional - for email integration)
1. Go to https://console.cloud.google.com/
2. Create project
3. Enable Gmail API
4. Create OAuth credentials
5. Add to `apps/api/.env`

### Twilio (Optional - for SMS)
1. Go to https://www.twilio.com/
2. Create account
3. Get Account SID and Auth Token
4. Add to `apps/api/.env`

## 🛠️ Development Commands

```bash
# Install all dependencies
npm install

# Run both frontend and backend
npm run dev

# Build all apps
npm run build

# Lint all code
npm run lint

# Format code
npm run format

# Database commands
cd packages/database
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to DB
npm run db:studio      # Open Prisma Studio
npm run db:migrate     # Create migration
```

## 📊 Database Management

```bash
# Open Prisma Studio (visual DB editor)
cd packages/database
npm run db:studio
```

Access at http://localhost:5555

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Kill process on port 3001
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process
```

### Database connection error
- Make sure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists: `psql -l`

### Prisma errors
```bash
cd packages/database
npm run db:generate
```

## 🎯 Next Steps

1. **Phase 1 Complete** ✅
   - Project structure created
   - Frontend with Next.js + Tailwind + ShadCN
   - Backend with NestJS
   - Database schema with Prisma
   - Authentication with Clerk
   - Landing page and dashboard shell

2. **Phase 2 - Build MVP Features**
   - AI Inbox Agent (email reading & auto-reply)
   - Lead Handler (qualification & booking)
   - Simple CRM with drag-drop pipeline
   - Quote Generator with AI
   - Follow-up automation

3. **Phase 3 - Beta Launch**
   - Onboarding flow
   - Email/calendar integrations
   - Get first 5-10 beta users

## 📝 Notes

- Frontend runs on port 3000
- Backend runs on port 3001
- Database: PostgreSQL on default port 5432
- Redis: Default port 6379

## 🚀 Deployment (Future)

- Frontend: Vercel
- Backend: Railway, Render, or AWS
- Database: Supabase, Railway, or AWS RDS
- Redis: Upstash or Redis Cloud

---

Built with ❤️ using Next.js, NestJS, and Prisma
