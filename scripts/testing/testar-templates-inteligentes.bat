@echo off
echo ========================================
echo TESTE: Templates Inteligentes
echo ========================================
echo.
echo Este script testa o sistema de templates
echo com mensagens inteligentes.
echo.
echo TESTES A REALIZAR:
echo.
echo 1. Abrir chat admin
echo 2. Selecionar um cliente SEM pedidos
echo 3. Usar template "Rastreio de Pedido"
echo 4. Verificar mensagem: "Voce ainda nao tem pedidos"
echo.
echo 5. Selecionar cliente COM pedido
echo 6. Usar mesmo template
echo 7. Verificar dados reais aparecem
echo.
echo ========================================
echo TEMPLATES DISPONIVEIS NO BANCO:
echo ========================================
echo.
echo - Rastreio de Pedido
echo - Status do Orcamento
echo - Confirmacao de Pagamento
echo - Status da Assinatura
echo - Informacoes de Preco
echo - Vagas Disponiveis
echo - Cronograma do Lote
echo.
echo ========================================
echo VARIAVEIS TESTADAS:
echo ========================================
echo.
echo PEDIDOS:
echo   - ULTIMO_PEDIDO_ID
echo   - ULTIMO_PEDIDO_STATUS
echo   - ULTIMO_PEDIDO_RASTREIO
echo   - ULTIMO_PEDIDO_DATA
echo.
echo ORCAMENTOS:
echo   - ULTIMO_ORCAMENTO_ID
echo   - ULTIMO_ORCAMENTO_VALOR
echo.
echo PAGAMENTOS:
echo   - ULTIMO_PAGAMENTO_VALOR
echo   - ULTIMO_PAGAMENTO_STATUS
echo.
echo ASSINATURAS:
echo   - ASSINATURA_PLANO
echo   - ASSINATURA_STATUS
echo.
echo PRECOS (SSOT):
echo   - PRECO_PADRAO
echo   - PRECO_PIX
echo   - DESCONTO_PIX
echo   - LIMITE_MENSAL
echo   - VAGAS_DISPONIVEIS
echo.
echo ========================================
echo RESULTADO ESPERADO:
echo ========================================
echo.
echo SEM DADOS:
echo   "Voce ainda nao tem pedidos registrados"
echo   (Linhas de detalhes removidas)
echo.
echo COM DADOS:
echo   "Seu pedido #abc123 ja foi enviado"
echo   "Codigo de rastreamento: BR123456789BR"
echo.
echo ========================================
echo.
pause
