@echo off
echo ========================================
echo Aplicando Correcoes na Pagina de Assinatura
echo ========================================
echo.

echo [1/2] Padronizando desconto PIX para 5%%...
supabase db execute --file supabase/migrations/20260215160000_fix_subscription_discounts.sql
if %errorlevel% neq 0 (
    echo ERRO ao padronizar desconto!
    pause
    exit /b 1
)
echo OK - Desconto padronizado para 5%%
echo.

echo [2/2] Limpando dados das colecoes...
supabase db execute --file supabase/migrations/20260215161000_clean_collections_data.sql
if %errorlevel% neq 0 (
    echo ERRO ao limpar colecoes!
    pause
    exit /b 1
)
echo OK - Colecoes limpas
echo.

echo ========================================
echo CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Mudancas aplicadas:
echo - Desconto PIX padronizado para 5%% em todo o sistema
echo - Colecoes sem personagens desativadas
echo - Descricoes teste removidas
echo - Colecoes duplicadas desativadas
echo.
pause
