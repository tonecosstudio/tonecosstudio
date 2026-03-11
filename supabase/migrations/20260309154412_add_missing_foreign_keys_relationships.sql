-- =====================================================
-- Migration: Add Missing Foreign Keys and Relationships
-- Description: Adiciona collection_id e corrige relacionamentos para queries do frontend
-- =====================================================

-- =====================================================
-- STANDALONE_PURCHASES - Adicionar collection_id
-- =====================================================

-- Adicionar coluna collection_id (nullable inicialmente)
ALTER TABLE standalone_purchases
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_collection_id 
ON standalone_purchases(collection_id);

-- Atualizar registros existentes: pegar collection_id do character
UPDATE standalone_purchases sp
SET collection_id = c.collection_id
FROM characters c
WHERE sp.character_id = c.id
AND sp.collection_id IS NULL;

-- =====================================================
-- SUBSCRIPTIONS - Adicionar collection_id PRIMEIRO
-- =====================================================

-- Adicionar coluna collection_id (para saber qual coleção o usuário assinou)
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_subscriptions_collection_id 
ON subscriptions(collection_id);

-- =====================================================
-- SUBSCRIPTION_DELIVERIES - Adicionar collection_id
-- =====================================================

-- Adicionar coluna collection_id para facilitar queries
ALTER TABLE subscription_deliveries
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_collection_id 
ON subscription_deliveries(collection_id);

-- Atualizar registros existentes via subscriptions (agora que subscriptions.collection_id existe)
UPDATE subscription_deliveries sd
SET collection_id = s.collection_id
FROM subscriptions s
WHERE sd.subscription_id = s.id
AND sd.collection_id IS NULL
AND s.collection_id IS NOT NULL;

-- =====================================================
-- Reload Schema Cache
-- =====================================================

-- Forçar reload do schema cache para expor novos relacionamentos
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- Verificação
-- =====================================================

DO $$
DECLARE
  sp_has_collection BOOLEAN;
  sd_has_collection BOOLEAN;
  sub_has_collection BOOLEAN;
BEGIN
  -- Verificar se colunas foram adicionadas
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'standalone_purchases'
    AND column_name = 'collection_id'
  ) INTO sp_has_collection;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscription_deliveries'
    AND column_name = 'collection_id'
  ) INTO sd_has_collection;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscriptions'
    AND column_name = 'collection_id'
  ) INTO sub_has_collection;
  
  IF sp_has_collection AND sd_has_collection AND sub_has_collection THEN
    RAISE NOTICE '✅ All collection_id columns added successfully';
  ELSE
    RAISE EXCEPTION '❌ Missing columns: standalone_purchases=%, subscription_deliveries=%, subscriptions=%',
      sp_has_collection, sd_has_collection, sub_has_collection;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN standalone_purchases.collection_id IS 'Coleção do personagem comprado (desnormalizado para performance)';
COMMENT ON COLUMN subscription_deliveries.collection_id IS 'Coleção da entrega (desnormalizado para performance)';
COMMENT ON COLUMN subscriptions.collection_id IS 'Coleção que o usuário assinou';

