# ============================================
# Script PowerShell: Corrigir Política de INSERT em Profiles
# ============================================

$ErrorActionPreference = "Continue"

$PROJECT_ID = "pabxpvqwtvbjaunjejud"
$SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CORRIGIR POLITICA DE INSERT EM PROFILES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$sql = @"
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;
CREATE POLICY "users_insert_own_profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
"@

Write-Host "Executando SQL..." -ForegroundColor Yellow

$headers = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    query = $sql
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://$PROJECT_ID.supabase.co/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body
    Write-Host "SUCESSO! Politica de INSERT criada" -ForegroundColor Green
}
catch {
    Write-Host "Erro ao executar SQL: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Execute manualmente no Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host $sql -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
