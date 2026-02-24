-- Templates de Respostas Rápidas com Variáveis Dinâmicas
-- Execute no Supabase SQL Editor

-- Limpar templates antigos (opcional)
-- DELETE FROM quick_replies WHERE category IN ('rastreamento', 'pedido', 'pagamento');

-- Templates de Rastreamento
INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES
('rastreamento', 'Informar Código de Rastreio', 
'Olá {{NOME_CLIENTE}}! 👋

Seu pedido {{ULTIMO_PEDIDO_ID}} já foi enviado! 📦

🔍 Código de rastreamento: {{ULTIMO_PEDIDO_RASTREIO}}

Você pode acompanhar a entrega através dos Correios ou transportadora.

Qualquer dúvida, estou à disposição!', 
10, true),

('rastreamento', 'Pedido em Produção',
'Oi {{NOME_CLIENTE}}! 😊

Seu pedido {{ULTIMO_PEDIDO_ID}} está em produção! 🎨

Status atual: {{ULTIMO_PEDIDO_STATUS}}
Data do pedido: {{ULTIMO_PEDIDO_DATA}}

Assim que estiver pronto para envio, você receberá o código de rastreamento.

Previsão de conclusão: 7-10 dias úteis.', 
11, true);

-- Templates de Pedido
INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES
('pedido', 'Status do Pedido',
'Olá {{NOME_CLIENTE}}! 👋

Consultei seu pedido {{ULTIMO_PEDIDO_ID}} aqui no sistema.

📊 Status atual: {{ULTIMO_PEDIDO_STATUS}}
📅 Data do pedido: {{ULTIMO_PEDIDO_DATA}}

Tudo está correndo conforme o planejado! 

Alguma dúvida específica sobre o pedido?', 
20, true),

('pedido', 'Pedido Entregue',
'Oi {{NOME_CLIENTE}}! 🎉

Seu pedido {{ULTIMO_PEDIDO_ID}} foi entregue com sucesso!

Esperamos que você tenha gostado! 😊

Se puder, adoraríamos ver fotos da sua coleção! 📸

Avalie sua experiência conosco e ganhe 10% de desconto na próxima compra!', 
21, true);

-- Templates de Pagamento
INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES
('pagamento', 'Confirmar Pagamento',
'Olá {{NOME_CLIENTE}}! 👋

Confirmamos o recebimento do seu pagamento! ✅

💰 Valor: {{ULTIMO_PAGAMENTO_VALOR}}
📊 Status: {{ULTIMO_PAGAMENTO_STATUS}}

Seu pedido já está sendo processado!

Obrigado pela confiança! 🙏', 
30, true),

('pagamento', 'Aguardando Pagamento',
'Oi {{NOME_CLIENTE}}! 😊

Estamos aguardando a confirmação do seu pagamento.

💰 Valor: {{ULTIMO_PAGAMENTO_VALOR}}
📊 Status: {{ULTIMO_PAGAMENTO_STATUS}}

Assim que o pagamento for confirmado, iniciaremos a produção do seu pedido.

Já realizou o pagamento? Me envie o comprovante para agilizar! 📸', 
31, true);

-- Templates de Orçamento
INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES
('orcamento', 'Orçamento Aprovado',
'Olá {{NOME_CLIENTE}}! 🎉

Seu orçamento {{ULTIMO_ORCAMENTO_ID}} foi aprovado!

💰 Valor total: {{ULTIMO_ORCAMENTO_VALOR}}

Para prosseguir com o pedido, basta realizar o pagamento.

Aceita PIX? Tenho 5% de desconto! 💚', 
40, true),

('orcamento', 'Lembrar Orçamento Pendente',
'Oi {{NOME_CLIENTE}}! 👋

Vi que você tem um orçamento pendente:

📋 Orçamento: {{ULTIMO_ORCAMENTO_ID}}
💰 Valor: {{ULTIMO_ORCAMENTO_VALOR}}

Ainda tem interesse? Posso te ajudar com alguma dúvida?

Esse orçamento é válido por 7 dias! ⏰', 
41, true);

-- Templates de Assinatura
INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES
('outro', 'Status da Assinatura',
'Olá {{NOME_CLIENTE}}! 👋

Consultei sua assinatura aqui:

📦 Plano: {{ASSINATURA_PLANO}}
📊 Status: {{ASSINATURA_STATUS}}

Tudo certo com sua assinatura! 

Alguma dúvida sobre os benefícios do seu plano?', 
50, true);

-- Templates Gerais com Data/Hora
INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES
('saudacao', 'Bom dia Personalizado',
'Bom dia, {{NOME_CLIENTE}}! ☀️

Hoje é {{DATA_HOJE}} e são {{HORA_ATUAL}}.

Como posso te ajudar hoje? 😊', 
5, true),

('despedida', 'Despedida Personalizada',
'Obrigado pelo contato, {{NOME_CLIENTE}}! 🙏

Qualquer dúvida, estou por aqui!

Atendimento realizado em {{DATA_HOJE}} às {{HORA_ATUAL}}.

Tenha um ótimo dia! ✨', 
60, true);

-- Verificar templates criados
SELECT 
  category,
  title,
  LEFT(message, 50) || '...' as preview,
  display_order,
  is_active
FROM quick_replies
WHERE category IN ('rastreamento', 'pedido', 'pagamento', 'orcamento', 'outro', 'saudacao', 'despedida')
ORDER BY display_order;
