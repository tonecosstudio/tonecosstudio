-- ============================================
-- ATUALIZAR DESCRIÇÕES DOS PLANOS
-- Remove "Economize" das descrições
-- ============================================

-- ATUALIZAR PLANO TRIMESTRAL
UPDATE subscription_plans
SET description = 'Receba 3 personagens consecutivos'
WHERE plan_type = 'trimestral';

-- ATUALIZAR PLANO SEMESTRAL
UPDATE subscription_plans
SET description = 'Receba 6 personagens + 1 peça bônus'
WHERE plan_type = 'semestral';

-- VERIFICAR RESULTADO
SELECT 
  plan_type,
  name,
  description,
  is_active
FROM subscription_plans
ORDER BY display_order;
