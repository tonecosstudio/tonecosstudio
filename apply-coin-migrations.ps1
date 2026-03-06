# ============================================================================
# Script: Apply Coin System Migrations to Supabase (PowerShell)
# Description: Aplica migrations do sistema de coins no Supabase
# Author: System
# Date: 2026-05-12
# ============================================================================

Write-Host "🚀 Starting Coin System Migration..." -ForegroundColor Blue
Write-Host ""

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "Create .env file with SUPABASE_URL and SUPABASE_ANON_KEY"
    exit 1
}

# Load environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2]
        Set-Variable -Name $name -Value $value -Scope Script
    }
}

# Check if required variables are set
if (-not $SUPABASE_URL -or -not $SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "❌ Missing required environment variables" -ForegroundColor Red
    Write-Host "Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    exit 1
}

Write-Host "📋 Migrations to apply:" -ForegroundColor Blue
Write-Host "  1. 20260512000000_create_coin_system.sql"
Write-Host "  2. 20260512000001_create_coin_functions.sql"
Write-Host "  3. 20260512000002_update_user_characters_for_coins.sql"
Write-Host ""

Write-Host "⚠️  This will modify your Supabase database" -ForegroundColor Yellow
Write-Host "⚠️  Make sure you have a backup if needed" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Continue? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "Migration cancelled"
    exit 0
}

Write-Host ""
Write-Host "🔄 Applying migrations..." -ForegroundColor Blue
Write-Host ""

# Function to execute SQL file
function Invoke-SqlFile {
    param (
        [string]$FilePath,
        [string]$Description
    )
    
    Write-Host "📦 $Description..." -ForegroundColor Blue
    
    $sql = Get-Content $FilePath -Raw
    
    $body = @{
        query = $sql
    } | ConvertTo-Json
    
    $headers = @{
        "apikey" = $SUPABASE_SERVICE_ROLE_KEY
        "Authorization" = "Bearer $SUPABASE_SERVICE_ROLE_KEY"
        "Content-Type" = "application/json"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body
        Write-Host "✅ $Description completed" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        exit 1
    }
}

# Apply migrations
Invoke-SqlFile -FilePath "supabase/migrations/20260512000000_create_coin_system.sql" -Description "Creating coin system tables"
Invoke-SqlFile -FilePath "supabase/migrations/20260512000001_create_coin_functions.sql" -Description "Creating coin functions"
Invoke-SqlFile -FilePath "supabase/migrations/20260512000002_update_user_characters_for_coins.sql" -Description "Updating user_characters table"

Write-Host "🎉 All migrations applied successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Blue
Write-Host "  ✅ user_coins table created"
Write-Host "  ✅ coin_transactions table created"
Write-Host "  ✅ coin_packages table created"
Write-Host "  ✅ Initial coin packages inserted"
Write-Host "  ✅ RLS policies configured"
Write-Host "  ✅ Coin functions created"
Write-Host "  ✅ user_characters updated for coin purchases"
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update frontend hooks to use real data (remove mocks)"
Write-Host "  2. Integrate payment gateway (PIX/Stripe)"
Write-Host "  3. Test coin purchase flow end-to-end"
Write-Host ""
Write-Host "✨ Coin system is ready to use!" -ForegroundColor Green
