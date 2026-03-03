# Apply production migrations using Supabase Management API
# This script applies the 5 production migrations in order

$ErrorActionPreference = "Stop"

# Load environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"')
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

$supabaseUrl = $env:VITE_SUPABASE_URL
$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl -or -not $serviceKey) {
    Write-Error "Missing Supabase credentials in .env file"
    exit 1
}

$migrations = @(
    "supabase/migrations/20260428000000_create_production_queue.sql",
    "supabase/migrations/20260428000001_create_character_choices.sql",
    "supabase/migrations/20260428000002_create_production_stages.sql",
    "supabase/migrations/20260428000003_create_production_views.sql",
    "supabase/migrations/20260428000004_create_production_functions.sql"
)

Write-Host "Starting production migrations...`n" -ForegroundColor Cyan

foreach ($migration in $migrations) {
    $migrationName = Split-Path $migration -Leaf
    Write-Host "Applying $migrationName..." -ForegroundColor Yellow
    
    try {
        $sql = Get-Content $migration -Raw
        
        # Use Supabase REST API to execute SQL
        $headers = @{
            "Content-Type" = "application/json"
            "apikey" = $serviceKey
            "Authorization" = "Bearer $serviceKey"
        }
        
        $body = @{
            query = $sql
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body -ErrorAction Stop
        
        Write-Host "✅ Successfully applied $migrationName`n" -ForegroundColor Green
    }
    catch {
        Write-Error "❌ Error applying $migrationName : $_"
        exit 1
    }
}

Write-Host "✅ All production migrations applied successfully!" -ForegroundColor Green
