-- =====================================================
-- ORDER STATUS TEMPLATES - Templates de NotificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o AutomÃƒÆ’Ã‚Â¡tica
-- =====================================================
-- Criado em: 21 de Fevereiro de 2026
-- DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: Templates para notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes automÃƒÆ’Ã‚Â¡ticas de mudanÃƒÆ’Ã‚Â§a de status de pedidos
-- Relacionado: Sistema de Chat Centralizado - AutomaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Status (Requirement 6)
-- =====================================================

-- =====================================================
-- 1. ORDER_STATUS_TEMPLATES - Templates de Status de Pedidos
-- =====================================================
CREATE TABLE IF NOT EXISTS order_status_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL UNIQUE CHECK (status IN ('aguardando_pagamento', 'em_producao', 'enviado', 'entregue')),
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÃƒÆ’Ã‚Ândice para busca rÃƒÆ’Ã‚Â¡pida por status
CREATE INDEX IF NOT EXISTS idx_order_status_templates_status ON order_status_templates(status);
CREATE INDEX IF NOT EXISTS idx_order_status_templates_active ON order_status_templates(is_active);

-- Trigger para updated_at
CREATE TRIGGER update_order_status_templates_updated_at
  BEFORE UPDATE ON order_status_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. DADOS INICIAIS - Templates PadrÃƒÆ’Ã‚Â£o
-- =====================================================

-- Template: Aguardando Pagamento
INSERT INTO order_status_templates (status, message_template) VALUES
(
  'aguardando_pagamento',
  'OlÃƒÆ’Ã‚Â¡! Seu pedido #{order_number} estÃƒÆ’Ã‚Â¡ aguardando confirmaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de pagamento. Valor: R$ {amount}'
);

-- Template: Em ProduÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
INSERT INTO order_status_templates (status, message_template) VALUES
(
  'em_producao',
  'ÃƒÆ’Ã¢â‚¬Å“timas notÃƒÆ’Ã‚Â­cias! Seu pedido #{order_number} entrou em produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o. PrevisÃƒÆ’Ã‚Â£o de envio: {estimated_ship_date}'
);

-- Template: Enviado
INSERT INTO order_status_templates (status, message_template) VALUES
(
  'enviado',
  'Seu pedido #{order_number} foi enviado! ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦

CÃƒÆ’Ã‚Â³digo de rastreamento: {tracking_code}

Acompanhe em: {tracking_url}'
);

-- Template: Entregue
INSERT INTO order_status_templates (status, message_template) VALUES
(
  'entregue',
  'Seu pedido #{order_number} foi entregue! ÃƒÂ°Ã…Â¸Ã…Â½Ã¢â‚¬Â°

Esperamos que vocÃƒÆ’Ã‚Âª goste. Se tiver alguma dÃƒÆ’Ã‚Âºvida, estamos aqui para ajudar.'
);

-- =====================================================
-- 3. RLS POLICIES - SeguranÃƒÆ’Ã‚Â§a
-- =====================================================

-- Apenas admins podem gerenciar templates
ALTER TABLE order_status_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar templates de status"
  ON order_status_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Todos podem visualizar templates ativos"
  ON order_status_templates FOR SELECT
  USING (is_active = true);

-- =====================================================
-- COMENTÃƒÆ’Ã‚ÂRIOS
-- =====================================================

COMMENT ON TABLE order_status_templates IS 'Templates de mensagens automÃƒÆ’Ã‚Â¡ticas para notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de mudanÃƒÆ’Ã‚Â§a de status de pedidos';
COMMENT ON COLUMN order_status_templates.status IS 'Status do pedido: aguardando_pagamento | em_producao | enviado | entregue';
COMMENT ON COLUMN order_status_templates.message_template IS 'Template com variÃƒÆ’Ã‚Â¡veis: {order_number}, {amount}, {tracking_code}, {tracking_url}, {estimated_ship_date}';
COMMENT ON COLUMN order_status_templates.is_active IS 'Se false, o template nÃƒÆ’Ã‚Â£o serÃƒÆ’Ã‚Â¡ usado para notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes automÃƒÆ’Ã‚Â¡ticas';
