@echo off
echo ========================================
echo Aplicando Fix RLS Permissivo
echo ========================================
echo.

echo y | supabase db push

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
echo Recarregue a pagina do chat
echo.
pause
