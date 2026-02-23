@echo off
echo =====================================================
echo EXECUTANDO INVESTIGAÇÃO COMPLETA DO ERRO 406
echo =====================================================
echo.
echo 1. Executando script de investigação completa...
echo.

REM Executar o script SQL no Supabase
supabase db execute --file investigacao-completa-406.sql

echo.
echo =====================================================
echo INVESTIGAÇÃO COMPLETA CONCLUÍDA
echo =====================================================
echo.
echo Verifique os resultados acima para identificar a causa do erro 406.
echo.
pause