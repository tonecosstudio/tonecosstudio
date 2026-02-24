@echo off
echo ====================================================
echo APLICAR FIX PARA ERRO 406 - CHAT GROUP MESSAGES
echo ====================================================
echo.
echo Este script aplica correções para o erro 406 (Not Acceptable)
echo que ocorre ao tentar ler mensagens de grupos de chat.
echo.
echo PASSO 1: Executar diagnóstico do grupo
echo.
echo Execute no SQL Editor do Supabase:
echo 1. Abra o SQL Editor em https://supabase.com/dashboard/project/[SEU_PROJETO]/sql
echo 2. Copie e cole o conteúdo de diagnostic-group-406.sql
echo 3. Execute o script para verificar o status atual
echo.
echo PASSO 2: Aplicar correção RLS
echo.
echo 1. No mesmo SQL Editor, copie e cole o conteúdo de fix-406-error-immediate.sql
echo 2. Execute o script completo
echo 3. Verifique se todas as políticas foram criadas com sucesso
echo.
echo PASSO 3: Testar a correção
echo.
echo 1. Volte para a aplicação
echo 2. Recarregue a página do chat
echo 3. Verifique se o erro 406 desapareceu
echo.
echo PASSO 4: Verificação final
echo.
echo 1. Execute novamente o diagnóstico (diagnostic-group-406.sql)
echo 2. Verifique se todas as políticas estão aplicadas
echo 3. Confirme que a consulta de teste funciona
echo.
echo ====================================================
echo ARQUIVOS DISPONÍVEIS:
echo ====================================================
echo 1. diagnostic-group-406.sql - Diagnóstico completo
echo 2. fix-406-error-immediate.sql - Correção RLS
echo 3. fix-policy-now.sql - Correção anterior (backup)
echo 4. fix-rls-406-final.sql - Correção final anterior
echo.
echo ====================================================
echo INSTRUÇÕES RÁPIDAS:
echo ====================================================
echo 1. Execute diagnostic-group-406.sql primeiro
echo 2. Execute fix-406-error-immediate.sql depois
echo 3. Teste a aplicação
echo.
pause