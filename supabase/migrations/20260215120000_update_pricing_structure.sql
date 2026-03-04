-- ============================================
-- Migration: Atualizar Estrutura de PreÃƒÂ§os
-- Data: 2026-02-15
-- DescriÃƒÂ§ÃƒÂ£o: Desativar plano anual e atualizar preÃƒÂ§os oficiais
-- ============================================

-- DESATIVAR PLANO ANUAL (mantÃƒÂ©m no banco para uso futuro)
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
  collections_count_description = 'Escolha 1 coleÃƒÂ§ÃƒÂ£o',
  max_installments = 10
WHERE plan_type = 'trimestral';

-- ATUALIZAR PLANO SEMESTRAL (PREMIUM)
UPDATE subscription_plans
SET 
  price_full = 2700.00,
  price_pix = 2565.00,
  deliveries_total = 7,
  description = 'Receba 6 personagens + 1 peÃƒÂ§a bÃƒÂ´nus',
  collections_count = 1,
  collections_count_description = 'Escolha 1 coleÃƒÂ§ÃƒÂ£o',
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
-- COMENTÃƒÂRIOS
-- ============================================
COMMENT ON TABLE subscription_plans IS 'SSOT para planos de assinatura. Anual desativado mas mantido para uso futuro.';
