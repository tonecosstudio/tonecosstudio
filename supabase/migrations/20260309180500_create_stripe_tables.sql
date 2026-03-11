-- =====================================================
-- STRIPE INTEGRATION TABLES
-- =====================================================
-- 
-- Tabelas para integração profissional com Stripe:
-- - stripe_customers: Clientes Stripe
-- - stripe_payment_intents: Intenções de pagamento
-- - stripe_subscriptions: Assinaturas
-- - stripe_refunds: Reembolsos
-- - stripe_webhook_events: Log de eventos webhook
--
-- Criado em: 2026-03-09
-- =====================================================

-- =====================================================
-- STRIPE CUSTOMERS
-- =====================================================
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Indexes
  CONSTRAINT stripe_customers_user_id_unique UNIQUE (user_id)
);

CREATE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_customer_id ON stripe_customers(stripe_customer_id);
CREATE INDEX idx_stripe_customers_email ON stripe_customers(email);

-- =====================================================
-- STRIPE PAYMENT INTENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS stripe_payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'brl',
  status TEXT NOT NULL,
  customer_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT stripe_payment_intents_status_check 
    CHECK (status IN ('requires_payment_method', 'requires_confirmation', 'requires_action', 
                      'processing', 'requires_capture', 'canceled', 'succeeded', 'failed'))
);

CREATE INDEX idx_stripe_payment_intents_stripe_id ON stripe_payment_intents(stripe_payment_intent_id);
CREATE INDEX idx_stripe_payment_intents_customer_id ON stripe_payment_intents(customer_id);
CREATE INDEX idx_stripe_payment_intents_status ON stripe_payment_intents(status);
CREATE INDEX idx_stripe_payment_intents_created_at ON stripe_payment_intents(created_at DESC);

-- =====================================================
-- STRIPE SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT stripe_subscriptions_status_check 
    CHECK (status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 
                      'past_due', 'canceled', 'unpaid', 'paused'))
);

CREATE INDEX idx_stripe_subscriptions_stripe_id ON stripe_subscriptions(stripe_subscription_id);
CREATE INDEX idx_stripe_subscriptions_customer_id ON stripe_subscriptions(customer_id);
CREATE INDEX idx_stripe_subscriptions_status ON stripe_subscriptions(status);
CREATE INDEX idx_stripe_subscriptions_created_at ON stripe_subscriptions(created_at DESC);

-- =====================================================
-- STRIPE REFUNDS
-- =====================================================
CREATE TABLE IF NOT EXISTS stripe_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_refund_id TEXT NOT NULL UNIQUE,
  payment_intent_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'brl',
  status TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT stripe_refunds_status_check 
    CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  CONSTRAINT stripe_refunds_reason_check 
    CHECK (reason IS NULL OR reason IN ('duplicate', 'fraudulent', 'requested_by_customer'))
);

CREATE INDEX idx_stripe_refunds_stripe_id ON stripe_refunds(stripe_refund_id);
CREATE INDEX idx_stripe_refunds_payment_intent_id ON stripe_refunds(payment_intent_id);
CREATE INDEX idx_stripe_refunds_status ON stripe_refunds(status);
CREATE INDEX idx_stripe_refunds_created_at ON stripe_refunds(created_at DESC);

-- =====================================================
-- STRIPE WEBHOOK EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stripe_webhook_events_stripe_id ON stripe_webhook_events(stripe_event_id);
CREATE INDEX idx_stripe_webhook_events_event_type ON stripe_webhook_events(event_type);
CREATE INDEX idx_stripe_webhook_events_processed_at ON stripe_webhook_events(processed_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Stripe Customers: Usuários podem ver apenas seus próprios dados
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stripe customer data"
  ON stripe_customers FOR SELECT
  USING (auth.uid() = user_id);

-- Stripe Payment Intents: Apenas leitura para usuários autenticados
ALTER TABLE stripe_payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payment intents"
  ON stripe_payment_intents FOR SELECT
  USING (auth.role() = 'authenticated');

-- Stripe Subscriptions: Apenas leitura para usuários autenticados
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view subscriptions"
  ON stripe_subscriptions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Stripe Refunds: Apenas leitura para usuários autenticados
ALTER TABLE stripe_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view refunds"
  ON stripe_refunds FOR SELECT
  USING (auth.role() = 'authenticated');

-- Stripe Webhook Events: Apenas leitura para admins
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view webhook events"
  ON stripe_webhook_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_stripe_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stripe_customers_updated_at
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_updated_at();

CREATE TRIGGER update_stripe_payment_intents_updated_at
  BEFORE UPDATE ON stripe_payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_updated_at();

CREATE TRIGGER update_stripe_subscriptions_updated_at
  BEFORE UPDATE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_updated_at();

CREATE TRIGGER update_stripe_refunds_updated_at
  BEFORE UPDATE ON stripe_refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE stripe_customers IS 'Clientes Stripe vinculados a usuários do sistema';
COMMENT ON TABLE stripe_payment_intents IS 'Intenções de pagamento do Stripe';
COMMENT ON TABLE stripe_subscriptions IS 'Assinaturas do Stripe';
COMMENT ON TABLE stripe_refunds IS 'Reembolsos processados pelo Stripe';
COMMENT ON TABLE stripe_webhook_events IS 'Log de eventos webhook recebidos do Stripe';
