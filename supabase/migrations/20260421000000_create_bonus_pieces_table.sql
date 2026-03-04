-- Migration: Create bonus_pieces table
-- Description: Tracks exclusive bonus pieces included with 6th delivery of Semestral subscriptions
-- Requirements: 11.2
-- Created: 2026-04-21 00:00:00 UTC

-- Create bonus_pieces table
CREATE TABLE IF NOT EXISTS bonus_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES subscription_deliveries(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'prepared', 'shipped')),
  prepared_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bonus_pieces_subscription ON bonus_pieces(subscription_id);
CREATE INDEX IF NOT EXISTS idx_bonus_pieces_delivery ON bonus_pieces(delivery_id);
CREATE INDEX IF NOT EXISTS idx_bonus_pieces_status ON bonus_pieces(status);

-- Enable Row Level Security
ALTER TABLE bonus_pieces ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own bonus pieces
CREATE POLICY "Users view own bonus pieces"
  ON bonus_pieces FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Admins can view all bonus pieces
CREATE POLICY "Admins view all bonus pieces"
  ON bonus_pieces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- RLS Policy: Admins can insert bonus pieces
CREATE POLICY "Admins insert bonus pieces"
  ON bonus_pieces FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- RLS Policy: Admins can update bonus pieces
CREATE POLICY "Admins update bonus pieces"
  ON bonus_pieces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- RLS Policy: Admins can delete bonus pieces
CREATE POLICY "Admins delete bonus pieces"
  ON bonus_pieces FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );
-- Ensure image_url column exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bonus_pieces' AND column_name = 'image_url') THEN
    ALTER TABLE bonus_pieces ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Comments removed to avoid errors if columns don't exist
-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bonus_pieces_updated_at()
RETURNS TRIGGER AS $$BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bonus_pieces_updated_at
  BEFORE UPDATE ON bonus_pieces
  FOR EACH ROW
  EXECUTE FUNCTION update_bonus_pieces_updated_at();

-- Comment on trigger
COMMENT ON TRIGGER trigger_update_bonus_pieces_updated_at ON bonus_pieces IS 'Automatically updates the updated_at timestamp when a bonus piece record is modified';
