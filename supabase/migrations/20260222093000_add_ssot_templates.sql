-- Adicionar templates que usam variÃƒÂ¡veis SSOT (Single Source of Truth)
-- Todas as informaÃƒÂ§ÃƒÂµes vÃƒÂªm de system_settings e sÃƒÂ£o sempre atualizadas

INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES

-- Template com informaÃƒÂ§ÃƒÂµes de preÃƒÂ§o (SSOT)
('duvida', 'InformaÃƒÂ§ÃƒÂµes de PreÃƒÂ§o Atualizadas', 
'OlÃƒÂ¡ {{NOME_CLIENTE}}! Ã°Å¸ËœÅ 

Nossos preÃƒÂ§os atuais sÃƒÂ£o:
Ã°Å¸â€™Â° PreÃƒÂ§o normal: {{PRECO_PADRAO}}
Ã°Å¸â€™Å¡ PreÃƒÂ§o no PIX: {{PRECO_PIX}} ({{DESCONTO_PIX}} de desconto = {{DESCONTO_PIX_VALOR}} de economia!)
Ã°Å¸â€œÂ¥ Entrada: {{VALOR_ENTRADA}}

Pagando no PIX vocÃƒÂª economiza {{DESCONTO_PIX_VALOR}}! Ã°Å¸Å½â€°', 
50, true),

-- Template com limite de produÃƒÂ§ÃƒÂ£o (SSOT)
('duvida', 'Vagas DisponÃƒÂ­veis', 
'OlÃƒÂ¡ {{NOME_CLIENTE}}! 

Ã°Å¸â€œÅ  Status de ProduÃƒÂ§ÃƒÂ£o do MÃƒÂªs:
Ã¢â‚¬Â¢ Limite mensal: {{LIMITE_MENSAL}}
Ã¢â‚¬Â¢ JÃƒÂ¡ vendidas: {{VENDAS_MES_ATUAL}}
Ã¢â‚¬Â¢ Vagas restantes: {{VAGAS_DISPONIVEIS}}
Ã¢â‚¬Â¢ Percentual ocupado: {{PERCENTUAL_VENDIDO}}

As vendas abrem todo {{DIA_ABERTURA_VENDAS}} do mÃƒÂªs! Ã°Å¸â€œâ€¦

Garanta sua vaga enquanto hÃƒÂ¡ disponibilidade! Ã°Å¸Å½Â¯', 
51, true),

-- Template completo com todas as informaÃƒÂ§ÃƒÂµes (SSOT + Cliente)
('pedido', 'Resumo Completo do Pedido', 
'OlÃƒÂ¡ {{NOME_CLIENTE}}! Ã°Å¸â€˜â€¹

Ã°Å¸â€œÂ¦ INFORMAÃƒâ€¡Ãƒâ€¢ES DO SEU PEDIDO:
Ã¢â‚¬Â¢ Pedido: {{ULTIMO_PEDIDO_ID}}
Ã¢â‚¬Â¢ Status: {{ULTIMO_PEDIDO_STATUS}}
Ã¢â‚¬Â¢ Rastreio: {{ULTIMO_PEDIDO_RASTREIO}}
Ã¢â‚¬Â¢ Data: {{ULTIMO_PEDIDO_DATA}}

Ã°Å¸â€™Â° VALORES ATUAIS:
Ã¢â‚¬Â¢ PreÃƒÂ§o normal: {{PRECO_PADRAO}}
Ã¢â‚¬Â¢ PreÃƒÂ§o PIX: {{PRECO_PIX}} (economize {{DESCONTO_PIX_VALOR}}!)
Ã¢â‚¬Â¢ Entrada: {{VALOR_ENTRADA}}

Ã°Å¸â€œÅ  DISPONIBILIDADE:
Ã¢â‚¬Â¢ Vagas restantes este mÃƒÂªs: {{VAGAS_DISPONIVEIS}}
Ã¢â‚¬Â¢ Vendas abrem: {{DIA_ABERTURA_VENDAS}}

Alguma dÃƒÂºvida? Estou aqui para ajudar! Ã°Å¸ËœÅ ', 
52, true),

-- Template de urgÃƒÂªncia com vagas
('pedido', 'ÃƒÅ¡ltimas Vagas do MÃƒÂªs', 
'Ã¢Å¡Â Ã¯Â¸Â ATENÃƒâ€¡ÃƒÆ’O {{NOME_CLIENTE}}!

Estamos com {{VAGAS_DISPONIVEIS}} disponÃƒÂ­veis este mÃƒÂªs!
JÃƒÂ¡ foram vendidas {{VENDAS_MES_ATUAL}} de {{LIMITE_MENSAL}}.

Isso representa {{PERCENTUAL_VENDIDO}} do limite mensal! Ã°Å¸â€œÅ 

Ã°Å¸â€™Å¡ Aproveite o desconto PIX:
De {{PRECO_PADRAO}} por apenas {{PRECO_PIX}}
Economia de {{DESCONTO_PIX_VALOR}}!

Garanta sua vaga agora! As prÃƒÂ³ximas vendas sÃƒÂ³ abrem no {{DIA_ABERTURA_VENDAS}} do prÃƒÂ³ximo mÃƒÂªs. Ã°Å¸Å½Â¯', 
53, true),

-- Template de promoÃƒÂ§ÃƒÂ£o PIX
('pagamento', 'Desconto PIX Especial', 
'OlÃƒÂ¡ {{NOME_CLIENTE}}! Ã°Å¸â€™Å¡

Temos uma condiÃƒÂ§ÃƒÂ£o especial para pagamento no PIX:

Ã°Å¸â€™Â° PreÃƒÂ§o normal: {{PRECO_PADRAO}}
Ã°Å¸â€™Å¡ PreÃƒÂ§o no PIX: {{PRECO_PIX}}
Ã°Å¸Å½â€° VocÃƒÂª economiza: {{DESCONTO_PIX_VALOR}} ({{DESCONTO_PIX}})!

Ã°Å¸â€œÂ¥ Entrada de apenas {{VALOR_ENTRADA}}

O desconto PIX ÃƒÂ© aplicado automaticamente no checkout! 

Quer prosseguir com o pagamento? Ã°Å¸ËœÅ ', 
54, true),

-- Template de assinatura com preÃƒÂ§os
('duvida', 'Planos de Assinatura', 
'OlÃƒÂ¡ {{NOME_CLIENTE}}! 

Ã°Å¸â€œÂ¦ ASSINATURA DE COLEÃƒâ€¡Ãƒâ€¢ES:

Sua assinatura atual: {{ASSINATURA_PLANO}}
Status: {{ASSINATURA_STATUS}}

Ã°Å¸â€™Â° VALORES PARA NOVAS ASSINATURAS:
Ã¢â‚¬Â¢ PreÃƒÂ§o por peÃƒÂ§a: {{PRECO_PADRAO}}
Ã¢â‚¬Â¢ No PIX: {{PRECO_PIX}} ({{DESCONTO_PIX}} OFF)
Ã¢â‚¬Â¢ Entrada: {{VALOR_ENTRADA}}

Ã°Å¸â€œÅ  Disponibilidade: {{VAGAS_DISPONIVEIS}} este mÃƒÂªs

Quer conhecer nossos planos? Ã°Å¸Å½Â¯', 
55, true),

-- Template de informaÃƒÂ§ÃƒÂµes gerais
('duvida', 'InformaÃƒÂ§ÃƒÂµes Gerais', 
'OlÃƒÂ¡ {{NOME_CLIENTE}}! Ã°Å¸ËœÅ 

Ã°Å¸â€œâ€¹ INFORMAÃƒâ€¡Ãƒâ€¢ES ATUALIZADAS:

Ã°Å¸â€™Â° PREÃƒâ€¡OS:
Ã¢â‚¬Â¢ Normal: {{PRECO_PADRAO}}
Ã¢â‚¬Â¢ PIX ({{DESCONTO_PIX}} OFF): {{PRECO_PIX}}
Ã¢â‚¬Â¢ Entrada: {{VALOR_ENTRADA}}

Ã°Å¸â€œÅ  PRODUÃƒâ€¡ÃƒÆ’O:
Ã¢â‚¬Â¢ Limite mensal: {{LIMITE_MENSAL}}
Ã¢â‚¬Â¢ Vagas disponÃƒÂ­veis: {{VAGAS_DISPONIVEIS}}
Ã¢â‚¬Â¢ Abertura de vendas: {{DIA_ABERTURA_VENDAS}}

Ã°Å¸â€œÂ¦ SEU ÃƒÅ¡LTIMO PEDIDO:
Ã¢â‚¬Â¢ ID: {{ULTIMO_PEDIDO_ID}}
Ã¢â‚¬Â¢ Status: {{ULTIMO_PEDIDO_STATUS}}

Como posso ajudar? Ã°Å¸Å½Â¯', 
56, true)

ON CONFLICT (id) DO NOTHING;

-- ComentÃƒÂ¡rio
COMMENT ON TABLE quick_replies IS 'Templates de respostas rÃƒÂ¡pidas com suporte a variÃƒÂ¡veis SSOT (Single Source of Truth)';
