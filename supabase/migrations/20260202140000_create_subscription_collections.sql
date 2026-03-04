-- Migration: Create subscription_collections table
-- Purpose: Store multiple collections per subscription (Trimestral=2, Semestral=3, Anual=all)
-- Date: 2026-02-02

-- Create subscription_collections junction table
CREATE TABLE IF NOT EXISTS subscription_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicates
  UNIQUE(subscription_id, collection_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subscription_collections_subscription ON subscription_collections(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_collections_collection ON subscription_collections(collection_id);

-- Enable RLS
ALTER TABLE subscription_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their subscription collections"
  ON subscription_collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = subscription_collections.subscription_id
      AND subscriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all subscription collections"
  ON subscription_collections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE subscription_collections IS 'Stores multiple collections per subscription. Trimestral=2, Semestral=3, Anual=all';
