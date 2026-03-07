-- Script para aplicar a migration de linha de produto
-- Execute este script no SQL Editor do Supabase Dashboard

-- Add product_line field to collection_characters
ALTER TABLE collection_characters
ADD COLUMN IF NOT EXISTS product_line TEXT;

-- Add comment
COMMENT ON COLUMN collection_characters.product_line IS 
  'Linha de produto/série do personagem (Vingadores, Liga da Justiça, Akatsuki, etc.)';

-- Create index for filtering by product line
CREATE INDEX IF NOT EXISTS idx_collection_characters_product_line 
ON collection_characters(product_line);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'collection_characters'
AND column_name = 'product_line';
