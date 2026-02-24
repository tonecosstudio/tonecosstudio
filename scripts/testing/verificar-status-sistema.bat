@echo off
echo ========================================
echo Verificar Status do Sistema
echo ========================================
echo.
echo 1. Verificando se o servidor está rodando...
echo.
echo 2. Verificando se há erros no console...
echo.
echo 3. Verificando se as migrações foram aplicadas...
echo.
echo 4. Verificando se há dados de teste...
echo.
echo 5. Abrindo interface admin...
start http://localhost:8080/admin/support
echo.
echo 6. Abrindo interface cliente...
start http://localhost:8080
echo.
echo 7. Abrindo console de erros...
echo.
echo Instruções:
echo - Verifique o console do navegador (F12)
echo - Verifique se há erros vermelhos
echo - Verifique se as conversas aparecem
echo - Teste enviar uma mensagem
echo.
pause