@echo off
echo ========================================
echo Forçar Recarregamento do Cache
echo ========================================
echo.
echo 1. Parando servidor (se estiver rodando)...
taskkill /F /IM node.exe 2>nul
echo.
echo 2. Limpando cache do Vite...
rd /s /q node_modules\.vite 2>nul
echo.
echo 3. Iniciando servidor com cache limpo...
start cmd /k "npm run dev -- --force"
echo.
echo 4. Aguarde 10 segundos para o servidor iniciar...
timeout /t 10 /nobreak
echo.
echo 5. Abrindo navegador com cache limpo...
start chrome --incognito http://localhost:8080/admin/support
echo.
echo 6. Para limpar cache manualmente:
echo - Chrome: Ctrl + Shift + Delete
echo - Selecione "Desde o início"
echo - Marque "Imagens e arquivos em cache"
echo - Clique em "Limpar dados"
echo.
pause