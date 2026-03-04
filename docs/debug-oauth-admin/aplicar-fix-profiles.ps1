# ============================================
# Aplicar Fix de Política de INSERT em Profiles
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CORRIGIR POLITICA DE INSERT EM PROFILES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Criando migration..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$migrationFile = "supabase/migrations/${timestamp}_fix_profiles_insert_policy.sql"

$sql = @"
-- Fix: Adicionar política de INSERT para profiles
-- Permite que usuários criem seus próprios profiles após login OAuth

DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;
CREATE POLICY "users_insert_own_profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
"@

$sql | Out-File -FilePath $migrationFile -Encoding UTF8

Write-Host "Migration criada: $migrationFile" -ForegroundColor Green
Write-Host ""

Write-Host "Aplicando migration..." -ForegroundColor Yellow
npx supabase db push

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CONCLUIDO!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "  1. Faca logout no navegador" -ForegroundColor White
Write-Host "  2. Faca login novamente" -ForegroundColor White
Write-Host "  3. O profile sera criado automaticamente" -ForegroundColor White
