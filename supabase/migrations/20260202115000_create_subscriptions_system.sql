-- Migration: Create subscriptions system
-- Purpose: Sistema completo de assinaturas de coleções
-- Date: 2026-02-02

-- Tabela de personagens das coleções
CREATE TABLE IF NOT EXISTS collection_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  release_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'revealed', 'released')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(collection_id, release_order)
);

-- Tabela de assinaturas
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('trimestral', 'semestral', 'anual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'completed')),
  
  -- Pagamento
  total_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card', 'boleto')),
  payment_id TEXT,
  
  -- Entregas
  deliveries_total INTEGER NOT NULL DEFAULT 3,
  deliveries_completed INTEGER NOT NULL DEFAULT 0,
  
  -- Datas
  next_delivery_date TIMESTAMPTZ,
  next_production_start TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de entregas
CREATE TABLE IF NOT EXISTS subscription_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  character_id UUID REFERENCES collection_characters(id),
  delivery_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'revealed', 'in_production', 'shipped', 'delivered')),
  
  -- Datas
  reveal_date TIMESTAMPTZ,
  expected_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,
  
  -- Rastreamento
  tracking_code TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(subscription_id, delivery_number)
);

-- Índices
CREATE INDEX idx_collection_characters_collection ON collection_characters(collection_id);
CREATE INDEX idx_collection_characters_order ON collection_characters(release_order);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_collection ON subscriptions(collection_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscription_deliveries_subscription ON subscription_deliveries(subscription_id);
CREATE INDEX idx_subscription_deliveries_status ON subscription_deliveries(status);

-- Enable RLS
ALTER TABLE collection_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies - collection_characters
CREATE POLICY "Anyone can view characters of active collections"
  ON collection_characters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_characters.collection_id
      AND collections.is_active = true
    )
  );

CREATE POLICY "Admins can manage all characters"
  ON collection_characters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies - subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all subscriptions"
  ON subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies - subscription_deliveries
CREATE POLICY "Users can view their own deliveries"
  ON subscription_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_deliveries.subscription_id
      AND subscriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all deliveries"
  ON subscription_deliveries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Triggers
CREATE OR REPLACE FUNCTION update_collection_characters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collection_characters_updated_at
  BEFORE UPDATE ON collection_characters
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_characters_updated_at();

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION update_subscription_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_deliveries_updated_at
  BEFORE UPDATE ON subscription_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_deliveries_updated_at();

-- Comments
COMMENT ON TABLE collection_characters IS 'Personagens/itens de cada coleção';
COMMENT ON TABLE subscriptions IS 'Assinaturas de coleções dos usuários';
COMMENT ON TABLE subscription_deliveries IS 'Entregas programadas das assinaturas';
