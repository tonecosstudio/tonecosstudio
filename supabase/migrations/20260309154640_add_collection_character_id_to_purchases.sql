-- =====================================================
-- Migration: Add collection_character_id to Purchases
-- Description: Adiciona FK para collection_characters em standalone_purchases e subscription_deliveries
-- =====================================================

-- =====================================================
-- STANDALONE_PURCHASES - Adicionar collection_character_id
-- =====================================================

-- Adicionar coluna collection_character_id
ALTER TABLE standalone_purchases
ADD COLUMN IF NOT EXISTS collection_character_id UUID REFERENCES collection_characters(id) ON DELETE SET NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_collection_character_id 
ON standalone_purchases(collection_character_id);

-- Atualizar registros existentes: encontrar collection_character_id via character_id e collection_id
UPDATE standalone_purchases sp
SET collection_character_id = cc.id
FROM collection_characters cc
WHERE sp.character_id = cc.character_id
AND sp.collection_id = cc.collection_id
AND sp.collection_character_id IS NULL;

-- =====================================================
-- SUBSCRIPTION_DELIVERIES - Adicionar collection_character_id
-- =====================================================

-- Adicionar coluna collection_character_id
ALTER TABLE subscription_deliveries
ADD COLUMN IF NOT EXISTS collection_character_id UUID REFERENCES collection_characters(id) ON DELETE SET NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_collection_character_id 
ON subscription_deliveries(collection_character_id);

-- Atualizar registros existentes
UPDATE subscription_deliveries sd
SET collection_character_id = cc.id
FROM collection_characters cc
WHERE sd.character_id = cc.character_id
AND sd.collection_id = cc.collection_id
AND sd.collection_character_id IS NULL;

-- =====================================================
-- Reload Schema Cache
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- Verificação
-- =====================================================

DO $$
DECLARE
  sp_has_cc BOOLEAN;
  sd_has_cc BOOLEAN;
BEGIN
  -- Verificar se colunas foram adicionadas
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'standalone_purchases'
    AND column_name = 'collection_character_id'
  ) INTO sp_has_cc;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscription_deliveries'
    AND column_name = 'collection_character_id'
  ) INTO sd_has_cc;
  
  IF sp_has_cc AND sd_has_cc THEN
    RAISE NOTICE '✅ All collection_character_id columns added successfully';
  ELSE
    RAISE EXCEPTION '❌ Missing columns: standalone_purchases=%, subscription_deliveries=%',
      sp_has_cc, sd_has_cc;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN standalone_purchases.collection_character_id IS 'Referência direta ao collection_character para joins eficientes';
COMMENT ON COLUMN subscription_deliveries.collection_character_id IS 'Referência direta ao collection_character para joins eficientes';

