-- =====================================================
-- Migration: Add Pricing Tier to Subscription Plans
-- Description: Adiciona relacionamento entre subscription_plans e pricing_tiers
-- =====================================================

-- =====================================================
-- ADICIONAR COLUNA pricing_tier_id
-- =====================================================

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS pricing_tier_id UUID REFERENCES pricing_tiers(id) ON DELETE SET NULL;

-- Criar índice para a foreign key
CREATE INDEX IF NOT EXISTS idx_subscription_plans_pricing_tier_id 
  ON subscription_plans(pricing_tier_id);

-- =====================================================
-- ADICIONAR COLUNA display_order
-- =====================================================

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Criar índice para ordenação
CREATE INDEX IF NOT EXISTS idx_subscription_plans_display_order 
  ON subscription_plans(display_order);

-- =====================================================
-- ATUALIZAR PLANOS EXISTENTES
-- =====================================================

-- Atualizar display_order dos planos existentes
UPDATE subscription_plans
SET display_order = CASE name
  WHEN 'Básico' THEN 1
  WHEN 'Premium' THEN 2
  WHEN 'Colecionador' THEN 3
  ELSE 99
END
WHERE display_order = 0;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN subscription_plans.pricing_tier_id IS 'Referência ao tier de precificação (opcional)';
COMMENT ON COLUMN subscription_plans.display_order IS 'Ordem de exibição dos planos';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
