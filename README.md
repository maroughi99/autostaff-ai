# AutoStaff AI - AI Employee Platform

An intelligent automation platform that acts as an AI employee for contractors and service businesses.

## Features

- 🤖 AI Inbox Agent - Automatically reads and responds to customer messages
- 📧 Lead Handler - Qualifies leads and books appointments
- 📊 Smart CRM - Visual pipeline for managing customer interactions
- 💰 Quote Generator - AI-powered quote creation and delivery
- 🔄 Follow-Up Agent - Automated customer follow-ups

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, ShadCN UI
- **Backend**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: Redis + BullMQ
- **AI**: OpenAI API
- **Auth**: Clerk
- **Email**: Gmail API
- **SMS**: Twilio
- **Calendar**: Google Calendar API

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Project Structure

```
.
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── ui/           # Shared UI components
│   ├── database/     # Prisma schema and client

│   └── config/       # Shared configuration
└── turbo.json        # Turborepo config
```

## License

MIT
