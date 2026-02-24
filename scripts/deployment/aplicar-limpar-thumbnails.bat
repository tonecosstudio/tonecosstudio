@echo off
chcp 65001 >nul
echo ========================================
echo Limpando thumbnails antigos
echo ========================================
echo.

REM Verificar se o token está configurado
if "%SUPABASE_ACCESS_TOKEN%"=="" (
    echo ERRO: Token não configurado!
    echo Execute: $env:SUPABASE_ACCESS_TOKEN = "sbp_db8908eec06ba647ff9d0092460dba9fc8253b51"
    pause
    exit /b 1
)

echo Aplicando correção...
supabase db execute --project-id pabxpvqwtvbjaunjejud --file limpar-thumbnails-antigos.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Thumbnails antigos limpos com sucesso!
    echo.
    echo Agora teste enviar uma nova imagem no chat.
    echo Ela deve aparecer sem erros no console.
) else (
    echo.
    echo ✗ Erro ao aplicar correção
)

echo.
pause
