@echo off
echo ========================================
echo TESTE DO SISTEMA DE CHAT
echo ========================================
echo.
echo 1. Abrindo navegador no chat admin...
echo 2. Abrindo navegador no chat cliente...
echo 3. Abrindo documentacao...
echo.
echo URLs:
echo - Admin: http://localhost:8080/admin/support
echo - Cliente: http://localhost:8080
echo - Contato: http://localhost:8080/contato
echo.
echo ========================================
echo.

echo Abrindo navegadores...
start http://localhost:8080/admin/support
timeout /t 2
start http://localhost:8080
timeout /t 2
start http://localhost:8080/contato

echo.
echo ========================================
echo INSTRUCOES PARA TESTE:
echo 1. Faça login como ADMIN
echo 2. Verifique se as 5 conversas de teste aparecem
echo 3. Clique em uma conversa para abrir o chat
echo 4. Teste enviar uma mensagem
echo 5. Teste filtros e busca
echo 6. Teste o chat do cliente (outra aba)
echo ========================================
echo.
pause