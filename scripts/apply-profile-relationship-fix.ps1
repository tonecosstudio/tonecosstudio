# Script to apply profile relationship fixes to Supabase database
# This fixes the foreign key relationships so Supabase can properly join with profiles

Write-Host "🔧 Applying profile relationship fixes..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI is not installed" -ForegroundColor Red
    Write-Host "Please install it first: https://supabase.com/docs/guides/cli"
    exit 1
}

# Check if we're in a Supabase project
if (-not (Test-Path "supabase/config.toml")) {
    Write-Host "❌ Not in a Supabase project directory" -ForegroundColor Red
    Write-Host "Please run this script from the project root"
    exit 1
}

Write-Host "📋 Migrations to apply:" -ForegroundColor Yellow
Write-Host "  1. 20260421000000_fix_standalone_purchases_profile_relationship.sql"
Write-Host "  2. 20260421000001_fix_manual_payments_profile_relationship.sql"
Write-Host ""

# Apply migrations
Write-Host "🚀 Applying migrations..." -ForegroundColor Cyan
supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migrations applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Changes made:" -ForegroundColor Yellow
    Write-Host "  • standalone_purchases.user_id now references profiles(id)"
    Write-Host "  • manual_payments.user_id now references profiles(id)"
    Write-Host ""
    Write-Host "🔄 Please refresh your browser to see the changes" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Migration failed" -ForegroundColor Red
    Write-Host "Please check the error messages above"
    exit 1
}
