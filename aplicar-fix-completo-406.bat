@echo off
echo ====================================================
echo APLICAR FIX COMPLETO PARA ERRO 406
echo ====================================================
echo.
echo Este script aplica a correção COMPLETA para o erro 406
echo que ocorre ao tentar ler mensagens de grupos de chat.
echo.
echo O problema era:
echo 1. Políticas RLS inconsistentes
echo 2. Admins não podiam ler mensagens de grupos que não são membros
echo 3. Função has_role pode não estar configurada corretamente
echo.
echo A solução:
echo 1. Configura pré-requisitos (app_role, has_role)
echo 2. Remove TODAS as políticas conflitantes
echo 3. Cria políticas CORRETAS e CONSISTENTES
echo 4. Testa a correção
echo.
echo ====================================================
echo PASSO A PASSO:
echo ====================================================
echo.
echo PASSO 1: Execute o diagnóstico
echo   1. Abra o SQL Editor do Supabase
echo   2. Copie e cole o conteúdo de diagnostic-group-406.sql
echo   3. Execute para ver o status atual
echo.
echo PASSO 2: Aplique a correção completa
echo   1. No mesmo SQL Editor, copie fix-complete-406-final.sql
echo   2. Execute o script COMPLETO
echo   3. Verifique se todas as 4 políticas foram criadas
echo.
echo PASSO 3: Teste a correção
echo   1. Volte para a aplicação
echo   2. Recarregue a página (F5)
echo   3. O erro 406 deve desaparecer
echo.
echo PASSO 4: Verificação final
echo   1. Execute test-query-406.sql no SQL Editor
echo   2. Verifique se a query funciona sem erro
echo.
echo ====================================================
echo ARQUIVOS CRIADOS:
echo ====================================================
echo 1. diagnostic-group-406.sql        - Diagnóstico completo
echo 2. fix-complete-406-final.sql      - Correção COMPLETA
echo 3. test-query-406.sql              - Teste da query específica
echo 4. fix-406-error-immediate.sql     - Correção anterior (backup)
echo.
echo ====================================================
echo O QUE FOI CORRIGIDO:
echo ====================================================
echo ✅ Tipo app_role verificado/criado
echo ✅ Função has_role verificada/criada
echo ✅ Políticas antigas removidas
echo ✅ 4 novas políticas criadas:
echo    1. SELECT: Admins + Membros dos grupos
echo    2. INSERT: Apenas admins (suas mensagens)
echo    3. UPDATE: Apenas admins (suas mensagens)
echo    4. DELETE: Apenas admins (suas mensagens)
echo.
echo ====================================================
echo PRONTO PARA TESTAR!
echo ====================================================
echo Execute os passos acima e teste a aplicação.
echo.
pause