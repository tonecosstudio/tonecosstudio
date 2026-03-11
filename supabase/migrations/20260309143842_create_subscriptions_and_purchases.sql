-- =====================================================
-- Migration: Create Subscriptions and Purchases
-- Description: Sistema de assinaturas e compras avulsas
-- =====================================================

-- Criar enums
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'suspended', 'expired');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE purchase_status AS ENUM ('pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled');

-- =====================================================
-- SUBSCRIPTION_PLANS (Planos de assinatura)
-- =====================================================
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  characters_per_cycle INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Inserir planos padrão
INSERT INTO subscription_plans (name, description, price, characters_per_cycle) VALUES
  ('Básico', 'Receba 1 personagem por mês', 150.00, 1),
  ('Premium', 'Receba 2 personagens por mês', 280.00, 2),
  ('Colecionador', 'Receba 3 personagens por mês', 400.00, 3);

-- =====================================================
-- SUBSCRIPTIONS (Assinaturas dos usuários)
-- =====================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
  status subscription_status DEFAULT 'active' NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  payment_status payment_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);

-- =====================================================
-- SUBSCRIPTION_DELIVERIES (Entregas de assinaturas)
-- =====================================================
CREATE TABLE subscription_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  cycle_id UUID REFERENCES cycles(id) NOT NULL,
  character_id UUID REFERENCES characters(id),
  status purchase_status DEFAULT 'pending' NOT NULL,
  delivery_date DATE,
  tracking_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_subscription_deliveries_subscription_id ON subscription_deliveries(subscription_id);
CREATE INDEX idx_subscription_deliveries_cycle_id ON subscription_deliveries(cycle_id);
CREATE INDEX idx_subscription_deliveries_status ON subscription_deliveries(status);

-- =====================================================
-- STANDALONE_PURCHASES (Compras avulsas)
-- =====================================================
CREATE TABLE standalone_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  character_id UUID REFERENCES characters(id) NOT NULL,
  cycle_id UUID REFERENCES cycles(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status purchase_status DEFAULT 'pending' NOT NULL,
  payment_status payment_status DEFAULT 'pending' NOT NULL,
  payment_method TEXT,
  tracking_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_standalone_purchases_user_id ON standalone_purchases(user_id);
CREATE INDEX idx_standalone_purchases_status ON standalone_purchases(status);
CREATE INDEX idx_standalone_purchases_cycle_id ON standalone_purchases(cycle_id);

-- =====================================================
-- MANUAL_PAYMENTS (Pagamentos manuais)
-- =====================================================
CREATE TABLE manual_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status payment_status DEFAULT 'pending' NOT NULL,
  payment_method TEXT,
  reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_manual_payments_user_id ON manual_payments(user_id);
CREATE INDEX idx_manual_payments_status ON manual_payments(status);

-- =====================================================
-- QUOTES (Orçamentos/Pedidos)
-- =====================================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  payment_status payment_status DEFAULT 'pending' NOT NULL,
  is_preorder BOOLEAN DEFAULT false,
  deposit_amount DECIMAL(10,2),
  remaining_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Subscription Plans: Todos podem ver ativos
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_plans_select_all"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "subscription_plans_modify_admin"
  ON subscription_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Subscriptions: Usuários veem suas próprias, admins veem todas
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_select_admin"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "subscriptions_insert_own"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_modify_admin"
  ON subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Subscription Deliveries: Usuários veem suas próprias
ALTER TABLE subscription_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_deliveries_select_own"
  ON subscription_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_deliveries.subscription_id
      AND subscriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "subscription_deliveries_select_admin"
  ON subscription_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "subscription_deliveries_modify_admin"
  ON subscription_deliveries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Standalone Purchases: Usuários veem suas próprias
ALTER TABLE standalone_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "standalone_purchases_select_own"
  ON standalone_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "standalone_purchases_select_admin"
  ON standalone_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "standalone_purchases_insert_own"
  ON standalone_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "standalone_purchases_modify_admin"
  ON standalone_purchases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Manual Payments: Usuários veem seus próprios
ALTER TABLE manual_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manual_payments_select_own"
  ON manual_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "manual_payments_select_admin"
  ON manual_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "manual_payments_modify_admin"
  ON manual_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Quotes: Usuários veem seus próprios
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_select_own"
  ON quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "quotes_select_admin"
  ON quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "quotes_insert_own"
  ON quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quotes_modify_admin"
  ON quotes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER set_updated_at_subscription_plans
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_subscription_deliveries
  BEFORE UPDATE ON subscription_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_standalone_purchases
  BEFORE UPDATE ON standalone_purchases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_manual_payments
  BEFORE UPDATE ON manual_payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_quotes
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE subscription_plans IS 'Planos de assinatura disponíveis';
COMMENT ON TABLE subscriptions IS 'Assinaturas ativas dos usuários';
COMMENT ON TABLE subscription_deliveries IS 'Entregas programadas para assinantes';
COMMENT ON TABLE standalone_purchases IS 'Compras avulsas de personagens';
COMMENT ON TABLE manual_payments IS 'Pagamentos manuais processados pelo admin';
COMMENT ON TABLE quotes IS 'Orçamentos e pedidos dos clientes';
