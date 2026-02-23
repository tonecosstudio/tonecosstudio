@echo off
echo ============================================
echo Aplicando Sistema de Precos Configuraveis
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

psql "%DB_URL%" -f "supabase/migrations/20260215140000_add_collection_pricing.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Migration aplicada com sucesso!
    echo ============================================
    echo.
    echo Sistema de precos configuraveis ativado:
    echo - Precos globais padrao configurados
    echo - Campos adicionados nas colecoes
    echo - Funcoes de calculo criadas
    echo - View de precos criada
    echo.
    echo Acesse /admin/precos para gerenciar
    echo.
) else (
    echo.
    echo ============================================
    echo ERRO ao aplicar migration!
    echo ============================================
    echo.
)

pause
