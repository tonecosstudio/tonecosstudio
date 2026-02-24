@echo off
echo ========================================
echo Regenerando Tipos do Supabase
echo ========================================
echo.
echo Este script vai regenerar os tipos TypeScript do Supabase
echo com base no schema atual do banco de dados.
echo.
echo PROJECT_ID: pabxpvqwtvbjaunjejud
echo.
pause

echo.
echo Executando comando...
echo.

npx supabase gen types typescript --project-id pabxpvqwtvbjaunjejud > src/integrations/supabase/types.ts

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCESSO! Tipos regenerados com sucesso!
    echo ========================================
    echo.
    echo Arquivo atualizado: src/integrations/supabase/types.ts
    echo.
    echo Agora execute: npm run dev
    echo.
) else (
    echo.
    echo ========================================
    echo ERRO ao regenerar tipos!
    echo ========================================
    echo.
    echo Possiveis causas:
    echo 1. Voce precisa estar autenticado no Supabase CLI
    echo 2. Execute: npx supabase login
    echo 3. Ou use o token de acesso pessoal
    echo.
)

pause
