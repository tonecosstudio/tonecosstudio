-- ============================================================================
-- Migration: Add Active Collection to Subscriptions
-- Description: Adiciona campo active_collection_id e trigger de sincronização
-- Issue: Frontend espera active_collection_id em subscriptions, mas usa subscription_collections
-- Date: 2026-05-13
-- ============================================================================

-- ============================================================================
-- 1. ADICIONAR CAMPO active_collection_id
-- ============================================================================

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS active_collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_active_collection 
ON subscriptions(active_collection_id);

COMMENT ON COLUMN subscriptions.active_collection_id IS 
  'Coleção ativa da assinatura - sincronizada automaticamente com subscription_collections';

-- ============================================================================
-- 2. SINCRONIZAR DADOS EXISTENTES
-- ============================================================================

-- Atualizar subscriptions com a primeira coleção de subscription_collections
UPDATE subscriptions s
SET active_collection_id = sc.collection_id
FROM (
  SELECT DISTINCT ON (subscription_id) 
    subscription_id, 
    collection_id
  FROM subscription_collections
  ORDER BY subscription_id, added_at ASC
) sc
WHERE s.id = sc.subscription_id
AND s.active_collection_id IS NULL;

-- ============================================================================
-- 3. CRIAR TRIGGER PARA SINCRONIZAÇÃO AUTOMÁTICA
-- ============================================================================

-- Função para sincronizar quando adiciona coleção
CREATE OR REPLACE FUNCTION sync_active_collection_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se a assinatura não tem coleção ativa, definir esta como ativa
  UPDATE subscriptions
  SET active_collection_id = NEW.collection_id,
      updated_at = NOW()
  WHERE id = NEW.subscription_id
  AND active_collection_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Trigger para INSERT em subscription_collections
DROP TRIGGER IF EXISTS trigger_sync_active_collection_insert ON subscription_collections;
CREATE TRIGGER trigger_sync_active_collection_insert
  AFTER INSERT ON subscription_collections
  FOR EACH ROW
  EXECUTE FUNCTION sync_active_collection_on_insert();

-- Função para limpar quando remove coleção
CREATE OR REPLACE FUNCTION sync_active_collection_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Se a coleção removida era a ativa, limpar
  UPDATE subscriptions
  SET active_collection_id = NULL,
      updated_at = NOW()
  WHERE id = OLD.subscription_id
  AND active_collection_id = OLD.collection_id;
  
  RETURN OLD;
END;
$$;

-- Trigger para DELETE em subscription_collections
DROP TRIGGER IF EXISTS trigger_sync_active_collection_delete ON subscription_collections;
CREATE TRIGGER trigger_sync_active_collection_delete
  AFTER DELETE ON subscription_collections
  FOR EACH ROW
  EXECUTE FUNCTION sync_active_collection_on_delete();

-- ============================================================================
-- 4. VERIFICAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_subs_count INTEGER;
  v_subs_with_collection INTEGER;
  v_sub_collections_count INTEGER;
BEGIN
  -- Contar assinaturas
  SELECT COUNT(*) INTO v_subs_count FROM subscriptions;
  
  -- Contar assinaturas com coleção ativa
  SELECT COUNT(*) INTO v_subs_with_collection 
  FROM subscriptions 
  WHERE active_collection_id IS NOT NULL;
  
  -- Contar registros em subscription_collections
  SELECT COUNT(DISTINCT subscription_id) INTO v_sub_collections_count 
  FROM subscription_collections;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO DE SINCRONIZAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total de assinaturas: %', v_subs_count;
  RAISE NOTICE 'Assinaturas com coleção ativa: %', v_subs_with_collection;
  RAISE NOTICE 'Assinaturas em subscription_collections: %', v_sub_collections_count;
  RAISE NOTICE '';
  
  IF v_subs_with_collection = v_sub_collections_count THEN
    RAISE NOTICE '✅ Todas as assinaturas sincronizadas';
  ELSE
    RAISE WARNING '⚠️ Diferença de % assinaturas', 
      ABS(v_subs_with_collection - v_sub_collections_count);
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- LOGS DE SUCESSO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Campo active_collection_id adicionado';
  RAISE NOTICE '✅ Dados existentes sincronizados';
  RAISE NOTICE '✅ Triggers de sincronização criados';
  RAISE NOTICE '';
  RAISE NOTICE 'Sistema agora funciona end-to-end:';
  RAISE NOTICE '  1. Nova coleção adicionada → active_collection_id atualizado';
  RAISE NOTICE '  2. Coleção removida → active_collection_id limpo';
  RAISE NOTICE '  3. Frontend pode usar active_collection_id diretamente';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
