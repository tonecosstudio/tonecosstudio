@echo off
echo ========================================
echo Testando Sistema de Email
echo ========================================
echo.
echo Este script vai:
echo 1. Verificar se a configuracao esta OK
echo 2. Mostrar as ultimas notificacoes
echo.
pause

echo.
echo Verificando configuracao...
echo.

supabase db execute < verificar-config-email.sql

echo.
echo ========================================
echo Teste concluido!
echo ========================================
echo.
echo Para testar o envio real de email:
echo 1. Acesse http://localhost:8080/admin/suporte
echo 2. Responda uma conversa de cliente
echo 3. O cliente recebera um email automaticamente
echo.
echo Para ver os logs da funcao:
echo supabase functions logs send-email
echo.
pause
