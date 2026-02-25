# Script de Reorganização da Documentação
# Data: 25/02/2026

Write-Host "🚀 Iniciando reorganização da documentação..." -ForegroundColor Green

# Contador de arquivos movidos
$movedCount = 0

# Função para mover arquivo com verificação
function Move-DocFile {
    param($source, $destination)
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $destination -Force
        $script:movedCount++
        Write-Host "✅ Movido: $source" -ForegroundColor Gray
    }
}

# 1. IMPLEMENTAÇÕES
Write-Host "`n📦 Movendo documentos de implementação..." -ForegroundColor Cyan
Move-DocFile "IMPLEMENTACAO_MODELO_V2_COMPLETA.md" "docs-archive/implementations/"
Move-DocFile "IMPLEMENTACAO_FINAL_CONFIGURACOES.md" "docs-archive/implementations/"
Move-DocFile "STATUS_IMPLEMENTACAO_V2.md" "docs-archive/implementations/"
Move-DocFile "IMPLEMENTACAO_COMPLETA_SUCESSO.md" "docs-archive/implementations/"
Move-DocFile "INTEGRACAO_ANALYTICS_COMPLETA.md" "docs-archive/implementations/"
Move-DocFile "INTEGRACAO_COMPONENTES_COMPLETA.md" "docs-archive/implementations/"

# 2. SPRINTS
Write-Host "`n🏃 Movendo documentos de sprints..." -ForegroundColor Cyan
Move-DocFile "SPRINT1_IMPLEMENTADO.md" "docs-archive/sprints/"
Move-DocFile "SPRINT1_GRUPOS_IMPLEMENTADO.md" "docs-archive/sprints/"
Move-DocFile "SPRINT2_GRUPOS_PARCIAL.md" "docs-archive/sprints/"
Move-DocFile "SPRINT2_GRUPOS_COMPLETO.md" "docs-archive/sprints/"
Move-DocFile "SPRINT3_GRUPOS_COMPLETO.md" "docs-archive/sprints/"
Move-DocFile "SPRINT4_GRUPOS_COMPLETO.md" "docs-archive/sprints/"
Move-DocFile "MELHORIAS_SPRINT_COMPLETO.md" "docs-archive/sprints/"

# 3. SESSÕES
Write-Host "`n📅 Movendo documentos de sessões..." -ForegroundColor Cyan
Move-DocFile "SESSAO_COMPLETA_V1.3.md" "docs-archive/sessions/"
Move-DocFile "SESSAO_COMPLETA_V2.1.md" "docs-archive/sessions/"
Move-DocFile "SESSAO_MODO_ESCURO_V2.0.md" "docs-archive/sessions/"
Move-DocFile "RESUMO_SESSAO_ATUAL.md" "docs-archive/sessions/"
Move-DocFile "RESUMO_SESSAO_COMPLETA_2026.md" "docs-archive/sessions/"
Move-DocFile "RESUMO_SESSAO_NOTIFICACOES_2026.md" "docs-archive/sessions/"
Move-DocFile "RESUMO_FINAL_SESSAO_V2.2.md" "docs-archive/sessions/"
Move-DocFile "SESSAO_FINAL_V2.2.1.md" "docs-archive/sessions/"

# 4. FASES
Write-Host "`n🎯 Movendo documentos de fases..." -ForegroundColor Cyan
Move-DocFile "FASE2_100_COMPLETA_V1.5.md" "docs-archive/phases/"
Move-DocFile "FASE2_COMPLETA_V1.4.md" "docs-archive/phases/"
Move-DocFile "FASE5_NOTIFICACOES_INTEGRADA.md" "docs-archive/phases/"
Move-DocFile "FASE5_NOTIFICACOES_TEMPO_REAL_IMPLEMENTADA.md" "docs-archive/phases/"
Move-DocFile "FASE_4_SCRIPTS_REORGANIZADOS.md" "docs-archive/phases/"
Move-DocFile "FASE_5_PLANO_LIMPEZA.md" "docs-archive/phases/"

# 5. CORREÇÕES
Write-Host "`n🔧 Movendo documentos de correções..." -ForegroundColor Cyan
Move-DocFile "CORRECAO_SIDEBAR_GRUPOS_FINAL.md" "docs-archive/corrections/"
Move-DocFile "CORRECAO_GRUPOS_ADMIN.md" "docs-archive/corrections/"
Move-DocFile "CORRECAO_RODAPE_COMPLETA.md" "docs-archive/corrections/"
Move-DocFile "CORRECAO_SIDEBAR_COMUNICACAO.md" "docs-archive/corrections/"
Move-DocFile "CORRECAO_SIDEBAR_GRUPOS.md" "docs-archive/corrections/"
Move-DocFile "CORRECAO_FINAL_SIDEBAR_GRUPOS.md" "docs-archive/corrections/"
Move-DocFile "CORRECOES_ANALYTICS_V1.3.1.md" "docs-archive/corrections/"
Move-DocFile "CORRECOES_SSOT_IMPLEMENTADAS.md" "docs-archive/corrections/"
Move-DocFile "CORRECAO_MIGRATION_APLICADA.md" "docs-archive/corrections/"
Move-DocFile "TESTES_CORRIGIDOS_FINAL.md" "docs-archive/corrections/"

# 6. MELHORIAS
Write-Host "`n⭐ Movendo documentos de melhorias..." -ForegroundColor Cyan
Move-DocFile "MELHORIAS_ADMIN_V1.1.md" "docs-archive/improvements/"
Move-DocFile "MELHORIAS_ADMIN_USERS_COMPLETAS.md" "docs-archive/improvements/"
Move-DocFile "MELHORIAS_UX_FASE4_IMPLEMENTADAS.md" "docs-archive/improvements/"
Move-DocFile "MELHORIAS_IMPLEMENTADAS.md" "docs-archive/improvements/"
Move-DocFile "PROXIMAS_MELHORIAS_GRUPOS.md" "docs-archive/improvements/"
Move-DocFile "ANALISE_PROXIMAS_MELHORIAS.md" "docs-archive/improvements/"

# 7. ANÁLISES
Write-Host "`n🔍 Movendo documentos de análise..." -ForegroundColor Cyan
Move-DocFile "ANALISE_ADMIN_COMPLETA.md" "docs-archive/analysis/"
Move-DocFile "ANALISE_MELHORIAS_GRUPOS.md" "docs-archive/analysis/"
Move-DocFile "ANALISE_MESCLAGEM_PAGINAS_ADMIN.md" "docs-archive/analysis/"
Move-DocFile "ANALISE_RODAPE_DADOS_REAIS.md" "docs-archive/analysis/"
Move-DocFile "ANALISE_DIVERGENCIAS_CRONOGRAMA.md" "docs-archive/analysis/"

# 8. MIGRATIONS
Write-Host "`n💾 Movendo documentos de migrations..." -ForegroundColor Cyan
Move-DocFile "MIGRATION_APLICADA_SUCESSO.md" "docs-archive/migrations/"
Move-DocFile "MIGRATION_APLICADA_SUCESSO_FINAL.md" "docs-archive/migrations/"
Move-DocFile "MIGRATION_APLICACAO_FINAL.md" "docs-archive/migrations/"
Move-DocFile "MIGRATION_PRONTA_PARA_APLICAR.md" "docs-archive/migrations/"
Move-DocFile "APLICAR_MIGRATION_NOTIFICACOES.md" "docs-archive/migrations/"
Move-DocFile "APLICAR_AGORA_DASHBOARD.md" "docs-archive/migrations/"
Move-DocFile "CONCLUSAO_APLICACAO_MIGRATION.md" "docs-archive/migrations/"
Move-DocFile "INSTRUCOES_MIGRATION_V2.md" "docs-archive/migrations/"

# 9. RESUMOS
Write-Host "`n📊 Movendo resumos executivos..." -ForegroundColor Cyan
Move-DocFile "RESUMO_EXECUTIVO_MODELO_V2.md" "docs-archive/summaries/"
Move-DocFile "RESUMO_EXECUTIVO_CONFIGURACOES.md" "docs-archive/summaries/"
Move-DocFile "RESUMO_EXECUTIVO_ADMIN_FINAL.md" "docs-archive/summaries/"
Move-DocFile "RESUMO_FINAL_MELHORIAS.md" "docs-archive/summaries/"
Move-DocFile "RESUMO_FINAL_V1.3.md" "docs-archive/summaries/"
Move-DocFile "RESUMO_COMPLETO_ADMIN.md" "docs-archive/summaries/"
Move-DocFile "RESUMO_MELHORIAS_GRUPOS_FINAL.md" "docs-archive/summaries/"
Move-DocFile "RESUMO_ATUALIZACAO_COLLECTIONS.md" "docs-archive/summaries/"
Move-DocFile "RESUMO_CORRECOES_SSOT.md" "docs-archive/summaries/"
Move-DocFile "RESUMO_FINAL_TODAS_MELHORIAS.md" "docs-archive/summaries/"

Write-Host "`n✅ Reorganização concluída!" -ForegroundColor Green
Write-Host "📦 Total de arquivos movidos: $movedCount" -ForegroundColor Yellow
