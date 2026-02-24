@echo off
echo ========================================
echo Redeployando Edge Function de Email
echo ========================================
echo.

echo 1. Fazendo deploy da funcao send-email...
supabase functions deploy send-email --no-verify-jwt

echo.
echo 2. Verificando secrets configurados...
supabase secrets list

echo.
echo ========================================
echo Deploy concluido!
echo ========================================
echo.
echo Proximos passos:
echo 1. Teste enviando uma mensagem como admin
echo 2. Verifique os logs: supabase functions logs send-email
echo 3. Verifique a tabela: SELECT * FROM email_notifications;
echo.
pause
