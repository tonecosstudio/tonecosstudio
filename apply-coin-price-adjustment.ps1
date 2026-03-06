# ============================================================================
# Script: Aplicar Ajuste de Preços de Coins (PowerShell)
# Descrição: Aplica migration para ajustar preços de 800-1800 para 200-450
# Data: 2026-03-06
# ============================================================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "AJUSTE DE PREÇOS DO SISTEMA DE COINS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script irá:"
Write-Host "1. Atualizar preços base de 1000/1400/1800 para 250/300/450"
Write-Host "2. Criar tabela collection_pricing_by_context"
Write-Host "3. Atualizar função get_collection_price()"
Write-Host "4. Validar novos cálculos"
Write-Host ""
Write-Host "Valores ANTIGOS → NOVOS:" -ForegroundColor Yellow
Write-Host "- Coleção Ativa: 800 → 200 coins"
Write-Host "- Coleção Secundária: 1200 → 240 coins"
Write-Host "- Catálogo Geral: 1400 → 300 coins"
Write-Host "- Premium: 1800 → 450 coins"
Write-Host ""

$confirm = Read-Host "Deseja continuar? (s/n)"

if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "Operação cancelada." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Aplicando migration..." -ForegroundColor Yellow
Write-Host ""

# Aplicar migration via Supabase CLI
supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "✅ MIGRATION APLICADA COM SUCESSO!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos passos:"
    Write-Host "1. Acesse /admin/coins para verificar os novos valores"
    Write-Host "2. Teste compras com coins"
    Write-Host "3. Valide cálculos em diferentes contextos"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host "❌ ERRO AO APLICAR MIGRATION" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique os logs acima para mais detalhes."
    exit 1
}
