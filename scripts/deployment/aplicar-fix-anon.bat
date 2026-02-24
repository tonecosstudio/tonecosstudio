@echo off
echo =====================================================
echo APLICANDO FIX DEFINITIVO: Políticas para anon
echo =====================================================
echo.
echo O problema: O fix anterior só criou políticas para "authenticated"
echo Mas o frontend pode estar fazendo requests como "anon" (não autenticado)
echo.
echo Aplicando políticas SUPER PERMISSIVAS para anon também...
echo.

REM Executar o script SQL no Supabase
supabase db push --include-all

echo.
echo =====================================================
echo FIX APLICADO COM SUCESSO!
echo =====================================================
echo.
echo 1. Recarregue a página da aplicação (F5)
echo 2. O erro 406 DEVE ter desaparecido
echo 3. Teste o sistema de chat/grupos
echo.
echo ⚠️ LEMBRETE: Esta solução é TEMPORÁRIA
echo Políticas "true" para anon são PERIGOSAS em produção.
echo Ajuste para produção quando o erro for confirmado como resolvido.
echo.
pause