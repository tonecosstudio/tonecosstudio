# =====================================================
# LIMPEZA FINAL DO PROJETO
# Remove arquivos temporários e organiza estrutura
# =====================================================

Write-Host "🧹 INICIANDO LIMPEZA PROFISSIONAL..." -ForegroundColor Cyan
Write-Host ""

# Arquivos temporários de teste para mover
$testFiles = @(
    "TESTE_RAPIDO.sql",
    "TESTE_2_CHECKLIST.md",
    "COMO_EXECUTAR_TESTE.md"
)

# Arquivos temporários para remover (obsoletos)
$obsoleteFiles = @(
    "PROXIMOS_PASSOS.md",
    "check-production-data.sql",
    "seed-production-queue.sql",
    "COPIE_E_COLE_NO_SUPABASE.txt"
)

# Mover arquivos de teste para scripts/diagnostics/
Write-Host "📦 Movendo arquivos de teste..." -ForegroundColor Yellow
foreach ($file in $testFiles) {
    if (Test-Path $file) {
        $destination = "scripts/diagnostics/$file"
        Move-Item -Path $file -Destination $destination -Force
        Write-Host "  ✅ Movido: $file → scripts/diagnostics/" -ForegroundColor Green
    }
}
Write-Host ""

# Remover arquivos obsoletos
Write-Host "🗑️  Removendo arquivos obsoletos..." -ForegroundColor Yellow
foreach ($file in $obsoleteFiles) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force
        Write-Host "  ✅ Removido: $file" -ForegroundColor Green
    }
}
Write-Host ""

# Criar README na raiz se não existir ou atualizar
Write-Host "📝 Atualizando README.md..." -ForegroundColor Yellow
$readmeExists = Test-Path "README.md"
if ($readmeExists) {
    Write-Host "  ℹ️  README.md já existe (não sobrescrito)" -ForegroundColor Cyan
} else {
    Write-Host "  ✅ README.md seria criado aqui" -ForegroundColor Green
}
Write-Host ""

# Resumo
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ LIMPEZA CONCLUÍDA!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Arquivos movidos: $($testFiles.Count)" -ForegroundColor White
Write-Host "Arquivos removidos: $($obsoleteFiles.Count)" -ForegroundColor White
Write-Host ""
Write-Host "Estrutura organizada profissionalmente! 🎉" -ForegroundColor Green
