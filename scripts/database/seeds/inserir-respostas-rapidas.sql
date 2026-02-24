-- Inserir respostas rápidas iniciais para o sistema de suporte

INSERT INTO support_quick_replies (title, message, category, shortcut)
VALUES 
  (
    'Saudação Inicial',
    'Olá! Obrigado por entrar em contato com a ORDAX. Como posso ajudar você hoje?',
    'geral',
    'Ctrl+1'
  ),
  (
    'Prazo de Produção',
    'O prazo de produção é de 30-45 dias após a confirmação do pagamento. Você receberá atualizações por email durante todo o processo.',
    'producao',
    'Ctrl+2'
  ),
  (
    'Verificar Pagamento',
    'Vou verificar o status do seu pagamento agora mesmo e retorno em breve com as informações.',
    'pagamentos',
    'Ctrl+3'
  ),
  (
    'Informar Envio',
    'Seu pedido será enviado em breve. Você receberá o código de rastreamento por email assim que for despachado.',
    'envio',
    'Ctrl+4'
  ),
  (
    'Agradecimento Final',
    'Obrigado pelo contato! Estamos à disposição para qualquer dúvida. Tenha um ótimo dia!',
    'geral',
    'Ctrl+5'
  ),
  (
    'Solicitar Mais Informações',
    'Para que eu possa ajudar melhor, você poderia fornecer mais detalhes sobre sua solicitação? Por exemplo, número do pedido, data da compra, etc.',
    'geral',
    'Ctrl+6'
  ),
  (
    'Status do Pedido',
    'Vou verificar o status do seu pedido agora mesmo. Por favor, me informe o número do pedido.',
    'pedidos',
    'Ctrl+7'
  ),
  (
    'Problema Resolvido',
    'Fico feliz em saber que conseguimos resolver! Se precisar de mais alguma coisa, estou à disposição.',
    'geral',
    'Ctrl+8'
  );
