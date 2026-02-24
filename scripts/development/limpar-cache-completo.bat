@echo off
echo ========================================
echo LIMPEZA COMPLETA DE CACHE - VITE
echo ========================================
echo.

echo [1/4] Parando processos Node...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Removendo cache Vite...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo Cache Vite removido!
) else (
    echo Cache Vite nao encontrado.
)

echo [3/4] Removendo cache local...
if exist ".vite" (
    rmdir /s /q ".vite"
    echo Cache local removido!
)

echo [4/4] Limpando cache do navegador...
echo IMPORTANTE: Abra o navegador em modo anonimo/privado!
echo.

echo ========================================
echo CACHE LIMPO COM SUCESSO!
echo ========================================
echo.
echo Agora execute: npm run dev
echo.
pause
