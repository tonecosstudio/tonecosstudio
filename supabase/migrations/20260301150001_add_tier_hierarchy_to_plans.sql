-- Migration: Adicionar colunas de hierarquia em subscription_plans
-- Feature: pricing-system-restructure
-- Requisitos: 1.3, 1.4, 1.5
-- Descrição: Adiciona colunas tier_id, plan_mode e price_multiplier para vincular planos aos níveis

-- Adicionar colunas para hierarquia
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES pricing_tiers(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS plan_mode TEXT DEFAULT 'standalone' 
  CHECK (plan_mode IN ('standalone', 'trimestral', 'semestral', 'anual')),
ADD COLUMN IF NOT EXISTS price_multiplier NUMERIC(5,3) DEFAULT 1.000 
  CHECK (price_multiplier > 0 AND price_multiplier <= 2.0);

-- Atualizar plan_mode baseado em plan_type existente para planos sem tier_id
UPDATE subscription_plans
SET plan_mode = CASE
  WHEN plan_type = 'standalone' THEN 'standalone'
  WHEN plan_type = 'trimestral' OR plan_type = 'quarterly' THEN 'trimestral'
  WHEN plan_type = 'semestral' OR plan_type = 'semiannual' THEN 'semestral'
  WHEN plan_type = 'anual' OR plan_type = 'annual' THEN 'anual'
  ELSE 'standalone'
END
WHERE plan_mode IS NULL;

-- Tornar plan_mode NOT NULL após popular
ALTER TABLE subscription_plans
ALTER COLUMN plan_mode SET NOT NULL;

-- Criar constraint de unicidade: um plano por modalidade por nível
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plans_tier_mode 
ON subscription_plans(tier_id, plan_mode) 
WHERE tier_id IS NOT NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier_id ON subscription_plans(tier_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_mode ON subscription_plans(plan_mode);

-- Adicionar comentários
COMMENT ON COLUMN subscription_plans.tier_id IS 'Nível de preço ao qual este plano pertence (NULL para planos legados)';
COMMENT ON COLUMN subscription_plans.plan_mode IS 'Modalidade de compra: standalone (avulso), trimestral, semestral, anual';
COMMENT ON COLUMN subscription_plans.price_multiplier IS 'Multiplicador aplicado ao preço base do nível para calcular preço deste plano';
