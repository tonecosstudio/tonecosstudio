# Script to apply pg_cron migration and test it
# Task 12.1: Set up pg_cron extension

Write-Host "=== Applying pg_cron Infrastructure Migration ===" -ForegroundColor Cyan
Write-Host ""

# Read the migration file
$migrationContent = Get-Content "supabase/migrations/20260402000000_setup_pg_cron_infrastructure.sql" -Raw

# Apply the migration using Supabase CLI
Write-Host "Applying migration..." -ForegroundColor Yellow
$migrationContent | npx supabase db execute

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Migration applied successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Run tests
    Write-Host "Running verification tests..." -ForegroundColor Yellow
    Get-Content "test-pg-cron-setup.sql" -Raw | npx supabase db execute
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Success: All tests passed!" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "Error: Some tests failed" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "Error: Migration failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Migration Complete ===" -ForegroundColor Cyan
