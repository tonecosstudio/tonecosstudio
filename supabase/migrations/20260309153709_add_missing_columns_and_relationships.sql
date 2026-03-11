-- =====================================================
-- Migration: Add Missing Columns and Relationships
-- Description: Adicionar colunas e tabelas faltantes para compatibilidade com frontend
-- =====================================================

-- =====================================================
-- 1. Adicionar colunas faltantes em quotes
-- =====================================================
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- 2. Adicionar colunas faltantes em subscription_deliveries
-- =====================================================
ALTER TABLE subscription_deliveries ADD COLUMN IF NOT EXISTS delivery_number INTEGER;
ALTER TABLE subscription_deliveries ADD COLUMN IF NOT EXISTS delivery_order INTEGER;
ALTER TABLE subscription_deliveries ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE subscription_deliveries ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMPTZ;
ALTER TABLE subscription_deliveries ADD COLUMN IF NOT EXISTS delivered_date TIMESTAMPTZ;
ALTER TABLE subscription_deliveries ADD COLUMN IF NOT EXISTS shipping_date TIMESTAMPTZ;
ALTER TABLE subscription_deliveries ADD COLUMN IF NOT EXISTS reveal_date TIMESTAMPTZ;

-- =====================================================
-- 3. Adicionar colunas faltantes em subscriptions
-- =====================================================
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_type TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS deliveries_completed INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS deliveries_total INTEGER DEFAULT 0;

-- =====================================================
-- 4. Adicionar colunas faltantes em standalone_purchases
-- =====================================================
ALTER TABLE standalone_purchases ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE standalone_purchases ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE standalone_purchases ADD COLUMN IF NOT EXISTS payment_link TEXT;
ALTER TABLE standalone_purchases ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE standalone_purchases ADD COLUMN IF NOT EXISTS shipping_carrier TEXT;
ALTER TABLE standalone_purchases ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- 5. Adicionar colunas faltantes em collections
-- =====================================================
ALTER TABLE collections ADD COLUMN IF NOT EXISTS slug TEXT;

-- Criar índice único para slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);

-- =====================================================
-- 6. Criar tabela admin_payment_methods
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  instructions TEXT,
  pix_key TEXT,
  payment_link TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_admin_payment_methods_active ON admin_payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_payment_methods_type ON admin_payment_methods(type);

-- RLS
ALTER TABLE admin_payment_methods ENABLE ROW LEVEL SECURITY;

-- Todos podem ver métodos ativos
CREATE POLICY "Anyone can view active payment methods"
  ON admin_payment_methods FOR SELECT
  USING (is_active = true);

-- Admins podem ver todos
CREATE POLICY "Admins can view all payment methods"
  ON admin_payment_methods FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage payment methods"
  ON admin_payment_methods FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- Trigger
CREATE TRIGGER set_updated_at_admin_payment_methods
  BEFORE UPDATE ON admin_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 7. Adicionar payment_method_id a manual_payments
-- =====================================================
ALTER TABLE manual_payments ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES admin_payment_methods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_manual_payments_payment_method ON manual_payments(payment_method_id);

-- =====================================================
-- 8. Dados iniciais - Métodos de pagamento
-- =====================================================
INSERT INTO admin_payment_methods (name, type, instructions, display_order)
VALUES
  ('PIX', 'pix', 'Transferência via PIX', 1),
  ('Transferência Bancária', 'bank_transfer', 'Transferência bancária tradicional', 2),
  ('Boleto', 'boleto', 'Pagamento via boleto bancário', 3),
  ('Link de Pagamento', 'payment_link', 'Link de pagamento online', 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE admin_payment_methods IS 'Métodos de pagamento configurados pelos administradores';
COMMENT ON COLUMN quotes.deadline IS 'Prazo limite para o orçamento';
COMMENT ON COLUMN subscriptions.plan_type IS 'Tipo do plano de assinatura';
COMMENT ON COLUMN collections.slug IS 'Slug único para URLs amigáveis';
