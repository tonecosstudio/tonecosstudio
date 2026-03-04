# ============================================
# Script PowerShell: Restaurar Admin
# ============================================

$ErrorActionPreference = "Continue"

$PROJECT_ID = "pabxpvqwtvbjaunjejud"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns"
$USER_ID = "19554ce7-161b-4f3b-ba17-e165ad56b3c0"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RESTAURAR ADMIN - Ordax" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

# Passo 1: Verificar status atual
Write-Host "Passo 1: Verificando status atual..." -ForegroundColor Yellow
$body = @{
    _user_id = $USER_ID
    _role = "admin"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://$PROJECT_ID.supabase.co/rest/v1/rpc/has_role" -Method Post -Headers $headers -Body $body
    Write-Host "Status atual: is_admin = $response" -ForegroundColor White
    
    if ($response -eq $true) {
        Write-Host "Usuario JA E ADMIN!" -ForegroundColor Green
        Write-Host "Tente fazer logout e login novamente" -ForegroundColor Yellow
        exit 0
    }
}
catch {
    Write-Host "Erro ao verificar: $($_.Exception.Message)" -ForegroundColor Red
}

# Passo 2: Inserir role
Write-Host ""
Write-Host "Passo 2: Inserindo role de admin..." -ForegroundColor Yellow
$insertHeaders = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

$insertBody = @{
    user_id = $USER_ID
    role = "admin"
} | ConvertTo-Json

try {
    $insertResponse = Invoke-RestMethod -Uri "https://$PROJECT_ID.supabase.co/rest/v1/user_roles" -Method Post -Headers $insertHeaders -Body $insertBody
    Write-Host "Role inserida com sucesso!" -ForegroundColor Green
    Write-Host "ID: $($insertResponse.id)" -ForegroundColor Gray
}
catch {
    Write-Host "Erro ao inserir (pode ja existir): $($_.Exception.Message)" -ForegroundColor Yellow
}

# Passo 3: Verificar novamente
Write-Host ""
Write-Host "Passo 3: Verificando novamente..." -ForegroundColor Yellow
try {
    $verifyResponse = Invoke-RestMethod -Uri "https://$PROJECT_ID.supabase.co/rest/v1/rpc/has_role" -Method Post -Headers $headers -Body $body
    
    if ($verifyResponse -eq $true) {
        Write-Host "SUCESSO! Usuario agora e ADMIN!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Proximos passos:" -ForegroundColor Cyan
        Write-Host "  1. Faca logout no navegador" -ForegroundColor White
        Write-Host "  2. Faca login novamente" -ForegroundColor White
    }
    else {
        Write-Host "FALHA: Usuario ainda NAO e admin" -ForegroundColor Red
    }
}
catch {
    Write-Host "Erro ao verificar: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
