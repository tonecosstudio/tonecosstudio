@echo off
echo ========================================
echo Aplicando correcao de RLS para chat_group_messages
echo ========================================
echo.

REM Carrega as variaveis do .env
for /f "tokens=*" %%a in ('type .env ^| findstr /v "^#"') do set %%a

echo Aplicando fix-policy-now.sql...
psql "%SUPABASE_DB_URL%" -f fix-policy-now.sql

echo.
echo ========================================
echo Correcao aplicada com sucesso!
echo ========================================
echo.
echo Agora teste novamente a aplicacao.
echo O erro 406 deve estar resolvido.
echo.
pause
