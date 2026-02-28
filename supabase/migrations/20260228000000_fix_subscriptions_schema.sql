-- =====================================================
-- Migration: Fix Subscriptions Schema
-- Description: Corrige schema da tabela subscriptions para suportar
--              o modelo atual de múltiplas coleções e planos
-- Date: 2026-02-28
-- Issue: POST /subscriptions retorna 400 (Bad Request)
-- Root Cause Analysis:
--   1. Campo collection_id é NOT NULL mas não é mais usado (usamos subscription_collections)
--   2. Campo plan_id não existe mas o código frontend tenta inserir
--   3. Falta relacionamento com subscription_plans
-- =====================================================

-- =====================================================
-- PART 1: Adicionar campo plan_id
-- =====================================================

-- Adicionar coluna plan_id com referência a subscription_plans
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id);

-- Criar índice para performance
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

-- Verificar se o tipo de status já existe
DO $
BEGIN
  -- Adicionar novo status ao enum se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'subscription_status' 
    AND e.enumlabel = 'pending_payment'
  ) THEN
    -- Se o enum não existe, criar constraint check
    ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
      CHECK (status IN ('active', 'paused', 'cancelled', 'completed', 'pending_payment'));
  END IF;
END $;

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
-- PART 5: Adicionar comentários
-- =====================================================

COMMENT ON COLUMN subscriptions.plan_id IS 'Referência ao plano de assinatura escolhido (subscription_plans). Campo obrigatório para novas assinaturas.';
COMMENT ON COLUMN subscriptions.collection_id IS 'DEPRECATED: Campo legado mantido para compatibilidade. Use subscription_collections para relacionamento N:N entre assinaturas e coleções.';
COMMENT ON COLUMN subscriptions.plan_type IS 'Tipo do plano: trimestral (3 entregas), semestral (6 entregas), anual (12 entregas). Mantido para queries rápidas sem JOIN.';

-- =====================================================
-- PART 6: Validação de integridade
-- =====================================================

-- Criar função de validação para garantir que novas assinaturas tenham plan_id
CREATE OR REPLACE FUNCTION validate_subscription_plan()
RETURNS TRIGGER AS $
BEGIN
  -- Para novas assinaturas (não legado), plan_id é obrigatório
  IF NEW.plan_id IS NULL AND (NEW.is_legacy_model IS NULL OR NEW.is_legacy_model = false) THEN
    RAISE EXCEPTION 'plan_id é obrigatório para novas assinaturas';
  END IF;
  
  -- Se plan_id foi fornecido, sincronizar plan_type
  IF NEW.plan_id IS NOT NULL THEN
    SELECT plan_type INTO NEW.plan_type
    FROM subscription_plans
    WHERE id = NEW.plan_id;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Criar trigger de validação
DROP TRIGGER IF EXISTS trigger_validate_subscription_plan ON subscriptions;
CREATE TRIGGER trigger_validate_subscription_plan
  BEFORE INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION validate_subscription_plan();

-- =====================================================
-- PART 7: Atualizar RLS policies se necessário
-- =====================================================

-- As policies existentes continuam funcionando, pois usam user_id

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar estrutura da tabela
DO $
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
  
  -- Verificar se collection_id é nullable
  SELECT is_nullable = 'YES' INTO v_collection_nullable
  FROM information_schema.columns
  WHERE table_name = 'subscriptions'
  AND column_name = 'collection_id';
  
  -- Log de verificação
  RAISE NOTICE 'Migration verificada:';
  RAISE NOTICE '  - plan_id existe: %', v_has_plan_id;
  RAISE NOTICE '  - collection_id nullable: %', v_collection_nullable;
  
  IF NOT v_has_plan_id THEN
    RAISE EXCEPTION 'Falha na migration: plan_id não foi criado';
  END IF;
  
  IF NOT v_collection_nullable THEN
    RAISE EXCEPTION 'Falha na migration: collection_id ainda é NOT NULL';
  END IF;
  
  RAISE NOTICE '✅ Migration aplicada com sucesso!';
END $;
