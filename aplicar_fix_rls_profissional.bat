@echo off
echo ========================================
echo Aplicando Fix RLS Profissional
echo ========================================
echo.

supabase db push

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha ao aplicar migration
    pause
    exit /b 1
)

echo.
echo ========================================
echo Migration aplicada com sucesso!
echo ========================================
echo.
echo Politicas RLS recriadas:
echo - 4 politicas para chat_groups
echo - 4 politicas para chat_group_members
echo - 4 politicas para chat_group_messages
echo - 4 politicas para chat_group_attachments
echo.
echo Total: 16 politicas RLS seguras
echo.
pause
