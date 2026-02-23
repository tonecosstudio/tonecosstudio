@echo off
echo ========================================
echo CORRECAO COMPLETA DO SISTEMA DE EMAIL
echo ========================================
echo.

echo Passo 1: Verificando secrets...
echo ----------------------------------------
supabase secrets list
echo.

echo Passo 2: Configurando secrets necessarios...
echo ----------------------------------------
echo Configurando EMAIL_PROVIDER=resend...
supabase secrets set EMAIL_PROVIDER=resend

echo Configurando EMAIL_API_KEY...
supabase secrets set EMAIL_API_KEY=re_c1tpEyD8_NKFusih9vKVQknRAQfmFcWCv

echo Configurando EMAIL_FROM...
supabase secrets set EMAIL_FROM=suporte@ordax.com.br

echo Configurando EMAIL_FROM_NAME...
supabase secrets set EMAIL_FROM_NAME="Ordax Suporte"

echo Configurando BASE_URL...
supabase secrets set BASE_URL=http://localhost:8080

echo.
echo Passo 3: Redeployando Edge Function...
echo ----------------------------------------
supabase functions deploy send-email --no-verify-jwt

echo.
echo Passo 4: Verificando configuracao final...
echo ----------------------------------------
supabase secrets list

echo.
echo ========================================
echo CORRECAO CONCLUIDA!
echo ========================================
echo.
echo O sistema de email esta pronto para uso.
echo.
echo Para testar:
echo 1. Abra http://localhost:8080/admin/suporte
echo 2. Responda uma conversa de cliente
echo 3. Verifique os logs: supabase functions logs send-email
echo.
echo Para ver notificacoes enviadas:
echo   supabase db execute diagnosticar-email.sql
echo.
pause
