-- =====================================================
-- ORDER STATUS TEMPLATES - Templates de Notificação Automática
-- =====================================================
-- Criado em: 21 de Fevereiro de 2026
-- Descrição: Templates para notificações automáticas de mudança de status de pedidos
-- Relacionado: Sistema de Chat Centralizado - Automação de Status (Requirement 6)
-- =====================================================

-- =====================================================
-- 1. ORDER_STATUS_TEMPLATES - Templates de Status de Pedidos
-- =====================================================
CREATE TABLE order_status_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL UNIQUE CHECK (status IN ('aguardando_pagamento', 'em_producao', 'enviado', 'entregue')),
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para busca rápida por status
CREATE INDEX idx_order_status_templates_status ON order_status_templates(status);
CREATE INDEX idx_order_status_templates_active ON order_status_templates(is_active);

-- Trigger para updated_at
CREATE TRIGGER update_order_status_templates_updated_at
  BEFORE UPDATE ON order_status_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. DADOS INICIAIS - Templates Padrão
-- =====================================================

-- Template: Aguardando Pagamento
INSERT INTO order_status_templates (status, message_template) VALUES
(
  'aguardando_pagamento',
  'Olá! Seu pedido #{order_number} está aguardando confirmação de pagamento. Valor: R$ {amount}'
);

-- Template: Em Produção
INSERT INTO order_status_templates (status, message_template) VALUES
(
  'em_producao',
  'Ótimas notícias! Seu pedido #{order_number} entrou em produção. Previsão de envio: {estimated_ship_date}'
);

-- Template: Enviado
INSERT INTO order_status_templates (status, message_template) VALUES
(
  'enviado',
  'Seu pedido #{order_number} foi enviado! 📦

Código de rastreamento: {tracking_code}

Acompanhe em: {tracking_url}'
);

-- Template: Entregue
INSERT INTO order_status_templates (status, message_template) VALUES
(
  'entregue',
  'Seu pedido #{order_number} foi entregue! 🎉

Esperamos que você goste. Se tiver alguma dúvida, estamos aqui para ajudar.'
);

-- =====================================================
-- 3. RLS POLICIES - Segurança
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
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE order_status_templates IS 'Templates de mensagens automáticas para notificações de mudança de status de pedidos';
COMMENT ON COLUMN order_status_templates.status IS 'Status do pedido: aguardando_pagamento | em_producao | enviado | entregue';
COMMENT ON COLUMN order_status_templates.message_template IS 'Template com variáveis: {order_number}, {amount}, {tracking_code}, {tracking_url}, {estimated_ship_date}';
COMMENT ON COLUMN order_status_templates.is_active IS 'Se false, o template não será usado para notificações automáticas';
