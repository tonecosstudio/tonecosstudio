-- =====================================================
-- Migration: Fix Subscriptions Schema
-- Description: Corrige schema da tabela subscriptions para suportar
--              o modelo atual de mÃƒÂºltiplas coleÃƒÂ§ÃƒÂµes e planos
-- Date: 2026-02-28
-- Issue: POST /subscriptions retorna 400 (Bad Request)
-- Root Cause Analysis:
--   1. Campo collection_id ÃƒÂ© NOT NULL mas nÃƒÂ£o ÃƒÂ© mais usado (usamos subscription_collections)
--   2. Campo plan_id nÃƒÂ£o existe mas o cÃƒÂ³digo frontend tenta inserir
--   3. Falta relacionamento com subscription_plans
-- =====================================================

-- =====================================================
-- PART 1: Adicionar campo plan_id
-- =====================================================

-- Adicionar coluna plan_id com referÃƒÂªncia a subscription_plans
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id);

-- Criar ÃƒÂ­ndice para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);

-- =====================================================
-- PART 2: Tornar collection_id nullable
-- =====================================================

-- Tornar collection_id nullable (campo legado, mantido para compatibilidade)
ALTER TABLE subscriptions
  ALTER COLUMN collection_id DROP NOT NULL;

-- =====================================================
-- PART 3: Adicionar status pending_payment
-- =====================================================

-- Verificar se o tipo de status jÃƒÂ¡ existe
DO $$
BEGIN
  -- Adicionar novo status ao enum se nÃƒÂ£o existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'subscription_status' 
    AND e.enumlabel = 'pending_payment'
  ) THEN
    -- Se o enum nÃƒÂ£o existe, criar constraint check
    ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
      CHECK (status IN ('active', 'paused', 'cancelled', 'completed', 'pending_payment'));
  END IF;
END $$;

-- =====================================================
-- PART 4: Migrar dados existentes
-- =====================================================

-- Para assinaturas existentes sem plan_id, tentar inferir do plan_type
UPDATE subscriptions s
SET plan_id = (
  SELECT sp.id 
  FROM subscription_plans sp 
  WHERE sp.plan_type = s.plan_type 
  AND sp.is_active = true
  LIMIT 1
)
WHERE plan_id IS NULL 
AND plan_type IS NOT NULL;

-- =====================================================
-- PART 5: Adicionar comentÃƒÂ¡rios
-- =====================================================

COMMENT ON COLUMN subscriptions.plan_id IS 'ReferÃƒÂªncia ao plano de assinatura escolhido (subscription_plans). Campo obrigatÃƒÂ³rio para novas assinaturas.';
COMMENT ON COLUMN subscriptions.collection_id IS 'DEPRECATED: Campo legado mantido para compatibilidade. Use subscription_collections para relacionamento N:N entre assinaturas e coleÃƒÂ§ÃƒÂµes.';
COMMENT ON COLUMN subscriptions.plan_type IS 'Tipo do plano: trimestral (3 entregas), semestral (6 entregas), anual (12 entregas). Mantido para queries rÃƒÂ¡pidas sem JOIN.';

-- =====================================================
-- PART 6: ValidaÃƒÂ§ÃƒÂ£o de integridade
-- =====================================================

-- Criar funÃƒÂ§ÃƒÂ£o de validaÃƒÂ§ÃƒÂ£o para garantir que novas assinaturas tenham plan_id
CREATE OR REPLACE FUNCTION validate_subscription_plan()
RETURNS TRIGGER AS $$
BEGIN
  -- Para novas assinaturas (nÃƒÂ£o legado), plan_id ÃƒÂ© obrigatÃƒÂ³rio
  IF NEW.plan_id IS NULL AND (NEW.is_legacy_model IS NULL OR NEW.is_legacy_model = false) THEN
    RAISE EXCEPTION 'plan_id ÃƒÂ© obrigatÃƒÂ³rio para novas assinaturas';
  END IF;
  
  -- Se plan_id foi fornecido, sincronizar plan_type
  IF NEW.plan_id IS NOT NULL THEN
    SELECT plan_type INTO NEW.plan_type
    FROM subscription_plans
    WHERE id = NEW.plan_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger de validaÃƒÂ§ÃƒÂ£o
DROP TRIGGER IF EXISTS trigger_validate_subscription_plan ON subscriptions;
CREATE TRIGGER trigger_validate_subscription_plan
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_subscription_plan();

-- =====================================================
-- PART 7: Atualizar RLS policies se necessÃƒÂ¡rio
-- =====================================================

-- As policies existentes continuam funcionando, pois usam user_id

-- =====================================================
-- VERIFICAÃƒâ€¡ÃƒÆ’O FINAL
-- =====================================================

-- Verificar estrutura da tabela
DO $$
DECLARE
  v_has_plan_id boolean;
  v_collection_nullable boolean;
BEGIN
  -- Verificar se plan_id existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions'
    AND column_name = 'plan_id'
  ) INTO v_has_plan_id;
  
  -- Verificar se collection_id ÃƒÂ© nullable
  SELECT is_nullable = 'YES' INTO v_collection_nullable
  FROM information_schema.columns
  WHERE table_name = 'subscriptions'
  AND column_name = 'collection_id';
  
  -- Log de verificaÃƒÂ§ÃƒÂ£o
  RAISE NOTICE 'Migration verificada:';
  RAISE NOTICE '  - plan_id existe: %', v_has_plan_id;
  RAISE NOTICE '  - collection_id nullable: %', v_collection_nullable;
  
  IF NOT v_has_plan_id THEN
    RAISE EXCEPTION 'Falha na migration: plan_id nÃƒÂ£o foi criado';
  END IF;
  
  IF NOT v_collection_nullable THEN
    RAISE EXCEPTION 'Falha na migration: collection_id ainda ÃƒÂ© NOT NULL';
  END IF;
  
  RAISE NOTICE 'Ã¢Å“â€¦ Migration aplicada com sucesso!';
END $$;
