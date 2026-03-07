-- Add theme_category field to collection_characters
-- This allows categorizing characters by theme (Marvel, DC, Anime, etc.)

ALTER TABLE collection_characters
ADD COLUMN IF NOT EXISTS theme_category TEXT;

COMMENT ON COLUMN collection_characters.theme_category IS 
  'Categoria temática do personagem (Marvel, DC, Anime, Games, etc.)';

-- Create index for filtering by theme
CREATE INDEX IF NOT EXISTS idx_collection_characters_theme_category 
ON collection_characters(theme_category);
