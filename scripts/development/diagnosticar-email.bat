@echo off
echo ========================================
echo DIAGNOSTICO DO SISTEMA DE EMAIL
echo ========================================
echo.
echo Verificando configuracao e logs...
echo.

type diagnosticar-email.sql | supabase db execute

echo.
echo ========================================
echo.
echo Para ver os logs da Edge Function:
echo Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/functions/send-email/logs
echo.
echo ========================================
pause
