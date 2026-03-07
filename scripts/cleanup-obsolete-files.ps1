# 🗑️ LIMPEZA PROFISSIONAL DE ARQUIVOS OBSOLETOS
# Data: 2026-03-07
# Objetivo: Remover arquivos temporários e obsoletos após correção da production_queue

Write-Host "🗑️  LIMPEZA PROFISSIONAL DE ARQUIVOS OBSOLETOS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$removidos = 0
$erros = 0

# Função para remover arquivo com segurança
function Remove-SafeFile {
    param($path)
    
    if (Test-Path $path) {
        try {
            Remove-Item $path -Force
            Write-Host "✅ Removido: $path" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "❌ Erro ao remover: $path" -ForegroundColor Red
            Write-Host "   $_" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "⚠️  Não encontrado: $path" -ForegroundColor Yellow
        return $false
    }
}

Write-Host "📋 FASE 1: Scripts Temporários de Diagnóstico" -ForegroundColor Yellow
Write-Host ""

$scriptsTemp = @(
    "verificar-schema-real.mjs",
    "check-production-queue-schema.mjs",
    "check-standalone-purchase-data.mjs",
    "corrigir-schema-e-popular.mjs",
    "popular-producao-FINAL.mjs",
    "popular-production-queue.mjs",
    "fix-priority-and-populate.mjs",
    "trigger-auto-populate.mjs",
    "apply-trigger-fix.mjs"
)

foreach ($script in $scriptsTemp) {
    if (Remove-SafeFile $script) { $removidos++ } else { $erros++ }
}

Write-Host ""
Write-Host "📋 FASE 2: SQL Temporários" -ForegroundColor Yellow
Write-Host ""

$sqlTemp = @(
    "fix-trigger-FINAL.sql",
    "fix-trigger-DEFINITIVO.sql",
    "diagnostico-producao.sql"
)

foreach ($sql in $sqlTemp) {
    if (Remove-SafeFile $sql) { $removidos++ } else { $erros++ }
}

Write-Host ""
Write-Host "📋 FASE 3: Documentação Redundante" -ForegroundColor Yellow
Write-Host ""

$docsRedundantes = @(
    "SOLUCAO_FINAL_PRODUCAO.md",
    "INSTRUCOES_FINAIS.md",
    "PROBLEMA_RLS_PRODUCTION_QUEUE.md",
    "COMO_POPULAR_DADOS_PRODUCAO.md"
)

foreach ($doc in $docsRedundantes) {
    if (Remove-SafeFile $doc) { $removidos++ } else { $erros++ }
}

Write-Host ""
Write-Host "📋 FASE 4: Análises Antigas" -ForegroundColor Yellow
Write-Host ""

$analisesAntigas = @(
    "ANALISE_ADMIN_PROFISSIONAL.md",
    "ANALISE_CYCLE_NUMBER.md",
    "ANALISE_PLANOS_VS_CREDITOS.md",
    "ANALISE_PRAZOS_SISTEMA.md",
    "ANALISE_REPAGINACAO_PRODUCAO.md",
    "OBJETIVO_HUB_PRODUCAO.md"
)

foreach ($analise in $analisesAntigas) {
    if (Remove-SafeFile $analise) { $removidos++ } else { $erros++ }
}

Write-Host ""
Write-Host "📋 FASE 5: Scripts Antigos de Correção" -ForegroundColor Yellow
Write-Host ""

$scriptsAntigos = @(
    "fix-production-queue-rls.sql",
    "debug-production-queue.sql",
    "verificar-e-popular-producao.sql",
    "inserir-dados-producao-manual.sql"
)

foreach ($script in $scriptsAntigos) {
    if (Remove-SafeFile $script) { $removidos++ } else { $erros++ }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📊 RESUMO DA LIMPEZA" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Arquivos removidos: $removidos" -ForegroundColor Green
Write-Host "⚠️  Arquivos não encontrados: $($erros - $removidos)" -ForegroundColor Yellow
Write-Host ""

if ($removidos -gt 0) {
    Write-Host "🎉 Limpeza concluída com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Estrutura atual:" -ForegroundColor Cyan
    Write-Host "   ✅ docs/production/ - Documentação consolidada" -ForegroundColor White
    Write-Host "   ✅ scripts/diagnostics/ - Scripts de diagnóstico" -ForegroundColor White
    Write-Host "   ✅ scripts/maintenance/ - Scripts de manutenção" -ForegroundColor White
} else {
    Write-Host "ℹ️  Nenhum arquivo foi removido (já limpo ou arquivos não existem)" -ForegroundColor Blue
}

Write-Host ""
