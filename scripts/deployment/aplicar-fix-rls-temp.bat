@echo off
echo ========================================
echo Aplicando fix temporario de RLS
echo ========================================
echo.

echo Opcao 1: Via Supabase CLI (recomendado)
echo -----------------------------------------
echo npx supabase db push
echo.

echo Opcao 2: Via Dashboard do Supabase
echo -----------------------------------------
echo 1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
echo 2. Va em SQL Editor
echo 3. Copie e execute o conteudo de: supabase/migrations/20260224040000_fix_rls_chat_groups_temp.sql
echo.

echo Opcao 3: Executar agora via CLI
echo -----------------------------------------
set /p EXECUTAR="Deseja executar via CLI agora? (S/N): "
if /i "%EXECUTAR%"=="S" (
    echo Executando...
    npx supabase db push
    echo.
    echo Concluido!
) else (
    echo.
    echo Execute manualmente uma das opcoes acima.
)

echo.
pause
