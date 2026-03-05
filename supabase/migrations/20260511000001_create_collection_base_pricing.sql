-- Migration: Create collection_base_pricing table
-- Description: Stores base price per collection type (before applying multipliers)
-- Spec: contextual-pricing-system
-- Task: 2.2

-- Create collection_base_pricing table
CREATE TABLE IF NOT EXISTS collection_base_pricing (
  collection_type_id UUID PRIMARY KEY REFERENCES collection_types(id) ON DELETE CASCADE,
  base_price_coins INTEGER NOT NULL CHECK (base_price_coins > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_base_pricing_active ON collection_base_pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_base_pricing_type_id ON collection_base_pricing(collection_type_id);

-- Add comments explaining the table and columns
COMMENT ON TABLE collection_base_pricing IS 
  'Base price per collection type (references collection_types dynamically)';

COMMENT ON COLUMN collection_base_pricing.collection_type_id IS 
  'Reference to collection type (UUID) - allows dynamic types';

COMMENT ON COLUMN collection_base_pricing.base_price_coins IS 
  'Base price in COINS - will be multiplied by context_multiplier or have discount applied to get final price';

-- Insert initial data (prices in COINS)
INSERT INTO collection_base_pricing (collection_type_id, base_price_coins)
SELECT id, 
  CASE name
    WHEN 'subscription' THEN 1000
    WHEN 'standard_catalog' THEN 1400
    WHEN 'premium_catalog' THEN 1800
  END
FROM collection_types
WHERE name IN ('subscription', 'standard_catalog', 'premium_catalog')
ON CONFLICT (collection_type_id) DO NOTHING;

-- Enable RLS
ALTER TABLE collection_base_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view active base pricing
CREATE POLICY "Anyone can view active base pricing"
  ON collection_base_pricing FOR SELECT
  USING (is_active = true);

-- RLS Policy: Only admins can manage base pricing
CREATE POLICY "Admins can manage base pricing"
  ON collection_base_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
