@echo off
echo ========================================
echo Organizando Documentacao
echo ========================================
echo.

REM Criar pasta para documentacao
if not exist "docs" mkdir docs
if not exist "docs\historico" mkdir docs\historico
if not exist "docs\tecnico" mkdir docs\tecnico

echo Movendo arquivos essenciais para docs...
move /Y README_MELHORIAS.md docs\ 2>nul
move /Y INDICE_DOCUMENTACAO.md docs\ 2>nul
move /Y GUIA_DEPLOY_VALIDACAO.md docs\ 2>nul
move /Y RESUMO_FINAL_TODAS_MELHORIAS.md docs\ 2>nul
move /Y TRABALHO_COMPLETO_FINAL.md docs\ 2>nul

echo.
echo Movendo documentacao tecnica...
move /Y CORRECOES_XSS_APLICADAS.md docs\tecnico\ 2>nul
move /Y CORRECOES_SINGLE_APLICADAS.md docs\tecnico\ 2>nul
move /Y ERROR_BOUNDARIES_IMPLEMENTADOS.md docs\tecnico\ 2>nul
move /Y ANALISE_MELHORIAS_SISTEMA.md docs\tecnico\ 2>nul
move /Y ANALISE_SINGLE_COMPLETA.md docs\tecnico\ 2>nul

echo.
echo Movendo documentacao historica...
move /Y ANALISE_PAGINA_GRUPOS_COMPLETA.md docs\historico\ 2>nul
move /Y ANALISE_SUPABASE_COMPLETA.md docs\historico\ 2>nul
move /Y CORRECOES_GRUPOS_APLICADAS.md docs\historico\ 2>nul
move /Y CORRECOES_SUPABASE_APLICADAS.md docs\historico\ 2>nul
move /Y RESUMO_CORRECOES_COMPLETO.md docs\historico\ 2>nul
move /Y TRABALHO_CONCLUIDO.md docs\historico\ 2>nul
move /Y RESUMO_MELHORIAS_IMPLEMENTADAS.md docs\historico\ 2>nul
move /Y TESTES_GRUPOS_RECOMENDADOS.md docs\historico\ 2>nul
move /Y GUIA_RAPIDO_CORRECOES.md docs\historico\ 2>nul
move /Y SOLUCAO_DEFINITIVA_406.md docs\historico\ 2>nul
move /Y FIX_406_FINAL.md docs\historico\ 2>nul
move /Y CORRECOES_APLICADAS_SUCESSO.md docs\historico\ 2>nul

echo.
echo ========================================
echo Organizacao Concluida!
echo ========================================
echo.
echo Estrutura criada:
echo   docs\
echo     README_MELHORIAS.md (COMECE AQUI)
echo     INDICE_DOCUMENTACAO.md
echo     GUIA_DEPLOY_VALIDACAO.md
echo     RESUMO_FINAL_TODAS_MELHORIAS.md
echo     TRABALHO_COMPLETO_FINAL.md
echo.
echo     tecnico\
echo       CORRECOES_XSS_APLICADAS.md
echo       CORRECOES_SINGLE_APLICADAS.md
echo       ERROR_BOUNDARIES_IMPLEMENTADOS.md
echo       ANALISE_MELHORIAS_SISTEMA.md
echo       ANALISE_SINGLE_COMPLETA.md
echo.
echo     historico\
echo       (arquivos de referencia)
echo.
echo ========================================
pause
