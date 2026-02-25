# Script de Reorganização da Documentação - Parte 2
# Continuação: Guias, Checklists, Índices e outros

Write-Host "🚀 Continuando reorganização..." -ForegroundColor Green
$movedCount = 0

function Move-DocFile {
    param($source, $destination)
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $destination -Force
        $script:movedCount++
        Write-Host "✅ Movido: $source" -ForegroundColor Gray
    }
}

# 10. GUIAS
Write-Host "`n📖 Movendo guias..." -ForegroundColor Cyan
Move-DocFile "GUIA_USO_ANALYTICS.md" "docs/guides/"
Move-DocFile "GUIA_USO_MODO_ESCURO.md" "docs/guides/"
Move-DocFile "GUIA_ADMIN_SSOT.md" "docs/guides/"
Move-DocFile "GUIA_RAPIDO_ADMIN.md" "docs/guides/"
Move-DocFile "GUIA_RAPIDO_NAVEGACAO.md" "docs/guides/"
Move-DocFile "GUIA_APLICAR_MIGRATION_GRUPOS.md" "docs-archive/migrations/"
Move-DocFile "GUIA_APLICAR_MIGRATION_VISUAL.md" "docs-archive/migrations/"
Move-DocFile "GUIA_MIGRACAO_CONSTANTES.md" "docs/guides/migration-guides/"
Move-DocFile "GUIA_MIGRACAO_MODELO_RECORRENTE.md" "docs/guides/migration-guides/"
Move-DocFile "GUIA_DEPLOY_VALIDACAO.md" "docs/deployment/"

# 11. CHECKLISTS
Write-Host "`n✅ Movendo checklists..." -ForegroundColor Cyan
Move-DocFile "CHECKLIST_ADMIN.md" "docs-archive/checklists/"
Move-DocFile "CHECKLIST_DEPLOY_CONFIGURACOES.md" "docs-archive/checklists/"
Move-DocFile "CHECKLIST_TESTES_SSOT.md" "docs-archive/checklists/"

# 12. ÍNDICES
Write-Host "`n📑 Movendo índices..." -ForegroundColor Cyan
Move-DocFile "INDICE_ADMIN.md" "docs-archive/indices/"
Move-DocFile "INDICE_ADMIN_ATUALIZADO.md" "docs-archive/indices/"
Move-DocFile "INDICE_CONSTANTES.md" "docs-archive/indices/"
Move-DocFile "INDICE_DOCUMENTACAO.md" "docs-archive/indices/"
Move-DocFile "INDICE_SISTEMA_CONFIGURACOES.md" "docs-archive/indices/"
Move-DocFile "INDICE_SSOT.md" "docs-archive/indices/"

# 13. CONCLUSÕES
Write-Host "`n🎉 Movendo conclusões..." -ForegroundColor Cyan
Move-DocFile "CONCLUSAO_MELHORIAS_ADMIN.md" "docs-archive/summaries/"
Move-DocFile "CONCLUSAO_COLLECTIONS_DINAMICA.md" "docs-archive/summaries/"

# 14. VALIDAÇÕES
Write-Host "`n✔️ Movendo validações..." -ForegroundColor Cyan
Move-DocFile "VALIDACAO_FINAL_COLLECTIONS.md" "docs-archive/summaries/"

# 15. ATUALIZAÇÕES
Write-Host "`n🔄 Movendo atualizações..." -ForegroundColor Cyan
Move-DocFile "ATUALIZACAO_ADMIN_IMPLEMENTADA.md" "docs-archive/implementations/"
Move-DocFile "ATUALIZACAO_COLLECTIONS_DINAMICA.md" "docs-archive/implementations/"

# 16. SISTEMAS
Write-Host "`n⚙️ Movendo documentos de sistemas..." -ForegroundColor Cyan
Move-DocFile "SISTEMA_CONFIGURACAO_DINAMICA.md" "docs-archive/implementations/"
Move-DocFile "SISTEMA_FAQ_DINAMICO_COMPLETO.md" "docs-archive/implementations/"

# 17. COMPONENTES
Write-Host "`n🧩 Movendo documentos de componentes..." -ForegroundColor Cyan
Move-DocFile "COMPONENTES_ADMIN_CRIADOS.md" "docs-archive/implementations/"

# 18. FUNCIONALIDADES
Write-Host "`n✨ Movendo funcionalidades..." -ForegroundColor Cyan
Move-DocFile "FUNCIONALIDADES_ADMIN_FASE2_IMPLEMENTADAS.md" "docs-archive/implementations/"

# 19. ANALYTICS
Write-Host "`n📈 Movendo analytics..." -ForegroundColor Cyan
Move-DocFile "ANALYTICS_AVANCADO_IMPLEMENTADO.md" "docs-archive/implementations/"

# 20. MESCLAGENS
Write-Host "`n🔀 Movendo mesclagens..." -ForegroundColor Cyan
Move-DocFile "MESCLAGEM_COMPLETA_FINAL.md" "docs-archive/implementations/"
Move-DocFile "MESCLAGEM_IMPLEMENTADA.md" "docs-archive/implementations/"

# 21. MODO ESCURO
Write-Host "`n🌙 Movendo modo escuro..." -ForegroundColor Cyan
Move-DocFile "MODO_ESCURO_IMPLEMENTADO.md" "docs-archive/implementations/"

# 22. RESPONSIVIDADE
Write-Host "`n📱 Movendo responsividade..." -ForegroundColor Cyan
Move-DocFile "RESPONSIVIDADE_MOBILE_V2.1.md" "docs-archive/implementations/"
Move-DocFile "GRAFICOS_RESPONSIVOS_V2.2.md" "docs-archive/implementations/"

# 23. TESTES
Write-Host "`n🧪 Movendo testes..." -ForegroundColor Cyan
Move-DocFile "TESTE_CONFIGURACOES_DINAMICAS.md" "docs-archive/implementations/"
Move-DocFile "TESTE_CONTRASTE_CORES.md" "docs-archive/implementations/"
Move-DocFile "COBERTURA_TESTES_AUMENTADA.md" "docs-archive/implementations/"

# 24. ROADMAPS
Write-Host "`n🗺️ Movendo roadmaps..." -ForegroundColor Cyan
Move-DocFile "ROADMAP_MELHORIAS_ADMIN.md" "docs-archive/summaries/"
Move-DocFile "PROGRESSO_ROADMAP_ADMIN_2026.md" "docs-archive/summaries/"

# 25. RELATÓRIOS
Write-Host "`n📋 Movendo relatórios..." -ForegroundColor Cyan
Move-DocFile "RELATORIO_FINAL_ADMIN_2026.md" "docs-archive/summaries/"

# 26. CHANGELOGS
Write-Host "`n📝 Movendo changelogs..." -ForegroundColor Cyan
Move-DocFile "CHANGELOG_ADMIN.md" "docs-archive/summaries/"

# 27. DEPLOY
Write-Host "`n🚀 Movendo deploy..." -ForegroundColor Cyan
Move-DocFile "DEPLOY_READY_ADMIN.md" "docs-archive/summaries/"

# 28. README específicos
Write-Host "`n📄 Movendo READMEs específicos..." -ForegroundColor Cyan
Move-DocFile "README_ADMIN_UPDATE.md" "docs-archive/summaries/"
Move-DocFile "README_MELHORIAS_GRUPOS.md" "docs-archive/improvements/"
Move-DocFile "README_MODELO_V2.md" "docs-archive/implementations/"
Move-DocFile "README_APLICAR_MIGRATION.md" "docs-archive/migrations/"

# 29. INSTRUÇÕES
Write-Host "`n📋 Movendo instruções..." -ForegroundColor Cyan
Move-DocFile "INSTRUCOES_FINAIS_GRUPOS.md" "docs-archive/summaries/"

# 30. PRÓXIMAS ETAPAS
Write-Host "`n➡️ Movendo próximas etapas..." -ForegroundColor Cyan
Move-DocFile "PROXIMA_ETAPA_DEFINIDA.md" "docs-archive/summaries/"

# 31. PLANOS
Write-Host "`n📋 Movendo planos..." -ForegroundColor Cyan
Move-DocFile "PLANO_ACAO_IMEDIATO.md" "docs-archive/summaries/"
Move-DocFile "PLANO_REORGANIZACAO_DOCS.md" "docs-archive/summaries/"

# 32. REORGANIZAÇÕES
Write-Host "`n🗂️ Movendo reorganizações..." -ForegroundColor Cyan
Move-DocFile "REORGANIZACAO_DOCS_COMPLETA.md" "docs-archive/summaries/"
Move-DocFile "REORGANIZACAO_FINAL_SUCESSO.md" "docs-archive/summaries/"

# 33. SUMÁRIOS
Write-Host "`n📊 Movendo sumários..." -ForegroundColor Cyan
Move-DocFile "SUMARIO_EXECUTIVO_REORGANIZACAO.md" "docs-archive/summaries/"

# 34. TRABALHOS COMPLETOS
Write-Host "`n💼 Movendo trabalhos completos..." -ForegroundColor Cyan
Move-DocFile "TRABALHO_COMPLETO_FINAL.md" "docs-archive/summaries/"

# 35. PROJETOS
Write-Host "`n🎯 Movendo projetos..." -ForegroundColor Cyan
Move-DocFile "PROJETO_COMPLETO_2026.md" "docs-archive/summaries/"

# 36. STATUS
Write-Host "`n📊 Movendo status..." -ForegroundColor Cyan
Move-DocFile "STATUS_FINAL_V2.0.md" "docs-archive/summaries/"

# 37. ANTES/DEPOIS
Write-Host "`n🔄 Movendo antes/depois..." -ForegroundColor Cyan
Move-DocFile "ANTES_DEPOIS_SSOT.md" "docs-archive/analysis/"
Move-DocFile "ANTES_E_DEPOIS.md" "docs-archive/analysis/"

# 38. REMOÇÕES
Write-Host "`n🗑️ Movendo remoções..." -ForegroundColor Cyan
Move-DocFile "REMOCAO_HARDCODED_COMPLETA.md" "docs-archive/implementations/"

# 39. CÁLCULOS
Write-Host "`n🧮 Movendo cálculos..." -ForegroundColor Cyan
Move-DocFile "CALCULO_AUTOMATICO_LOTES.md" "docs-archive/implementations/"

# 40. FAQ
Write-Host "`n❓ Movendo FAQ..." -ForegroundColor Cyan
Move-DocFile "FAQ_DINAMICO_COLLECTIONS.md" "docs-archive/implementations/"

# 41. TYPESCRIPT
Write-Host "`n📘 Movendo TypeScript..." -ForegroundColor Cyan
Move-DocFile "TYPESCRIPT_STRICT_MODE_COMPLETO.md" "docs-archive/implementations/"
Move-DocFile "TYPESCRIPT_STRICT_MIGRATION_PLAN.md" "docs-archive/implementations/"
Move-DocFile "TYPESCRIPT_STRICT_MODE_MIGRATION.md" "docs-archive/implementations/"

# 42. DOCKER
Write-Host "`n🐳 Movendo Docker..." -ForegroundColor Cyan
Move-DocFile "DOCKER_IMPLEMENTADO.md" "docs-archive/implementations/"

# 43. ONBOARDING
Write-Host "`n👋 Movendo onboarding..." -ForegroundColor Cyan
Move-DocFile "ONBOARDING.md" "docs-archive/summaries/"

# 44. QUICK START
Write-Host "`n⚡ Movendo quick start..." -ForegroundColor Cyan
Move-DocFile "QUICK_START_ADMIN.md" "docs-archive/summaries/"

# 45. PASSO A PASSO
Write-Host "`n👣 Movendo passo a passo..." -ForegroundColor Cyan
Move-DocFile "PASSO_A_PASSO_FINAL.md" "docs-archive/summaries/"

Write-Host "`nParte 2 concluida!" -ForegroundColor Green
Write-Host "Total de arquivos movidos nesta parte: $movedCount" -ForegroundColor Yellow
