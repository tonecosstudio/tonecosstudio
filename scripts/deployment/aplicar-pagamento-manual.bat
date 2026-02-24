@echo off
echo ========================================
echo APLICAR MIGRATION - PAGAMENTO MANUAL
echo ========================================
echo.
echo Este script vai adicionar o sistema de pagamento manual
echo ao banco de dados.
echo.
echo O que sera feito:
echo - Adicionar campos em quotes (payment_link, pix_key, etc)
echo - Criar tabela payment_links
echo - Configurar notificacoes automaticas
echo.
pause

echo.
echo Aplicando migration...
echo.

supabase db push

echo.
echo ========================================
echo MIGRATION APLICADA COM SUCESSO!
echo ========================================
echo.
echo Proximos passos:
echo 1. Acesse /admin/pre-vendas
echo 2. Clique em "Enviar Link" em um pedido
echo 3. Cole o link do PicPay ou chave PIX
echo 4. Teste o fluxo completo
echo.
echo Documentacao completa em:
echo SISTEMA_PAGAMENTO_MANUAL_IMPLEMENTADO.md
echo.
pause
