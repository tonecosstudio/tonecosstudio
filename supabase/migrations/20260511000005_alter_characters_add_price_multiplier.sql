-- Migration: Alter collection_characters table to add price_multiplier
-- Description: Adds optional price multiplier for individual character pricing (RN008)
-- Spec: contextual-pricing-system
-- Task: 2.6

-- Add price_multiplier column (nullable, default NULL)
ALTER TABLE collection_characters
ADD COLUMN IF NOT EXISTS price_multiplier DECIMAL(4,2);

-- Add constraint: price_multiplier must be > 0 if not NULL
ALTER TABLE collection_characters
ADD CONSTRAINT check_price_multiplier_positive 
CHECK (price_multiplier > 0 OR price_multiplier IS NULL);

-- Create index for filtering by price_multiplier
CREATE INDEX IF NOT EXISTS idx_collection_characters_price_multiplier 
ON collection_characters(price_multiplier) 
WHERE price_multiplier IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN collection_characters.price_multiplier IS 
  'Optional price multiplier for this character (NULL = 1.0 default). Applied AFTER collection context price calculation. Examples: 1.0 (normal), 1.2 (complex), 1.5 (premium), 2.0 (rare)';

