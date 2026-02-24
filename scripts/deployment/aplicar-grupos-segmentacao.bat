@echo off
echo ========================================
echo Aplicando Grupos de Segmentacao
echo ========================================
echo.

supabase db reset --db-url "postgresql://postgres.qxgjqzqxvhfxqxvhfxqx:SenhaSegura123!@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

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
echo Novos grupos criados:
echo - 📢 Avisos Importantes (manual)
echo - ⏰ Assinaturas Expirando (automatico)
echo - 🔄 Ex-Assinantes (automatico)
echo - 🆓 Usuarios Free (automatico)
echo.
pause
