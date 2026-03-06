-- Migration: Alter collections table to add collection_type_id
-- Description: Links collections to dynamic collection types
-- Spec: contextual-pricing-system
-- Task: 2.5

-- Add collection_type_id column (nullable initially for migration)
ALTER TABLE collections
ADD COLUMN IF NOT EXISTS collection_type_id UUID REFERENCES collection_types(id);

-- Populate collection_type_id with default 'subscription' type for existing collections
UPDATE collections c
SET collection_type_id = ct.id
FROM collection_types ct
WHERE ct.name = 'subscription'
AND c.collection_type_id IS NULL;

-- Make collection_type_id NOT NULL after populating
ALTER TABLE collections
ALTER COLUMN collection_type_id SET NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_collections_type_id ON collections(collection_type_id);

-- Add comment explaining the column
COMMENT ON COLUMN collections.collection_type_id IS 
  'Reference to collection type (UUID) - determines pricing behavior';
