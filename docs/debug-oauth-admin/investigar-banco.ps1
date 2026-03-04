$ErrorActionPreference = "Continue"

$PROJECT_ID = "pabxpvqwtvbjaunjejud"
$SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INVESTIGACAO DO BANCO DE DADOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "apikey" = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type" = "application/json"
}

# 1. Profiles
Write-Host "1. PROFILES:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://$PROJECT_ID.supabase.co/rest/v1/profiles?select=count" -Method Head -Headers $headers
    $count = $response.Headers.'Content-Range'
    Write-Host "   Total: $count" -ForegroundColor White
    
    $profiles = Invoke-RestMethod -Uri "https://$PROJECT_ID.supabase.co/rest/v1/profiles?select=id,email,created_at&order=created_at.asc" -Headers $headers
    foreach ($p in $profiles) {
        Write-Host "   - Email: $($p.email), ID: $($p.id)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 2. Subscriptions
Write-Host "2. SUBSCRIPTIONS:" -ForegroundColor Yellow
try {
    $subs = Invoke-RestMethod -Uri "https://$PROJECT_ID.supabase.co/rest/v1/subscriptions?select=id,user_id,status" -Headers $headers
    Write-Host "   Total: $($subs.Count)" -ForegroundColor White
    foreach ($s in $subs) {
        Write-Host "   - ID: $($s.id), User: $($s.user_id), Status: $($s.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. Standalone Purchases
Write-Host "3. STANDALONE PURCHASES:" -ForegroundColor Yellow
try {
    $standalone = Invoke-RestMethod -Uri "https://$PROJECT_ID.supabase.co/rest/v1/standalone_purchases?select=id,user_id,status" -Headers $headers
    Write-Host "   Total: $($standalone.Count)" -ForegroundColor White
} catch {
    Write-Host "   ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 4. Quotes
Write-Host "4. QUOTES:" -ForegroundColor Yellow
try {
    $quotes = Invoke-RestMethod -Uri "https://$PROJECT_ID.supabase.co/rest/v1/quotes?select=id,user_id,status" -Headers $headers
    Write-Host "   Total: $($quotes.Count)" -ForegroundColor White
} catch {
    Write-Host "   ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 5. User Roles
Write-Host "5. USER ROLES:" -ForegroundColor Yellow
try {
    $roles = Invoke-RestMethod -Uri "https://$PROJECT_ID.supabase.co/rest/v1/user_roles?select=user_id,role" -Headers $headers
    Write-Host "   Total: $($roles.Count)" -ForegroundColor White
    foreach ($r in $roles) {
        Write-Host "   - User: $($r.user_id), Role: $($r.role)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INVESTIGACAO COMPLETA" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
