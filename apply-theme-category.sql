-- Script para aplicar a migration de categoria temática
-- Execute este script no SQL Editor do Supabase Dashboard

-- Add theme_category field to collection_characters
ALTER TABLE collection_characters
ADD COLUMN IF NOT EXISTS theme_category TEXT;

-- Add comment
COMMENT ON COLUMN collection_characters.theme_category IS 
  'Categoria temática do personagem (Marvel, DC, Anime, Games, etc.)';

-- Create index for filtering by theme
CREATE INDEX IF NOT EXISTS idx_collection_characters_theme_category 
ON collection_characters(theme_category);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'collection_characters'
AND column_name = 'theme_category';
