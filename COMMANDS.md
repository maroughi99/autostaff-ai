# AutoStaff AI - Quick Start Commands

## 🚀 First Time Setup

```powershell
# 1. Install all dependencies
npm install

# 2. Create environment files
Copy-Item apps\web\.env.example apps\web\.env.local
Copy-Item apps\api\.env.example apps\api\.env

# 3. Setup database
createdb workbot
cd packages\database
npm run db:generate
npm run db:push
cd ..\..

# 4. Open Prisma Studio to view database
cd packages\database
npm run db:studio
```

## 💻 Daily Development

### Start Both Servers (Recommended)

**Terminal 1 - Frontend:**
```powershell
cd apps\web
npm run dev
```
Opens at: http://localhost:3000

**Terminal 2 - Backend:**
```powershell
cd apps\api
npm run dev
```
Runs at: http://localhost:3001

## 🗄️ Database Commands

```powershell
cd packages\database

# Generate Prisma Client
npm run db:generate

# Push schema changes to database
npm run db:push

# Create a migration
npm run db:migrate

# Open Prisma Studio (visual editor)
npm run db:studio
```

## 🧹 Maintenance Commands

```powershell
# Format all code
npm run format

# Lint all code
npm run lint

# Build everything
npm run build

# Clean build files
npm run clean
```

## 🐛 Troubleshooting

### Kill process on port 3000
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Kill process on port 3001
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process
```

### Reset database
```powershell
dropdb workbot
createdb workbot
cd packages\database
npm run db:push
```

### Reinstall dependencies
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force apps\web\node_modules
Remove-Item -Recurse -Force apps\api\node_modules
Remove-Item -Recurse -Force packages\database\node_modules
npm install
```

## 🔑 Get API Keys

### Clerk (Authentication)
1. Visit: https://clerk.com
2. Create account → New application
3. Copy keys to `apps\web\.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
   CLERK_SECRET_KEY=sk_test_xxxxx
   ```

### OpenAI (AI Features)
1. Visit: https://platform.openai.com
2. Create account → API keys
3. Copy key to `apps\api\.env`:
   ```
   OPENAI_API_KEY=sk-xxxxx
   ```

### Database URL
Update in `apps\api\.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/workbot"
```

## 📦 Useful URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/api
- Prisma Studio: http://localhost:5555
- Clerk Dashboard: https://dashboard.clerk.com
- OpenAI Dashboard: https://platform.openai.com

## 🎯 Quick Tests

### Test API is running
```powershell
curl http://localhost:3001
```

### Test database connection
```powershell
cd packages\database
npm run db:studio
```

### Test frontend
Open http://localhost:3000 in browser

### Test authentication
1. Go to http://localhost:3000
2. Click "Get Started"
3. Sign up with email
4. Check dashboard loads

## 📚 File Locations

### Environment Files
- `apps\web\.env.local` - Frontend config
- `apps\api\.env` - Backend config

### Database Schema
- `packages\database\prisma\schema.prisma`

### Landing Page
- `apps\web\src\app\page.tsx`

### Dashboard
- `apps\web\src\app\dashboard\page.tsx`

### API Routes
- `apps\api\src\` - All backend code

## 🚀 Deploy (Future)

### Frontend (Vercel)
```powershell
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps\web
vercel
```

### Backend (Railway)
```powershell
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway up
```

---

**Pro Tip:** Keep these commands handy! You'll use them constantly during development.
