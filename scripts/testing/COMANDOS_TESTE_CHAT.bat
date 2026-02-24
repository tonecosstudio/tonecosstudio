@echo off
REM ========================================
REM COMANDOS RAPIDOS - TESTE CHAT
REM ========================================

echo.
echo ========================================
echo COMANDOS RAPIDOS - TESTE CHAT
echo ========================================
echo.

:menu
echo.
echo Escolha uma opcao:
echo.
echo 1. Verificar logs da Edge Function (send-email)
echo 2. Verificar tabela email_notifications
echo 3. Testar Edge Function com cURL
echo 4. Ver ultimos 10 emails enviados
echo 5. Ver status dos emails (hoje)
echo 6. Limpar console
echo 7. Sair
echo.

set /p opcao="Digite o numero da opcao: "

if "%opcao%"=="1" goto logs
if "%opcao%"=="2" goto tabela
if "%opcao%"=="3" goto curl
if "%opcao%"=="4" goto ultimos
if "%opcao%"=="5" goto status
if "%opcao%"=="6" goto limpar
if "%opcao%"=="7" goto sair

echo Opcao invalida!
goto menu

:logs
echo.
echo ========================================
echo LOGS DA EDGE FUNCTION
echo ========================================
echo.
npx supabase functions logs send-email --tail
goto menu

:tabela
echo.
echo ========================================
echo TABELA EMAIL_NOTIFICATIONS
echo ========================================
echo.
echo Abrindo SQL Editor no Supabase...
echo.
echo Cole esta query:
echo.
echo SELECT * FROM email_notifications ORDER BY created_at DESC LIMIT 10;
echo.
start https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
pause
goto menu

:curl
echo.
echo ========================================
echo TESTE COM cURL
echo ========================================
echo.
echo IMPORTANTE: Substitua SEU_USER_ID_AQUI por um ID real!
echo.
echo curl -X POST https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/send-email ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." ^
  -H "Content-Type: application/json" ^
  -d "{\"conversationId\":\"test-123\",\"messageId\":\"msg-456\",\"recipientUserId\":\"SEU_USER_ID_AQUI\",\"messageContent\":\"Teste!\"}"
echo.
pause
goto menu

:ultimos
echo.
echo ========================================
echo ULTIMOS 10 EMAILS ENVIADOS
echo ========================================
echo.
echo Abrindo SQL Editor no Supabase...
echo.
echo Cole esta query:
echo.
echo SELECT 
echo   id,
echo   conversation_id,
echo   recipient_user_id,
echo   status,
echo   sent_at,
echo   error_message,
echo   retry_count,
echo   created_at
echo FROM email_notifications 
echo ORDER BY created_at DESC 
echo LIMIT 10;
echo.
start https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
pause
goto menu

:status
echo.
echo ========================================
echo STATUS DOS EMAILS (HOJE)
echo ========================================
echo.
echo Abrindo SQL Editor no Supabase...
echo.
echo Cole esta query:
echo.
echo SELECT 
echo   status,
echo   COUNT(*) as total,
echo   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
echo FROM email_notifications
echo WHERE created_at ^> CURRENT_DATE
echo GROUP BY status;
echo.
start https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
pause
goto menu

:limpar
cls
goto menu

:sair
echo.
echo Saindo...
exit

REM ========================================
REM QUERIES UTEIS
REM ========================================
REM
REM -- Ver emails pendentes
REM SELECT * FROM email_notifications WHERE status = 'pending';
REM
REM -- Ver emails com erro
REM SELECT * FROM email_notifications WHERE status = 'failed';
REM
REM -- Ver taxa de sucesso (ultimas 24h)
REM SELECT 
REM   status,
REM   COUNT(*) as total,
REM   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
REM FROM email_notifications
REM WHERE created_at > NOW() - INTERVAL '24 hours'
REM GROUP BY status;
REM
REM -- Ver emails por hora (hoje)
REM SELECT 
REM   DATE_TRUNC('hour', created_at) as hora,
REM   COUNT(*) as emails_enviados,
REM   COUNT(*) FILTER (WHERE status = 'sent') as sucesso,
REM   COUNT(*) FILTER (WHERE status = 'failed') as falhas
REM FROM email_notifications
REM WHERE created_at > CURRENT_DATE
REM GROUP BY hora
REM ORDER BY hora DESC;
