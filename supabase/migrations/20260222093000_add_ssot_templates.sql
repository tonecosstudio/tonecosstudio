-- Adicionar templates que usam variáveis SSOT (Single Source of Truth)
-- Todas as informações vêm de system_settings e são sempre atualizadas

INSERT INTO quick_replies (category, title, message, display_order, is_active) VALUES

-- Template com informações de preço (SSOT)
('duvida', 'Informações de Preço Atualizadas', 
'Olá {{NOME_CLIENTE}}! 😊

Nossos preços atuais são:
💰 Preço normal: {{PRECO_PADRAO}}
💚 Preço no PIX: {{PRECO_PIX}} ({{DESCONTO_PIX}} de desconto = {{DESCONTO_PIX_VALOR}} de economia!)
📥 Entrada: {{VALOR_ENTRADA}}

Pagando no PIX você economiza {{DESCONTO_PIX_VALOR}}! 🎉', 
50, true),

-- Template com limite de produção (SSOT)
('duvida', 'Vagas Disponíveis', 
'Olá {{NOME_CLIENTE}}! 

📊 Status de Produção do Mês:
• Limite mensal: {{LIMITE_MENSAL}}
• Já vendidas: {{VENDAS_MES_ATUAL}}
• Vagas restantes: {{VAGAS_DISPONIVEIS}}
• Percentual ocupado: {{PERCENTUAL_VENDIDO}}

As vendas abrem todo {{DIA_ABERTURA_VENDAS}} do mês! 📅

Garanta sua vaga enquanto há disponibilidade! 🎯', 
51, true),

-- Template completo com todas as informações (SSOT + Cliente)
('pedido', 'Resumo Completo do Pedido', 
'Olá {{NOME_CLIENTE}}! 👋

📦 INFORMAÇÕES DO SEU PEDIDO:
• Pedido: {{ULTIMO_PEDIDO_ID}}
• Status: {{ULTIMO_PEDIDO_STATUS}}
• Rastreio: {{ULTIMO_PEDIDO_RASTREIO}}
• Data: {{ULTIMO_PEDIDO_DATA}}

💰 VALORES ATUAIS:
• Preço normal: {{PRECO_PADRAO}}
• Preço PIX: {{PRECO_PIX}} (economize {{DESCONTO_PIX_VALOR}}!)
• Entrada: {{VALOR_ENTRADA}}

📊 DISPONIBILIDADE:
• Vagas restantes este mês: {{VAGAS_DISPONIVEIS}}
• Vendas abrem: {{DIA_ABERTURA_VENDAS}}

Alguma dúvida? Estou aqui para ajudar! 😊', 
52, true),

-- Template de urgência com vagas
('pedido', 'Últimas Vagas do Mês', 
'⚠️ ATENÇÃO {{NOME_CLIENTE}}!

Estamos com {{VAGAS_DISPONIVEIS}} disponíveis este mês!
Já foram vendidas {{VENDAS_MES_ATUAL}} de {{LIMITE_MENSAL}}.

Isso representa {{PERCENTUAL_VENDIDO}} do limite mensal! 📊

💚 Aproveite o desconto PIX:
De {{PRECO_PADRAO}} por apenas {{PRECO_PIX}}
Economia de {{DESCONTO_PIX_VALOR}}!

Garanta sua vaga agora! As próximas vendas só abrem no {{DIA_ABERTURA_VENDAS}} do próximo mês. 🎯', 
53, true),

-- Template de promoção PIX
('pagamento', 'Desconto PIX Especial', 
'Olá {{NOME_CLIENTE}}! 💚

Temos uma condição especial para pagamento no PIX:

💰 Preço normal: {{PRECO_PADRAO}}
💚 Preço no PIX: {{PRECO_PIX}}
🎉 Você economiza: {{DESCONTO_PIX_VALOR}} ({{DESCONTO_PIX}})!

📥 Entrada de apenas {{VALOR_ENTRADA}}

O desconto PIX é aplicado automaticamente no checkout! 

Quer prosseguir com o pagamento? 😊', 
54, true),

-- Template de assinatura com preços
('duvida', 'Planos de Assinatura', 
'Olá {{NOME_CLIENTE}}! 

📦 ASSINATURA DE COLEÇÕES:

Sua assinatura atual: {{ASSINATURA_PLANO}}
Status: {{ASSINATURA_STATUS}}

💰 VALORES PARA NOVAS ASSINATURAS:
• Preço por peça: {{PRECO_PADRAO}}
• No PIX: {{PRECO_PIX}} ({{DESCONTO_PIX}} OFF)
• Entrada: {{VALOR_ENTRADA}}

📊 Disponibilidade: {{VAGAS_DISPONIVEIS}} este mês

Quer conhecer nossos planos? 🎯', 
55, true),

-- Template de informações gerais
('duvida', 'Informações Gerais', 
'Olá {{NOME_CLIENTE}}! 😊

📋 INFORMAÇÕES ATUALIZADAS:

💰 PREÇOS:
• Normal: {{PRECO_PADRAO}}
• PIX ({{DESCONTO_PIX}} OFF): {{PRECO_PIX}}
• Entrada: {{VALOR_ENTRADA}}

📊 PRODUÇÃO:
• Limite mensal: {{LIMITE_MENSAL}}
• Vagas disponíveis: {{VAGAS_DISPONIVEIS}}
• Abertura de vendas: {{DIA_ABERTURA_VENDAS}}

📦 SEU ÚLTIMO PEDIDO:
• ID: {{ULTIMO_PEDIDO_ID}}
• Status: {{ULTIMO_PEDIDO_STATUS}}

Como posso ajudar? 🎯', 
56, true)

ON CONFLICT (id) DO NOTHING;

-- Comentário
COMMENT ON TABLE quick_replies IS 'Templates de respostas rápidas com suporte a variáveis SSOT (Single Source of Truth)';
