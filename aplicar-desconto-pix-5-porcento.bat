@echo off
echo ============================================
echo Aplicando Desconto PIX 5%% (Correcao)
echo ============================================
echo.

REM Carregar variaveis do .env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="SUPABASE_DB_URL" set DB_URL=%%b
)

if "%DB_URL%"=="" (
    echo ERRO: SUPABASE_DB_URL nao encontrada no .env
    pause
    exit /b 1
)

echo Conectando ao banco de dados...
echo.

psql "%DB_URL%" -f "supabase/migrations/20260215130000_update_pix_discount_5_percent.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Migration aplicada com sucesso!
    echo ============================================
    echo.
    echo Desconto PIX atualizado para 5%%:
    echo - Trimestral: R$ 1.282,50
    echo - Semestral: R$ 2.565,00
    echo.
) else (
    echo.
    echo ============================================
    echo ERRO ao aplicar migration!
    echo ============================================
    echo.
)

pause
