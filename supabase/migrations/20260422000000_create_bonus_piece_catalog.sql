-- Migration: Create bonus_piece_catalog table for inventory tracking
-- Description: Manages bonus piece inventory with quantity tracking and low stock alerts
-- Requirements: 11.6
-- Created: 2026-04-22 00:00:00 UTC

-- Create bonus_piece_catalog table
CREATE TABLE IF NOT EXISTS bonus_piece_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bonus_piece_catalog_active ON bonus_piece_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_bonus_piece_catalog_quantity ON bonus_piece_catalog(quantity_available);

-- Enable Row Level Security
ALTER TABLE bonus_piece_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view all catalog items
CREATE POLICY "Admins view all catalog items"
  ON bonus_piece_catalog FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- RLS Policy: Admins can insert catalog items
CREATE POLICY "Admins insert catalog items"
  ON bonus_piece_catalog FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- RLS Policy: Admins can update catalog items
CREATE POLICY "Admins update catalog items"
  ON bonus_piece_catalog FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- RLS Policy: Admins can delete catalog items
CREATE POLICY "Admins delete catalog items"
  ON bonus_piece_catalog FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- Add catalog_item_id to bonus_pieces table to link to catalog
ALTER TABLE bonus_pieces ADD COLUMN IF NOT EXISTS catalog_item_id UUID REFERENCES bonus_piece_catalog(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bonus_pieces_catalog_item ON bonus_pieces(catalog_item_id);

-- Comment on table for documentation
COMMENT ON TABLE bonus_piece_catalog IS 'Catalog of available bonus piece types with inventory tracking. Used to manage stock levels and prevent over-assignment.';

-- Comment on columns
COMMENT ON COLUMN bonus_piece_catalog.id IS 'Primary key';
COMMENT ON COLUMN bonus_piece_catalog.name IS 'Name of the bonus piece type';
COMMENT ON COLUMN bonus_piece_catalog.description IS 'Detailed description of the bonus piece';
COMMENT ON COLUMN bonus_piece_catalog.image_url IS 'URL to the bonus piece image';
COMMENT ON COLUMN bonus_piece_catalog.quantity_available IS 'Current quantity available in stock';
COMMENT ON COLUMN bonus_piece_catalog.quantity_reserved IS 'Quantity reserved for pending assignments';
COMMENT ON COLUMN bonus_piece_catalog.low_stock_threshold IS 'Alert threshold for low stock warnings';
COMMENT ON COLUMN bonus_piece_catalog.is_active IS 'Whether this bonus piece type is currently active';
COMMENT ON COLUMN bonus_piece_catalog.created_at IS 'Timestamp when the record was created (UTC)';
COMMENT ON COLUMN bonus_piece_catalog.updated_at IS 'Timestamp when the record was last updated (UTC)';

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bonus_piece_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bonus_piece_catalog_updated_at
  BEFORE UPDATE ON bonus_piece_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_bonus_piece_catalog_updated_at();

-- Create function to check if bonus piece is available
CREATE OR REPLACE FUNCTION check_bonus_piece_available(p_catalog_item_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_available INTEGER;
  v_reserved INTEGER;
BEGIN
  SELECT quantity_available, quantity_reserved
  INTO v_available, v_reserved
  FROM bonus_piece_catalog
  WHERE id = p_catalog_item_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  RETURN (v_available - v_reserved) > 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to reserve bonus piece
CREATE OR REPLACE FUNCTION reserve_bonus_piece(p_catalog_item_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE bonus_piece_catalog
  SET quantity_reserved = quantity_reserved + 1
  WHERE id = p_catalog_item_id
    AND is_active = true
    AND (quantity_available - quantity_reserved) > 0;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bonus piece not available or out of stock';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to release bonus piece reservation
CREATE OR REPLACE FUNCTION release_bonus_piece(p_catalog_item_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE bonus_piece_catalog
  SET quantity_reserved = GREATEST(0, quantity_reserved - 1)
  WHERE id = p_catalog_item_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to consume bonus piece (when shipped)
CREATE OR REPLACE FUNCTION consume_bonus_piece(p_catalog_item_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE bonus_piece_catalog
  SET 
    quantity_available = GREATEST(0, quantity_available - 1),
    quantity_reserved = GREATEST(0, quantity_reserved - 1)
  WHERE id = p_catalog_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bonus piece catalog item not found';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create view for low stock items
CREATE OR REPLACE VIEW bonus_piece_low_stock AS
SELECT 
  id,
  name,
  description,
  quantity_available,
  quantity_reserved,
  (quantity_available - quantity_reserved) as quantity_free,
  low_stock_threshold,
  is_active
FROM bonus_piece_catalog
WHERE is_active = true
  AND (quantity_available - quantity_reserved) <= low_stock_threshold
ORDER BY (quantity_available - quantity_reserved) ASC;

COMMENT ON VIEW bonus_piece_low_stock IS 'View showing bonus pieces with low or depleted stock for admin alerts';

