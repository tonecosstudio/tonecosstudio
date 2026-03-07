# Script de Limpeza Profissional do Projeto
# Remove arquivos obsoletos e organiza documentação

Write-Host "🧹 LIMPEZA PROFISSIONAL DO PROJETO" -ForegroundColor Cyan
Write-Host "=" * 80

# ============================================================================
# FASE 1: Remover Arquivos Temporários de Diagnóstico
# ============================================================================

Write-Host "`n📦 FASE 1: Removendo scripts temporários..." -ForegroundColor Yellow

$tempScripts = @(
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

foreach ($file in $tempScripts) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  ✓ Removido: $file" -ForegroundColor Green
    }
}

# ============================================================================
# FASE 2: Remover SQL Temporários
# ============================================================================

Write-Host "`n📄 FASE 2: Removendo SQL temporários..." -ForegroundColor Yellow

$tempSQL = @(
    "fix-trigger-FINAL.sql",
    "fix-trigger-DEFINITIVO.sql",
    "diagnostico-producao.sql",
    "fix-production-queue-rls.sql",
    "debug-production-queue.sql",
    "verificar-e-popular-producao.sql",
    "inserir-dados-producao-manual.sql"
)

foreach ($file in $tempSQL) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  ✓ Removido: $file" -ForegroundColor Green
    }
}

# ============================================================================
# FASE 3: Remover Documentação Obsoleta
# ============================================================================

Write-Host "`n📚 FASE 3: Removendo documentação obsoleta..." -ForegroundColor Yellow

$obsoleteDocs = @(
    "ANALISE_ADMIN_PROFISSIONAL.md",
    "ANALISE_CYCLE_NUMBER.md",
    "ANALISE_PLANOS_VS_CREDITOS.md",
    "ANALISE_PRAZOS_SISTEMA.md",
    "ANALISE_REPAGINACAO_PRODUCAO.md",
    "ATUALIZACAO_PRODUCAO.md",
    "CATEGORIAS_PERSONAGENS.md",
    "COMO_POPULAR_DADOS_PRODUCAO.md",
    "COMPARACAO_ADMIN_ANTES_DEPOIS.md",
    "CONSOLIDACAO_PLANOS_CREDITOS.md",
    "FLUXO_OFICIAL_PRAZOS.md",
    "INSTRUCOES_FINAIS.md",
    "LIMPEZA_COMPLETA.md",
    "LIMPEZA_DUPLICACAO_PRECOS.md",
    "LIMPEZA_FINAL_ADMIN.md",
    "LIMPEZA_FINAL_RESUMO.md",
    "LIMPEZA_PRICING_MANAGEMENT.md",
    "MELHORIA_PERSONAGENS_COINS.md",
    "OBJETIVO_HUB_PRODUCAO.md",
    "PAGINAS_SEM_ATALHO_SIDEBAR.md",
    "PLANO_ACAO_ADMIN.md",
    "PROBLEMA_RLS_PRODUCTION_QUEUE.md",
    "REFATORACAO_ADMIN_CONCLUIDA.md",
    "REFATORACAO_CICLOS_MENSAIS.md",
    "REFATORACAO_COMPLETA_CICLOS.md",
    "REFATORACAO_PROFISSIONAL.md",
    "REMOCAO_CAPACITY_MANAGEMENT.md",
    "REMOCAO_FRANQUIAS_MODELOS.md",
    "REPAGINACAO_PRODUCAO_PROGRESSO.md",
    "RESUMO_COMPLETO_FINAL.md",
    "RESUMO_EXECUTIVO_FINAL.md",
    "RESUMO_FINAL_PRAZOS.md",
    "RESUMO_REFATORACAO_VISUAL.md",
    "SINGLE_SOURCE_OF_TRUTH_PRAZOS.md",
    "SOLUCAO_FINAL_PRODUCAO.md",
    "STATUS_PROJETO.md",
    "STATUS_REMOCAO_CAPACITY.md"
)

foreach ($file in $obsoleteDocs) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  ✓ Removido: $file" -ForegroundColor Green
    }
}

# ============================================================================
# FASE 4: Mover Scripts Úteis
# ============================================================================

Write-Host "`n📦 FASE 4: Organizando scripts úteis..." -ForegroundColor Yellow

# Criar diretórios se não existirem
New-Item -ItemType Directory -Force -Path "scripts/diagnostics" | Out-Null
New-Item -ItemType Directory -Force -Path "scripts/maintenance" | Out-Null

# Mover scripts de diagnóstico
$diagnosticScripts = @(
    "diagnostico-producao.mjs",
    "solucao-profissional-producao.mjs",
    "correcao-definitiva-FINAL.mjs"
)

foreach ($file in $diagnosticScripts) {
    if (Test-Path $file) {
        Move-Item $file "scripts/diagnostics/" -Force
        Write-Host "  ✓ Movido: $file → scripts/diagnostics/" -ForegroundColor Green
    }
}

# Mover scripts de manutenção
$maintenanceScripts = @(
    "aplicar-correcoes-FINAL.mjs"
)

foreach ($file in $maintenanceScripts) {
    if (Test-Path $file) {
        Move-Item $file "scripts/maintenance/" -Force
        Write-Host "  ✓ Movido: $file → scripts/maintenance/" -ForegroundColor Green
    }
}

# ============================================================================
# FASE 5: Organizar Documentação
# ============================================================================

Write-Host "`n📚 FASE 5: Organizando documentação..." -ForegroundColor Yellow

# Criar diretório de documentação
New-Item -ItemType Directory -Force -Path "docs/production" | Out-Null

# Criar README consolidado
$readmeContent = @"
# 📚 Documentação do Sistema de Produção

## 📋 Documentos Principais

### Correção de Março 2026
- **CORRECAO_COMPLETA_PRODUCAO.md** - Análise técnica detalhada da correção
- **MANUTENCAO_PRODUCAO.md** - Guia de manutenção do sistema

### Planos e Status
- **PLANO_SINCRONIA_COMPLETO.md** - Plano de sincronização de páginas
- **DOCS_INDEX.md** - Índice geral da documentação

## 🔧 Scripts Úteis

### Diagnóstico
- `scripts/diagnostics/diagnostico-producao.mjs` - Diagnóstico do sistema
- `scripts/diagnostics/solucao-profissional-producao.mjs` - Análise profunda
- `scripts/diagnostics/correcao-definitiva-FINAL.mjs` - Identificação de schema

### Manutenção
- `scripts/maintenance/aplicar-correcoes-FINAL.mjs` - Aplicação de correções

## 📊 Status Atual

- ✅ Production Queue: Funcionando
- ✅ Hub de Produção: Atualizado
- ✅ Triggers: Corrigidos
- ✅ Documentação: Organizada

## 🚀 Próximos Passos

1. Verificar páginas relacionadas (PaymentVerification, AdminUsers)
2. Sincronizar schema com banco real
3. Adicionar testes automatizados

---

*Última atualização: $(Get-Date -Format "yyyy-MM-dd")*
"@

Set-Content -Path "docs/production/README.md" -Value $readmeContent
Write-Host "  ✓ Criado: docs/production/README.md" -ForegroundColor Green

# ============================================================================
# RESULTADO FINAL
# ============================================================================

Write-Host "`n" + ("=" * 80)
Write-Host "✅ LIMPEZA CONCLUÍDA!" -ForegroundColor Green
Write-Host "`nResumo:" -ForegroundColor Cyan
Write-Host "  • Scripts temporários removidos" -ForegroundColor White
Write-Host "  • SQL temporários removidos" -ForegroundColor White
Write-Host "  • Documentação obsoleta removida" -ForegroundColor White
Write-Host "  • Scripts úteis organizados em scripts/" -ForegroundColor White
Write-Host "  • Documentação organizada em docs/" -ForegroundColor White
Write-Host "`nPróximo passo: git add . && git commit" -ForegroundColor Yellow
Write-Host ("=" * 80)
