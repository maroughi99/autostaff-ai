# AutoStaffAI Test Warden Runner
# Quick launcher for production testing

Write-Host ""
Write-Host "🛡️  AutoStaffAI Test Warden" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Gray
Write-Host ""

# Check if Node.js is installed
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green

# Load environment variables if file exists
if (Test-Path ".env.test.local") {
    Write-Host "✓ Loading test configuration from .env.test.local" -ForegroundColor Green
    Get-Content .env.test.local | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($value -and -not $value.StartsWith('#')) {
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
    }
} else {
    Write-Host "⚠️  No .env.test.local file found (optional)" -ForegroundColor Yellow
    Write-Host "   Create it from .env.test for authenticated testing" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Select test mode:" -ForegroundColor Cyan
Write-Host "  1. Full Test Suite (recommended)" -ForegroundColor White
Write-Host "  2. Quick Health Check" -ForegroundColor White
Write-Host "  3. Continuous Monitoring (every 5 min)" -ForegroundColor White
Write-Host "  4. Exit" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Enter choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚀 Running full test suite..." -ForegroundColor Green
        node test-production.js
    }
    "2" {
        Write-Host ""
        Write-Host "⚡ Running quick health check..." -ForegroundColor Green
        node test-production.js --quick
    }
    "3" {
        Write-Host ""
        Write-Host "🔄 Starting continuous monitoring..." -ForegroundColor Green
        Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
        node test-production.js --continuous
    }
    "4" {
        Write-Host "Goodbye! 👋" -ForegroundColor Gray
        exit 0
    }
    default {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
