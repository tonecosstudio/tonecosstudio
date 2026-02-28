-- Apply rotation_type field only (simplified, no validations)

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS rotation_type TEXT DEFAULT 'fixed' 
    CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months'));

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS character_revelation_date TIMESTAMPTZ;

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS revealed BOOLEAN DEFAULT false;

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS character_name TEXT;

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS character_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_collections_rotation ON collections(rotation_type);

CREATE INDEX IF NOT EXISTS idx_collections_revelation ON collections(character_revelation_date) 
  WHERE revealed = false;

UPDATE collections SET rotation_type = 'fixed' WHERE rotation_type IS NULL;
UPDATE collections SET revealed = false WHERE revealed IS NULL;

SELECT 'SUCCESS' AS status, COUNT(*) AS total_collections FROM collections;
