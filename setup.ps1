# AutoStaff AI - Quick Setup Script
# Run this script from the root directory

Write-Host "AutoStaff AI Setup Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js not found! Please install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
try {
    $pgVersion = psql --version
    Write-Host "  PostgreSQL installed" -ForegroundColor Green
} catch {
    Write-Host "  WARNING: PostgreSQL not found. You'll need it for the database." -ForegroundColor Red
    Write-Host "  Download from: https://www.postgresql.org/download/" -ForegroundColor Yellow
}

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes..." -ForegroundColor Gray
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "  SUCCESS: Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Check for environment files
Write-Host ""
Write-Host "Checking environment files..." -ForegroundColor Yellow

$webEnv = "apps\web\.env.local"
$apiEnv = "apps\api\.env"

if (-not (Test-Path $webEnv)) {
    Write-Host "  WARNING: Missing: $webEnv" -ForegroundColor Red
    Write-Host "  Creating from template..." -ForegroundColor Yellow
    Copy-Item "apps\web\.env.example" $webEnv
    Write-Host "  SUCCESS: Created $webEnv - Please add your API keys!" -ForegroundColor Green
} else {
    Write-Host "  OK: Found: $webEnv" -ForegroundColor Green
}

if (-not (Test-Path $apiEnv)) {
    Write-Host "  WARNING: Missing: $apiEnv" -ForegroundColor Red
    Write-Host "  Creating from template..." -ForegroundColor Yellow
    Copy-Item "apps\api\.env.example" $apiEnv
    Write-Host "  SUCCESS: Created $apiEnv - Please add your API keys!" -ForegroundColor Green
} else {
    Write-Host "  OK: Found: $apiEnv" -ForegroundColor Green
}

# Database setup
Write-Host ""
Write-Host "Database setup..." -ForegroundColor Yellow
Write-Host "  Run these commands manually:" -ForegroundColor Gray
Write-Host "  1. createdb workbot" -ForegroundColor Gray
Write-Host "  2. cd packages\database" -ForegroundColor Gray
Write-Host "  3. npm run db:generate" -ForegroundColor Gray
Write-Host "  4. npm run db:push" -ForegroundColor Gray

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Get API Keys:" -ForegroundColor White
Write-Host "   - Clerk: https://clerk.com" -ForegroundColor Gray
Write-Host "   - OpenAI: https://platform.openai.com" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Update Environment Files:" -ForegroundColor White
Write-Host "   - apps\web\.env.local" -ForegroundColor Gray
Write-Host "   - apps\api\.env" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Setup Database:" -ForegroundColor White
Write-Host "   createdb workbot" -ForegroundColor Gray
Write-Host "   cd packages\database" -ForegroundColor Gray
Write-Host "   npm run db:generate" -ForegroundColor Gray
Write-Host "   npm run db:push" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Start Development:" -ForegroundColor White
Write-Host "   Terminal 1: cd apps\web && npm run dev" -ForegroundColor Gray
Write-Host "   Terminal 2: cd apps\api && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Read START_HERE.md for detailed instructions" -ForegroundColor Yellow
Write-Host ""
Write-Host "Happy coding!" -ForegroundColor Green
Write-Host ""
