@echo off
echo ========================================
echo Hard Reload - Sistema de Chat
echo ========================================
echo.
echo ERRO CORRIGIDO!
echo O arquivo AdminSupportV2.tsx foi recriado.
echo.
echo PASSO 1: Feche TODAS as abas do navegador
echo.
echo PASSO 2: Limpe o cache do navegador:
echo - Chrome: Ctrl + Shift + Delete
echo - Selecione "Desde o início"
echo - Marque "Imagens e arquivos em cache"
echo - Clique em "Limpar dados"
echo.
echo PASSO 3: Abra nova aba
echo.
echo Abrindo nova aba...
start http://localhost:8080/admin/support
echo.
echo Se o erro persistir:
echo 1. Reinicie o servidor: Ctrl + C no terminal, depois npm run dev
echo 2. Aguarde o servidor iniciar completamente
echo 3. Abra novamente: http://localhost:8080/admin/support
echo.
pause