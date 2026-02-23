-- ============================================
-- Migration: Atualizar Estrutura de Preços
-- Data: 2026-02-15
-- Descrição: Desativar plano anual e atualizar preços oficiais
-- ============================================

-- DESATIVAR PLANO ANUAL (mantém no banco para uso futuro)
UPDATE subscription_plans
SET is_active = false
WHERE plan_type = 'anual';

-- ATUALIZAR PLANO TRIMESTRAL
UPDATE subscription_plans
SET 
  price_full = 1350.00,
  price_pix = 1282.50,
  deliveries_total = 3,
  description = 'Receba 3 personagens consecutivos',
  collections_count = 1,
  collections_count_description = 'Escolha 1 coleção',
  max_installments = 10
WHERE plan_type = 'trimestral';

-- ATUALIZAR PLANO SEMESTRAL (PREMIUM)
UPDATE subscription_plans
SET 
  price_full = 2700.00,
  price_pix = 2565.00,
  deliveries_total = 7,
  description = 'Receba 6 personagens + 1 peça bônus',
  collections_count = 1,
  collections_count_description = 'Escolha 1 coleção',
  max_installments = 10
WHERE plan_type = 'semestral';

-- Verificar resultado
SELECT 
  plan_type,
  name,
  price_full,
  price_pix,
  deliveries_total,
  collections_count,
  is_active,
  description
FROM subscription_plans
ORDER BY display_order;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE subscription_plans IS 'SSOT para planos de assinatura. Anual desativado mas mantido para uso futuro.';
