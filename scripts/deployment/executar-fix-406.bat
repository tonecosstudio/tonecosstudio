@echo off
echo ====================================================
echo EXECUTAR FIX DO ERRO 406 - CHAT GROUP MESSAGES
echo ====================================================
echo.
echo PASSO 1: Acesse o SQL Editor do Supabase
echo   URL: https://supabase.com/dashboard/project/[SEU_PROJETO]/sql
echo.
echo PASSO 2: Escolha qual script executar:
echo.
echo   OPÇÃO A (RECOMENDADA): fix-complete-406-final.sql
echo     - Correção COMPLETA de todas as políticas
echo     - Configura pré-requisitos (app_role, has_role)
echo     - Cria 4 políticas consistentes
echo.
echo   OPÇÃO B (RÁPIDA): fix-406-rapido.sql
echo     - Correção RÁPIDA apenas do SELECT
echo     - Remove políticas conflitantes
echo     - Cria política simplificada
echo.
echo PASSO 3: Execute o script escolhido
echo   1. Copie o conteúdo do arquivo .sql
echo   2. Cole no SQL Editor do Supabase
echo   3. Clique em "Run" ou pressione Ctrl+Enter
echo.
echo PASSO 4: Verifique o resultado
echo   - Deve mostrar "✅ FUNCIONANDO - Sem erro 406"
echo   - Deve listar as políticas aplicadas
echo.
echo PASSO 5: Teste a aplicação
echo   1. Volte para a aplicação
echo   2. Recarregue a página (F5)
echo   3. O erro 406 deve ter desaparecido!
echo.
echo ====================================================
echo ARQUIVOS DISPONÍVEIS:
echo ====================================================
echo 1. fix-complete-406-final.sql  - Correção COMPLETA
echo 2. fix-406-rapido.sql          - Correção RÁPIDA
echo 3. diagnostic-group-406.sql    - Diagnóstico
echo 4. verificar-fix-406.sql       - Verificação
echo.
echo ====================================================
echo PRONTO PARA EXECUTAR!
echo ====================================================
echo Copie o conteúdo do script escolhido e execute no Supabase.
echo.
pause