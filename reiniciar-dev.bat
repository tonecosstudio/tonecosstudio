@echo off
echo ========================================
echo   REINICIAR SERVIDOR DE DEV - ORDAX
echo ========================================
echo.

echo [1/3] Limpando cache do Vite...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo [OK] Cache removido
) else (
    echo [INFO] Sem cache para remover
)
echo.

echo [2/3] Limpando dist...
if exist "dist" (
    rmdir /s /q "dist"
    echo [OK] Dist removido
) else (
    echo [INFO] Sem dist para remover
)
echo.

echo [3/3] Iniciando servidor...
echo.
echo ========================================
echo   SERVIDOR INICIANDO...
echo ========================================
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

npm run dev
