-- Migration: Create subscription_plans table
-- Purpose: Admin can configure subscription plans (prices, limits, etc)
-- Date: 2026-02-02

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL UNIQUE CHECK (plan_type IN ('trimestral', 'semestral', 'anual')),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  price_full DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_pix DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Collections
  collections_count INTEGER NOT NULL DEFAULT 1,
  collections_count_description TEXT,
  
  -- Deliveries
  deliveries_total INTEGER NOT NULL DEFAULT 3,
  
  -- Switching rules
  can_switch BOOLEAN NOT NULL DEFAULT true,
  switch_limit INTEGER, -- NULL = unlimited
  switch_cutoff_days INTEGER NOT NULL DEFAULT 1, -- Days before production start
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default plans
INSERT INTO subscription_plans (plan_type, name, description, price_full, price_pix, collections_count, collections_count_description, deliveries_total, can_switch, switch_limit, switch_cutoff_days, display_order) VALUES
  ('trimestral', 'Trimestral', 'Plano de 3 meses com 2 coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes', 1000.00, 900.00, 2, 'Escolha 2 coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes', 3, true, NULL, 1, 1),
  ('semestral', 'Semestral', 'Plano de 6 meses com 3 coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes + 1 entrega grÃƒÆ’Ã‚Â¡tis', 2000.00, 1800.00, 3, 'Escolha 3 coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes', 7, true, NULL, 1, 2),
  ('anual', 'Anual', 'Plano anual com acesso a todas as coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes', 3600.00, 3240.00, -1, 'Todas as coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes', 12, true, NULL, 1, 3);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_type ON subscription_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_display_order ON subscription_plans(display_order);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage all plans"
  ON subscription_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Add comments
COMMENT ON TABLE subscription_plans IS 'Configurable subscription plans with pricing and rules';
COMMENT ON COLUMN subscription_plans.collections_count IS '-1 means all collections, positive number means specific count';
COMMENT ON COLUMN subscription_plans.switch_limit IS 'NULL means unlimited switches, positive number means limited';
COMMENT ON COLUMN subscription_plans.switch_cutoff_days IS 'Days before production start when switching is blocked';
