-- Migration: Create collection_types table (dynamic collection types)
-- Description: Allows dynamic creation of collection types without code changes
-- Spec: contextual-pricing-system
-- Task: 2.1

-- Create collection_types table
CREATE TABLE IF NOT EXISTS collection_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,  -- Technical identifier (snake_case, used in code)
  display_name TEXT NOT NULL,  -- Friendly name for display in admin and user interfaces
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,  -- Display order (lower = first)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collection_types_active ON collection_types(is_active);
CREATE INDEX IF NOT EXISTS idx_collection_types_sort ON collection_types(sort_order);
CREATE INDEX IF NOT EXISTS idx_collection_types_name ON collection_types(name);

-- Add comments explaining the table and columns
COMMENT ON TABLE collection_types IS 
  'Dynamically configurable collection types - allows creating new types without altering code';

COMMENT ON COLUMN collection_types.name IS 
  'Unique technical identifier (snake_case, used in code)';

COMMENT ON COLUMN collection_types.display_name IS 
  'Friendly name for display in admin and user interfaces';

COMMENT ON COLUMN collection_types.sort_order IS 
  'Display order (lower = first)';

-- Insert initial data (3 default types)
INSERT INTO collection_types (name, display_name, description, sort_order) VALUES
  ('subscription', 'Assinatura', 'Coleções incluídas em planos de assinatura', 1),
  ('standard_catalog', 'Catálogo Padrão', 'Coleções do catálogo com preço intermediário', 2),
  ('premium_catalog', 'Catálogo Premium', 'Coleções premium com preço mais alto', 3)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE collection_types ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view active types
CREATE POLICY "Anyone can view active collection types"
  ON collection_types FOR SELECT
  USING (is_active = true);

-- RLS Policy: Only admins can manage types
CREATE POLICY "Admins can manage collection types"
  ON collection_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
