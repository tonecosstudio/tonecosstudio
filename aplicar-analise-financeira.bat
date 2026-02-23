@echo off
echo ============================================
echo Aplicando Sistema de Analise Financeira
echo ============================================
echo.

REM Carregar variaveis do .env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="SUPABASE_DB_URL" set DB_URL=%%b
)

if "%DB_URL%"=="" (
    echo ERRO: SUPABASE_DB_URL nao encontrada no .env
    echo.
    echo Use o Supabase SQL Editor:
    echo 1. Abra: https://supabase.com/dashboard
    echo 2. Va em SQL Editor
    echo 3. Copie: supabase/migrations/20260215150000_add_collection_costs_analytics.sql
    echo 4. Execute
    echo.
    pause
    exit /b 1
)

echo Conectando ao banco de dados...
echo.

psql "%DB_URL%" -f "supabase/migrations/20260215150000_add_collection_costs_analytics.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Migration aplicada com sucesso!
    echo ============================================
    echo.
    echo Sistema de analise financeira ativado:
    echo - Campos de custo adicionados
    echo - Funcoes de calculo criadas
    echo - View de resumo criada
    echo - Analise completa disponivel
    echo.
    echo Acesse /admin/financeiro para usar
    echo.
) else (
    echo.
    echo ============================================
    echo ERRO ao aplicar migration!
    echo ============================================
    echo.
)

pause
