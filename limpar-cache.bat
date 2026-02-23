@echo off
echo ========================================
echo   LIMPAR CACHE DO VITE - ORDAX
echo ========================================
echo.

echo [1/2] Limpando cache do Vite...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo [OK] Cache do Vite removido
) else (
    echo [INFO] Cache do Vite nao encontrado
)
echo.

echo [2/2] Limpando cache do navegador...
echo.
echo INSTRUCOES:
echo 1. Abra o DevTools (F12)
echo 2. Clique com botao direito no botao de reload
echo 3. Selecione "Empty Cache and Hard Reload"
echo.

echo ========================================
echo   CACHE LIMPO!
echo ========================================
echo.
echo Agora execute: npm run dev
echo.
pause
