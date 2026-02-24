@echo off
echo ========================================
echo Verificando Configuracao de Email
echo ========================================
echo.

echo Executando verificacao no Supabase...
supabase db execute < verificar-config-email.sql

echo.
echo ========================================
echo Verificacao concluida!
echo ========================================
pause
