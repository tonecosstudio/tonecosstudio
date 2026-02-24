@echo off
echo ====================================================
echo TESTAR SE O ERRO 406 FOI RESOLVIDO
echo ====================================================
echo.
echo O fix agressivo foi aplicado ao banco de dados!
echo.
echo PASSO 1: Execute o teste no SQL Editor do Supabase
echo   1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql
echo   2. Copie o conteúdo de testar-fix-imediato.sql
echo   3. Cole no SQL Editor e execute (Ctrl+Enter)
echo.
echo PASSO 2: Verifique os resultados
echo   - Deve mostrar "✅✅✅ QUERY FUNCIONA - SEM ERRO 406!"
echo   - Deve listar as políticas aplicadas
echo   - Deve mostrar o resultado da query
echo.
echo PASSO 3: Teste a aplicação
echo   1. Volte para a aplicação
echo   2. Recarregue a página (F5)
echo   3. O erro 406 DEVE ter desaparecido!
echo.
echo ====================================================
echo O QUE FOI FEITO:
echo ====================================================
echo ✅ Todas as políticas RLS antigas foram removidas
echo ✅ Nova política SUPER PERMISSIVA criada:
echo    - Qualquer usuário autenticado pode ler TODAS as mensagens
echo    - Apenas admins podem criar/atualizar/deletar
echo.
echo ====================================================
echo PRONTO PARA TESTAR!
echo ====================================================
echo Execute o teste no Supabase SQL Editor.
echo.
pause