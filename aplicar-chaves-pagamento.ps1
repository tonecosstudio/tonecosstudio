# Script para aplicar migration de chaves de pagamento
# Data: 26/02/2026

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Aplicando Migration: Chaves de Pagamento" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ler o arquivo SQL
$sqlFile = "supabase/migrations/20260226000000_add_payment_keys_settings.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "Arquivo nao encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Arquivo encontrado: $sqlFile" -ForegroundColor Green
Write-Host ""

# Ler conteúdo
$sqlContent = Get-Content $sqlFile -Raw

Write-Host "Conteudo da Migration:" -ForegroundColor Yellow
Write-Host "- 10 configuracoes (5 PIX + 5 links)" -ForegroundColor White
Write-Host "- 3 funcoes SQL" -ForegroundColor White
Write-Host "- Grants para authenticated" -ForegroundColor White
Write-Host ""

Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "1. Abra o Supabase Dashboard" -ForegroundColor White
Write-Host "2. Va para SQL Editor" -ForegroundColor White
Write-Host "3. Cole o SQL abaixo" -ForegroundColor White
Write-Host "4. Clique em RUN" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SQL PARA COPIAR:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host $sqlContent -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Copiar para clipboard
$sqlContent | Set-Clipboard
Write-Host "SQL copiado para a area de transferencia!" -ForegroundColor Green
Write-Host ""
Write-Host "Cole no Supabase Dashboard SQL Editor e execute." -ForegroundColor Yellow
Write-Host ""
Write-Host "Link direto: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql" -ForegroundColor Cyan
