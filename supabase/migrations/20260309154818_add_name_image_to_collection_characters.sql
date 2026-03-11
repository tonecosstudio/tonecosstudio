-- =====================================================
-- Migration: Add Name and Image URL to Collection Characters
-- Description: Desnormaliza name e image_url para facilitar queries do frontend
-- =====================================================

-- =====================================================
-- COLLECTION_CHARACTERS - Adicionar colunas desnormalizadas
-- =====================================================

-- Adicionar coluna name (desnormalizada de characters.name)
ALTER TABLE collection_characters
ADD COLUMN IF NOT EXISTS name TEXT;

-- Adicionar coluna image_url (desnormalizada de characters.image_url)
ALTER TABLE collection_characters
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Criar índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_collection_characters_name 
ON collection_characters(name);

-- =====================================================
-- Atualizar registros existentes
-- =====================================================

-- Copiar name e image_url de characters para collection_characters
UPDATE collection_characters cc
SET 
  name = c.name,
  image_url = c.image_url
FROM characters c
WHERE cc.character_id = c.id
AND (cc.name IS NULL OR cc.image_url IS NULL);

-- =====================================================
-- Trigger para manter sincronização
-- =====================================================

-- Função para sincronizar dados do character quando collection_character é inserido/atualizado
CREATE OR REPLACE FUNCTION sync_collection_character_from_character()
RETURNS TRIGGER AS $$
BEGIN
  -- Se character_id foi definido, copiar name e image_url
  IF NEW.character_id IS NOT NULL THEN
    SELECT c.name, c.image_url
    INTO NEW.name, NEW.image_url
    FROM characters c
    WHERE c.id = NEW.character_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para INSERT e UPDATE
DROP TRIGGER IF EXISTS sync_collection_character_data ON collection_characters;
CREATE TRIGGER sync_collection_character_data
  BEFORE INSERT OR UPDATE OF character_id ON collection_characters
  FOR EACH ROW
  EXECUTE FUNCTION sync_collection_character_from_character();

-- =====================================================
-- Função para atualizar collection_characters quando character muda
-- =====================================================

CREATE OR REPLACE FUNCTION sync_character_to_collection_characters()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um character é atualizado, atualizar todos os collection_characters relacionados
  UPDATE collection_characters
  SET 
    name = NEW.name,
    image_url = NEW.image_url
  WHERE character_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabela characters
DROP TRIGGER IF EXISTS sync_character_updates ON characters;
CREATE TRIGGER sync_character_updates
  AFTER UPDATE OF name, image_url ON characters
  FOR EACH ROW
  EXECUTE FUNCTION sync_character_to_collection_characters();

-- =====================================================
-- Reload Schema Cache
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- Verificação
-- =====================================================

DO $$
DECLARE
  has_name BOOLEAN;
  has_image BOOLEAN;
  records_with_data INTEGER;
BEGIN
  -- Verificar se colunas foram adicionadas
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'collection_characters'
    AND column_name = 'name'
  ) INTO has_name;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'collection_characters'
    AND column_name = 'image_url'
  ) INTO has_image;
  
  -- Contar registros com dados
  SELECT COUNT(*) INTO records_with_data
  FROM collection_characters
  WHERE name IS NOT NULL;
  
  IF has_name AND has_image THEN
    RAISE NOTICE '✅ Columns added successfully. Records with data: %', records_with_data;
  ELSE
    RAISE EXCEPTION '❌ Missing columns: name=%, image_url=%', has_name, has_image;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN collection_characters.name IS 'Nome do personagem (desnormalizado de characters.name para performance)';
COMMENT ON COLUMN collection_characters.image_url IS 'URL da imagem do personagem (desnormalizado de characters.image_url para performance)';
COMMENT ON FUNCTION sync_collection_character_from_character IS 'Sincroniza dados do character ao inserir/atualizar collection_character';
COMMENT ON FUNCTION sync_character_to_collection_characters IS 'Propaga mudanças de characters para collection_characters';

