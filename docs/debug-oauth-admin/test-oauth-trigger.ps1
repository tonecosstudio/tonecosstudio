#!/usr/bin/env pwsh
# Script para testar o trigger de criação de profile

$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns"
$projectUrl = "https://pabxpvqwtvbjaunjejud.supabase.co"

$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
}

Write-Host "=== TESTE DO TRIGGER DE PROFILE ===" -ForegroundColor Cyan

# 1. Criar usuário de teste
Write-Host "`n[1/4] Criando usuario de teste..." -ForegroundColor Yellow

$testEmail = "teste-oauth-$(Get-Random)@example.com"
$createUserBody = @{
    email = $testEmail
    password = "Test123456!"
    email_confirm = $true
} | ConvertTo-Json

try {
    $user = Invoke-RestMethod -Uri "$projectUrl/auth/v1/admin/users" -Method Post -Headers $headers -Body $createUserBody
    $userId = $user.id
    Write-Host "  OK: Usuario criado com ID: $userId" -ForegroundColor Green
} catch {
    Write-Host "  ERRO ao criar usuario: $_" -ForegroundColor Red
    exit 1
}

# 2. Aguardar trigger executar
Write-Host "`n[2/4] Aguardando trigger executar..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# 3. Verificar se profile foi criado
Write-Host "`n[3/4] Verificando se profile foi criado..." -ForegroundColor Yellow

try {
    $profile = Invoke-RestMethod -Uri "$projectUrl/rest/v1/profiles?id=eq.$userId&select=*" -Method Get -Headers $headers
    
    if ($profile.Count -gt 0) {
        Write-Host "  OK: Profile criado com sucesso!" -ForegroundColor Green
        Write-Host "  Email: $($profile[0].email)" -ForegroundColor Green
    } else {
        Write-Host "  ERRO: Profile NAO foi criado!" -ForegroundColor Red
        Write-Host "  O trigger pode nao estar funcionando corretamente" -ForegroundColor Red
    }
} catch {
    Write-Host "  ERRO ao verificar profile: $_" -ForegroundColor Red
}

# 4. Limpar usuario de teste
Write-Host "`n[4/4] Limpando usuario de teste..." -ForegroundColor Yellow

try {
    Invoke-RestMethod -Uri "$projectUrl/auth/v1/admin/users/$userId" -Method Delete -Headers $headers | Out-Null
    Write-Host "  OK: Usuario removido" -ForegroundColor Green
} catch {
    Write-Host "  AVISO: Nao foi possivel remover usuario de teste" -ForegroundColor Yellow
}

Write-Host "`n=== TESTE CONCLUIDO ===" -ForegroundColor Cyan
