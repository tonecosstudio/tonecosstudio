-- Migration: Create contextual_pricing_history table
-- Description: Audit trail for changes to contextual pricing (base prices, multipliers, discounts)
-- Spec: contextual-pricing-system
-- Task: 2.4
-- NOTE: Renamed from pricing_history to avoid conflict with existing pricing_tiers history table

-- Create contextual_pricing_history table
CREATE TABLE IF NOT EXISTS contextual_pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type TEXT NOT NULL CHECK (change_type IN ('base_price', 'multiplier', 'chosen_discount')),
  collection_type_id UUID REFERENCES collection_types(id),  -- NULL if multiplier or discount change
  user_context TEXT,  -- NULL if base_price change
  old_value DECIMAL(10,2),
  new_value DECIMAL(10,2) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

-- Create indexes for auditoria
CREATE INDEX IF NOT EXISTS idx_contextual_pricing_history_type ON contextual_pricing_history(change_type);
CREATE INDEX IF NOT EXISTS idx_contextual_pricing_history_collection_type ON contextual_pricing_history(collection_type_id, change_type);
CREATE INDEX IF NOT EXISTS idx_contextual_pricing_history_context ON contextual_pricing_history(user_context, change_type);
CREATE INDEX IF NOT EXISTS idx_contextual_pricing_history_date ON contextual_pricing_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_contextual_pricing_history_admin ON contextual_pricing_history(changed_by);

-- Add comments explaining the table and columns
COMMENT ON TABLE contextual_pricing_history IS 
  'Audit trail for changes to contextual pricing: base prices, multipliers, and discount percentages';

COMMENT ON COLUMN contextual_pricing_history.change_type IS 
  'Type of change: base_price (base price), multiplier (context multiplier), or chosen_discount (discount percentage)';

COMMENT ON COLUMN contextual_pricing_history.collection_type_id IS 
  'Reference to collection type (UUID) - NULL if multiplier or discount change';

COMMENT ON COLUMN contextual_pricing_history.old_value IS 
  'Previous value (coins for base_price, decimal for multiplier, integer for discount percentage)';

COMMENT ON COLUMN contextual_pricing_history.new_value IS 
  'New value (coins for base_price, decimal for multiplier, integer for discount percentage)';

-- Enable RLS
ALTER TABLE contextual_pricing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view pricing history
CREATE POLICY "Admins can view contextual pricing history"
  ON contextual_pricing_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- No UPDATE/DELETE policies = blocked by default (history is immutable)
