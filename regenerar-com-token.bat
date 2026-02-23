@echo off
echo ========================================
echo Regenerar Tipos com Token de Acesso
echo ========================================
echo.
echo PASSO 1: Obter Token
echo.
echo 1. Acesse: https://supabase.com/dashboard/account/tokens
echo 2. Clique em "Generate new token"
echo 3. De um nome (ex: CLI Token)
echo 4. Copie o token (comeca com sbp_)
echo.
echo ========================================
echo.

set /p TOKEN="Cole o token aqui e pressione Enter: "

if "%TOKEN%"=="" (
    echo.
    echo ERRO: Token nao fornecido!
    echo.
    pause
    exit /b 1
)

echo.
echo Regenerando tipos com o token fornecido...
echo.

npx supabase gen types typescript --project-id pabxpvqwtvbjaunjejud --access-token %TOKEN% > src/integrations/supabase/types.ts

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCESSO! Tipos regenerados!
    echo ========================================
    echo.
    echo Arquivo atualizado: src/integrations/supabase/types.ts
    echo.
    echo Agora execute: npm run dev
    echo.
    echo Os erros de tipo devem ter desaparecido!
    echo.
) else (
    echo.
    echo ========================================
    echo ERRO ao regenerar tipos!
    echo ========================================
    echo.
    echo Verifique se o token esta correto.
    echo O token deve comecar com: sbp_
    echo.
)

pause
