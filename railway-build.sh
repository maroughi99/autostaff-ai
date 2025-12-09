#!/bin/bash
# Railway deployment script

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating Prisma Client..."
cd packages/database
npx prisma generate
cd ../..

echo "🔄 Running database migrations..."
cd packages/database
npx prisma migrate deploy
cd ../..

echo "🏗️ Building API..."
cd apps/api
npm run build

echo "✅ Build complete!"
