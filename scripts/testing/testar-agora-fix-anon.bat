@echo off
echo =====================================================
echo TESTANDO FIX: Políticas para anon aplicadas
echo =====================================================
echo.
echo Executando teste para verificar se as políticas para anon foram aplicadas...
echo.

REM Mover o script de teste para migrations temporariamente
copy testar-fix-anon.sql supabase\migrations\temp_test_fix_anon.sql

REM Executar o teste
supabase db push --include-all

REM Limpar arquivo temporário
del supabase\migrations\temp_test_fix_anon.sql

echo.
echo =====================================================
echo TESTE CONCLUÍDO!
echo =====================================================
echo.
echo Verifique os resultados acima.
echo.
echo Se o teste mostrar "✅✅✅ FIX APLICADO COM SUCESSO!":
echo   1. Recarregue a página da aplicação (F5)
echo   2. O erro 406 DEVE ter desaparecido
echo   3. Teste o sistema de chat/grupos
echo.
echo ⚠️ LEMBRETE: Esta solução é TEMPORÁRIA
echo Políticas "true" para anon são PERIGOSAS em produção.
echo Ajuste para produção quando o erro for confirmado como resolvido.
echo.
pause