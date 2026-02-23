-- Migration: Remove Annual Plan and Update Pricing Structure
-- Purpose: Keep only Trimestral and Semestral plans with new pricing
-- Date: 2026-02-15
-- Author: ORDAX Team

-- ============================================
-- STEP 1: Desativar plano anual
-- ============================================
UPDATE subscription_plans
SET is_active = false
WHERE plan_type = 'anual';

-- ============================================
-- STEP 2: Atualizar preços oficiais
-- ============================================

-- TRIMESTRAL: R$ 1.350 (3 peças)
UPDATE subscription_plans
SET 
  price_full = 1350.00,
  price_pix = 1215.00,  -- 10% desconto
  deliveries_total = 3,
  description = 'Receba 3 peças exclusivas a cada 3 meses. Economize R$ 150!',
  collections_count = 1,
  collections_count_description = 'Escolha 1 coleção',
  max_installments = 10
WHERE plan_type = 'trimestral';

-- SEMESTRAL: R$ 2.700 (6 + 1 bônus = 7 peças)
UPDATE subscription_plans
SET 
  price_full = 2700.00,
  price_pix = 2430.00,  -- 10% desconto
  deliveries_total = 7,
  description = 'Receba 7 peças exclusivas a cada 6 meses (6 + 1 BÔNUS!). Economize R$ 800!',
  collections_count = 1,
  collections_count_description = 'Escolha 1 coleção',
  max_installments = 10
WHERE plan_type = 'semestral';

-- ============================================
-- STEP 3: Verificar resultado
-- ============================================
SELECT 
  plan_type,
  name,
  price_full,
  price_pix,
  deliveries_total,
  collections_count,
  max_installments,
  is_active,
  description
FROM subscription_plans
ORDER BY display_order;

-- ============================================
-- STEP 4: Adicionar comentário
-- ============================================
COMMENT ON TABLE subscription_plans IS 'SSOT para planos de assinatura. Apenas Trimestral e Semestral ativos.';
