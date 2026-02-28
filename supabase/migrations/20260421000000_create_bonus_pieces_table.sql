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

-- Comment on table for documentation
COMMENT ON TABLE bonus_pieces IS 'Exclusive collectible pieces included with the 6th delivery of Semestral subscriptions. Tracks bonus pieces, their status, and association with subscriptions and deliveries.';

-- Comment on columns
COMMENT ON COLUMN bonus_pieces.id IS 'Primary key';
COMMENT ON COLUMN bonus_pieces.subscription_id IS 'Reference to the Semestral subscription receiving this bonus piece';
COMMENT ON COLUMN bonus_pieces.delivery_id IS 'Reference to the 6th delivery that includes this bonus piece (NULL until assigned)';
COMMENT ON COLUMN bonus_pieces.description IS 'Description of the bonus piece';
COMMENT ON COLUMN bonus_pieces.image_url IS 'URL to the bonus piece image';
COMMENT ON COLUMN bonus_pieces.status IS 'Current status: pending (not yet prepared), prepared (ready to ship), shipped (sent to customer)';
COMMENT ON COLUMN bonus_pieces.prepared_at IS 'Timestamp when the bonus piece was prepared (UTC)';
COMMENT ON COLUMN bonus_pieces.shipped_at IS 'Timestamp when the bonus piece was shipped (UTC)';
COMMENT ON COLUMN bonus_pieces.created_at IS 'Timestamp when the record was created (UTC)';
COMMENT ON COLUMN bonus_pieces.updated_at IS 'Timestamp when the record was last updated (UTC)';

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bonus_pieces_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bonus_pieces_updated_at
  BEFORE UPDATE ON bonus_pieces
  FOR EACH ROW
  EXECUTE FUNCTION update_bonus_pieces_updated_at();

-- Comment on trigger
COMMENT ON TRIGGER trigger_update_bonus_pieces_updated_at ON bonus_pieces IS 'Automatically updates the updated_at timestamp when a bonus piece record is modified';
