-- Templates de Respostas RÃƒÂ¡pidas com VariÃƒÂ¡veis DinÃƒÂ¢micas

-- Templates de Rastreamento
INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES
('rastreamento', 'Informar CÃƒÂ³digo de Rastreio', 
'OlÃƒÂ¡ {{NOME_CLIENTE}}! Ã°Å¸â€˜â€¹

Seu pedido {{ULTIMO_PEDIDO_ID}} jÃƒÂ¡ foi enviado! Ã°Å¸â€œÂ¦

Ã°Å¸â€Â CÃƒÂ³digo de rastreamento: {{ULTIMO_PEDIDO_RASTREIO}}

VocÃƒÂª pode acompanhar a entrega atravÃƒÂ©s dos Correios ou transportadora.

Qualquer dÃƒÂºvida, estou ÃƒÂ  disposiÃƒÂ§ÃƒÂ£o!', 
10, true),

('rastreamento', 'Pedido em ProduÃƒÂ§ÃƒÂ£o',
'Oi {{NOME_CLIENTE}}! Ã°Å¸ËœÅ 

Seu pedido {{ULTIMO_PEDIDO_ID}} estÃƒÂ¡ em produÃƒÂ§ÃƒÂ£o! Ã°Å¸Å½Â¨

Status atual: {{ULTIMO_PEDIDO_STATUS}}
Data do pedido: {{ULTIMO_PEDIDO_DATA}}

Assim que estiver pronto para envio, vocÃƒÂª receberÃƒÂ¡ o cÃƒÂ³digo de rastreamento.

PrevisÃƒÂ£o de conclusÃƒÂ£o: 7-10 dias ÃƒÂºteis.', 
11, true);

-- Templates de Pedido
INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES
('pedido', 'Status do Pedido',
'OlÃƒÂ¡ {{NOME_CLIENTE}}! Ã°Å¸â€˜â€¹

Consultei seu pedido {{ULTIMO_PEDIDO_ID}} aqui no sistema.

Ã°Å¸â€œÅ  Status atual: {{ULTIMO_PEDIDO_STATUS}}
Ã°Å¸â€œâ€¦ Data do pedido: {{ULTIMO_PEDIDO_DATA}}

Tudo estÃƒÂ¡ correndo conforme o planejado! 

Alguma dÃƒÂºvida especÃƒÂ­fica sobre o pedido?', 
20, true),

('pedido', 'Pedido Entregue',
'Oi {{NOME_CLIENTE}}! Ã°Å¸Å½â€°

Seu pedido {{ULTIMO_PEDIDO_ID}} foi entregue com sucesso!

Esperamos que vocÃƒÂª tenha gostado! Ã°Å¸ËœÅ 

Se puder, adorarÃƒÂ­amos ver fotos da sua coleÃƒÂ§ÃƒÂ£o! Ã°Å¸â€œÂ¸

Avalie sua experiÃƒÂªncia conosco e ganhe 10% de desconto na prÃƒÂ³xima compra!', 
21, true);

-- Templates de Pagamento
INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES
('pagamento', 'Confirmar Pagamento',
'OlÃƒÂ¡ {{NOME_CLIENTE}}! Ã°Å¸â€˜â€¹

Confirmamos o recebimento do seu pagamento! Ã¢Å“â€¦

Ã°Å¸â€™Â° Valor: {{ULTIMO_PAGAMENTO_VALOR}}
Ã°Å¸â€œÅ  Status: {{ULTIMO_PAGAMENTO_STATUS}}

Seu pedido jÃƒÂ¡ estÃƒÂ¡ sendo processado!

Obrigado pela confianÃƒÂ§a! Ã°Å¸â„¢Â', 
30, true),

('pagamento', 'Aguardando Pagamento',
'Oi {{NOME_CLIENTE}}! Ã°Å¸ËœÅ 

Estamos aguardando a confirmaÃƒÂ§ÃƒÂ£o do seu pagamento.

Ã°Å¸â€™Â° Valor: {{ULTIMO_PAGAMENTO_VALOR}}
Ã°Å¸â€œÅ  Status: {{ULTIMO_PAGAMENTO_STATUS}}

Assim que o pagamento for confirmado, iniciaremos a produÃƒÂ§ÃƒÂ£o do seu pedido.

JÃƒÂ¡ realizou o pagamento? Me envie o comprovante para agilizar! Ã°Å¸â€œÂ¸', 
31, true);

-- Templates de OrÃƒÂ§amento
INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES
('orcamento', 'OrÃƒÂ§amento Aprovado',
'OlÃƒÂ¡ {{NOME_CLIENTE}}! Ã°Å¸Å½â€°

Seu orÃƒÂ§amento {{ULTIMO_ORCAMENTO_ID}} foi aprovado!

Ã°Å¸â€™Â° Valor total: {{ULTIMO_ORCAMENTO_VALOR}}

Para prosseguir com o pedido, basta realizar o pagamento.

Aceita PIX? Tenho 5% de desconto! Ã°Å¸â€™Å¡', 
40, true),

('orcamento', 'Lembrar OrÃƒÂ§amento Pendente',
'Oi {{NOME_CLIENTE}}! Ã°Å¸â€˜â€¹

Vi que vocÃƒÂª tem um orÃƒÂ§amento pendente:

Ã°Å¸â€œâ€¹ OrÃƒÂ§amento: {{ULTIMO_ORCAMENTO_ID}}
Ã°Å¸â€™Â° Valor: {{ULTIMO_ORCAMENTO_VALOR}}

Ainda tem interesse? Posso te ajudar com alguma dÃƒÂºvida?

Esse orÃƒÂ§amento ÃƒÂ© vÃƒÂ¡lido por 7 dias! Ã¢ÂÂ°', 
41, true);

-- Templates de Assinatura
INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES
('outro', 'Status da Assinatura',
'OlÃƒÂ¡ {{NOME_CLIENTE}}! Ã°Å¸â€˜â€¹

Consultei sua assinatura aqui:

Ã°Å¸â€œÂ¦ Plano: {{ASSINATURA_PLANO}}
Ã°Å¸â€œÅ  Status: {{ASSINATURA_STATUS}}

Tudo certo com sua assinatura! 

Alguma dÃƒÂºvida sobre os benefÃƒÂ­cios do seu plano?', 
50, true);

-- Templates Gerais com Data/Hora
INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES
('saudacao', 'Bom dia Personalizado',
'Bom dia, {{NOME_CLIENTE}}! Ã¢Ëœâ‚¬Ã¯Â¸Â

Hoje ÃƒÂ© {{DATA_HOJE}} e sÃƒÂ£o {{HORA_ATUAL}}.

Como posso te ajudar hoje? Ã°Å¸ËœÅ ', 
5, true),

('despedida', 'Despedida Personalizada',
'Obrigado pelo contato, {{NOME_CLIENTE}}! Ã°Å¸â„¢Â

Qualquer dÃƒÂºvida, estou por aqui!

Atendimento realizado em {{DATA_HOJE}} ÃƒÂ s {{HORA_ATUAL}}.

Tenha um ÃƒÂ³timo dia! Ã¢Å“Â¨', 
60, true);
