-- Migration: Create pricing_context_multipliers table
-- Description: Stores multipliers and discount percentage applied to base price based on user context
-- Spec: contextual-pricing-system
-- Task: 2.3

-- Create pricing_context_multipliers table
CREATE TABLE IF NOT EXISTS pricing_context_multipliers (
  user_context TEXT PRIMARY KEY CHECK (user_context IN (
    'subscribed_chosen',
    'subscribed_not_chosen',
    'no_subscription'
  )),
  multiplier DECIMAL(4,2) NOT NULL CHECK (multiplier > 0),
  chosen_collection_discount_percentage INTEGER DEFAULT 20 CHECK (chosen_collection_discount_percentage BETWEEN 0 AND 100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_multipliers_active ON pricing_context_multipliers(is_active);
CREATE INDEX IF NOT EXISTS idx_multipliers_context ON pricing_context_multipliers(user_context);

-- Add comments explaining the table and columns
COMMENT ON TABLE pricing_context_multipliers IS 
  'Multipliers and discount percentage applied to base price based on user context';

COMMENT ON COLUMN pricing_context_multipliers.multiplier IS 
  'Multiplier applied to base_price_coins (1.0 = 100%, 1.2 = 120%, 0.8 = 80% discount) - used for NOT chosen collections';

COMMENT ON COLUMN pricing_context_multipliers.chosen_collection_discount_percentage IS 
  'Discount percentage for chosen collections (stored as integer: 20 = 20%). Applied as: base_price - (base_price × percentage / 100)';

-- Insert initial data
INSERT INTO pricing_context_multipliers (user_context, multiplier, chosen_collection_discount_percentage, description) VALUES
  ('subscribed_chosen', 1.0, 20, 'Discount percentage for chosen collection (20% = base_price - (base_price × 0.20))'),
  ('subscribed_not_chosen', 1.2, 20, 'Acréscimo de 20% para coleção não escolhida (uses multiplier)'),
  ('no_subscription', 1.2, 20, 'Acréscimo de 20% para não assinantes (uses multiplier)')
ON CONFLICT (user_context) DO NOTHING;

-- Enable RLS
ALTER TABLE pricing_context_multipliers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view active multipliers
CREATE POLICY "Anyone can view active multipliers"
  ON pricing_context_multipliers FOR SELECT
  USING (is_active = true);

-- RLS Policy: Only admins can manage multipliers
CREATE POLICY "Admins can manage multipliers"
  ON pricing_context_multipliers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
