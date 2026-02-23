@echo off
echo =====================================================
echo FIX DEFINITIVO - Chat Group Messages RLS
echo =====================================================
echo.
echo Este script vai:
echo 1. Aplicar a migration que corrige as politicas RLS
echo 2. Executar testes para verificar se funcionou
echo.
echo Pressione qualquer tecla para continuar...
pause > nul

echo.
echo [1/2] Aplicando migration...
supabase db push

echo.
echo [2/2] Executando testes...
supabase db execute --file testar-fix-definitivo.sql

echo.
echo =====================================================
echo FIX APLICADO!
echo =====================================================
echo.
echo PROXIMOS PASSOS:
echo 1. Recarregue a pagina no navegador (F5)
echo 2. O erro 406 deve ter desaparecido
echo 3. Teste criar e visualizar mensagens
echo.
pause
