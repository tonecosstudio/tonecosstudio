@echo off
echo ============================================
echo ATUALIZAR DESCRICOES DOS PLANOS
echo Remove "Economize" das descricoes
echo ============================================
echo.

echo Executando SQL no Supabase...
echo.

supabase db execute --file atualizar-descricoes-planos.sql

echo.
echo ============================================
echo CONCLUIDO!
echo ============================================
echo.
echo As descricoes foram atualizadas:
echo - Trimestral: "Receba 3 personagens consecutivos"
echo - Semestral: "Receba 6 personagens + 1 peca bonus"
echo.
pause
