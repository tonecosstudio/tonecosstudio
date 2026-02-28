-- Migration: Add Collection Rotation Fields
-- Aplicação temporária via script

-- 1. Adicionar coluna rotation_type
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS rotation_type TEXT DEFAULT 'fixed' 
    CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months'));

-- 2. Adicionar coluna character_revelation_date
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS character_revelation_date TIMESTAMPTZ;

-- 3. Adicionar coluna revealed
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS revealed BOOLEAN DEFAULT false;

-- 4. Adicionar coluna character_name
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS character_name TEXT;

-- 5. Adicionar coluna character_image_url
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS character_image_url TEXT;

-- 6. Criar índice para rotation_type
CREATE INDEX IF NOT EXISTS idx_collections_rotation ON collections(rotation_type);

-- 7. Criar índice parcial para character_revelation_date
CREATE INDEX IF NOT EXISTS idx_collections_revelation 
  ON collections(character_revelation_date) 
  WHERE revealed = false AND character_revelation_date IS NOT NULL;

-- 8. Atualizar coleções existentes para 'fixed'
UPDATE collections 
SET rotation_type = 'fixed' 
WHERE rotation_type IS NULL;

-- 9. Atualizar revealed para false
UPDATE collections 
SET revealed = false 
WHERE revealed IS NULL;

-- 10. Verificar resultado
SELECT 
  'SUCCESS' AS status,
  COUNT(*) AS total_collections,
  COUNT(*) FILTER (WHERE rotation_type = 'fixed') AS fixed_collections,
  COUNT(*) FILTER (WHERE rotation_type = 'odd_months') AS odd_months_collections,
  COUNT(*) FILTER (WHERE rotation_type = 'even_months') AS even_months_collections
FROM collections;
