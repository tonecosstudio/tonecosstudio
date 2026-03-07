-- Add product_line field to collection_characters
-- This allows specifying the product line/series (Vingadores, Liga da Justiça, etc.)

ALTER TABLE collection_characters
ADD COLUMN IF NOT EXISTS product_line TEXT;

COMMENT ON COLUMN collection_characters.product_line IS 
  'Linha de produto/série do personagem (Vingadores, Liga da Justiça, Akatsuki, etc.)';

-- Create index for filtering by product line
CREATE INDEX IF NOT EXISTS idx_collection_characters_product_line 
ON collection_characters(product_line);
