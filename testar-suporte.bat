@echo off
echo ========================================
echo   TESTAR SISTEMA DE SUPORTE - ORDAX
echo ========================================
echo.

echo [1/3] Verificando ambiente...
echo.

REM Verificar se o servidor está rodando
curl -s http://localhost:8080 >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Servidor nao esta rodando!
    echo Execute: npm run dev
    pause
    exit /b 1
)

echo [OK] Servidor rodando em http://localhost:8080
echo.

echo [2/3] Abrindo paginas de teste...
echo.

REM Abrir página do cliente
echo Abrindo pagina do CLIENTE: /suporte
start http://localhost:8080/suporte

timeout /t 2 /nobreak >nul

REM Abrir página do admin
echo Abrindo pagina do ADMIN: /admin/suporte
start http://localhost:8080/admin/suporte

echo.
echo [3/3] Instrucoes de teste:
echo.
echo ========================================
echo   COMO TESTAR
echo ========================================
echo.
echo 1. Na aba CLIENTE (/suporte):
echo    - Clique em "Nova Conversa"
echo    - Digite um assunto (ex: "Duvida sobre pedido")
echo    - Digite uma mensagem
echo    - Envie
echo.
echo 2. Na aba ADMIN (/admin/suporte):
echo    - A conversa deve aparecer na lista
echo    - Clique para abrir
echo    - Teste os atalhos de teclado:
echo      * Ctrl+1 = Saudacao
echo      * Ctrl+2 = Prazo
echo      * Ctrl+3 = Pagamento
echo      * Ctrl+4 = Envio
echo      * Ctrl+5 = Agradecimento
echo    - Digite uma resposta e envie
echo.
echo 3. Volte para a aba CLIENTE:
echo    - A resposta deve aparecer automaticamente
echo.
echo ========================================
echo   ATALHOS DE TECLADO (ADMIN)
echo ========================================
echo.
echo Ctrl+1 = Saudacao Inicial
echo Ctrl+2 = Prazo de Producao
echo Ctrl+3 = Verificar Pagamento
echo Ctrl+4 = Informar Envio
echo Ctrl+5 = Agradecimento Final
echo Ctrl+6 = Solicitar Mais Informacoes
echo Ctrl+7 = Problema Tecnico
echo Ctrl+8 = Reembolso
echo.
echo ========================================
echo   VERIFICAR NO SUPABASE
echo ========================================
echo.
echo Execute no SQL Editor:
echo.
echo -- Ver conversas
echo SELECT * FROM support_conversations;
echo.
echo -- Ver mensagens
echo SELECT * FROM support_messages;
echo.
echo -- Ver respostas rapidas
echo SELECT * FROM support_quick_replies;
echo.
echo ========================================
echo.
echo Pressione qualquer tecla para fechar...
pause >nul
