@echo off
chcp 65001 >nul
echo ========================================
echo Recriando bucket de anexos
echo ========================================
echo.

set SUPABASE_ACCESS_TOKEN=sbp_db8908eec06ba647ff9d0092460dba9fc8253b51

echo Aplicando correção...
type recriar-bucket-anexos.sql | supabase db query

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Bucket recriado com sucesso!
    echo.
    echo Agora teste enviar uma imagem novamente.
) else (
    echo.
    echo ✗ Erro ao recriar bucket
)

echo.
pause
