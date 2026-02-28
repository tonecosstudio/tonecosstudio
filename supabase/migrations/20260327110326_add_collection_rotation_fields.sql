-- =====================================================
-- MIGRATION: Add rotation fields to collections table
-- Date: 2026-03-27
-- Description: Adds rotation type, character revelation, and related fields to collections table
-- Requirements: 5.1, 5.3, 12.1, 29.1, 29.2, 29.3
-- =====================================================

-- =====================================================
-- 1. ADD ROTATION AND CHARACTER REVELATION FIELDS TO COLLECTIONS TABLE
-- =====================================================

-- Add rotation_type field with CHECK constraint for valid values
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS rotation_type TEXT DEFAULT 'fixed' 
    CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months'));

-- Add character_revelation_date field (nullable, for scheduled character reveals)
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS character_revelation_date TIMESTAMPTZ;

-- Add revealed field to track if character has been revealed
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS revealed BOOLEAN DEFAULT false;

-- Add character_name field (nullable, populated after revelation)
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS character_name TEXT;

-- Add character_image_url field (nullable, populated after revelation)
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS character_image_url TEXT;

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for filtering collections by rotation type
CREATE INDEX IF NOT EXISTS idx_collections_rotation ON collections(rotation_type);

-- Partial index for character revelation date (only for unrevealed collections)
-- This optimizes cron job queries that check for scheduled revelations
CREATE INDEX IF NOT EXISTS idx_collections_revelation ON collections(character_revelation_date) 
  WHERE revealed = false;

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN collections.rotation_type IS 'Collection availability pattern: fixed (every month), odd_months (Jan, Mar, May, Jul, Sep, Nov), even_months (Feb, Apr, Jun, Aug, Oct, Dec)';
COMMENT ON COLUMN collections.character_revelation_date IS 'Scheduled date/time for character reveal (in America/Bahia timezone, stored as UTC)';
COMMENT ON COLUMN collections.revealed IS 'Whether the character has been revealed (true) or is still a mystery (false)';
COMMENT ON COLUMN collections.character_name IS 'Name of the character in this collection (populated after revelation)';
COMMENT ON COLUMN collections.character_image_url IS 'URL of the character image (populated after revelation, replaces mystery placeholder)';

-- =====================================================
-- 4. UPDATE EXISTING DATA (SET DEFAULT VALUES)
-- =====================================================

-- Set all existing collections to 'fixed' rotation type (maintains current behavior)
UPDATE collections 
SET rotation_type = 'fixed' 
WHERE rotation_type IS NULL;

-- Ensure revealed is false for all existing collections (no characters revealed yet)
UPDATE collections 
SET revealed = false 
WHERE revealed IS NULL;

-- =====================================================
-- 5. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260327110326_add_collection_rotation_fields.sql' AS migration_file,
  'Add rotation fields to collections table' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collections' AND column_name IN ('rotation_type', 'character_revelation_date', 'revealed', 'character_name', 'character_image_url')) AS columns_added,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'collections' AND indexname IN ('idx_collections_rotation', 'idx_collections_revelation')) AS indexes_created,
  (SELECT COUNT(*) FROM collections WHERE rotation_type = 'fixed') AS fixed_collections_count,
  (SELECT COUNT(*) FROM collections WHERE revealed = false) AS unrevealed_collections_count;
