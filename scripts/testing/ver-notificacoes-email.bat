@echo off
echo ========================================
echo Verificando Notificacoes de Email
echo ========================================
echo.

echo Executando query no banco de dados...
echo.

supabase db execute --file testar-edge-function-direto.sql

echo.
echo ========================================
echo Verificacao concluida!
echo ========================================
echo.
pause
