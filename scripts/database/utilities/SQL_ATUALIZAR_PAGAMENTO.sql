-- ============================================
-- ATUALIZAR ESTRUTURA DE PAGAMENTO - ORDAX
-- Data: 2026-02-15
-- Mudanças:
-- - PIX: 5% desconto (antes 10%)
-- - Parcelamento: até 6x sem juros (antes 10x)
-- - 10x com juros repassado ao cliente
-- ============================================

-- ATUALIZAR PLANO TRIMESTRAL
UPDATE subscription_plans
SET 
  price_full = 1350.00,
  price_pix = 1282.50,  -- 5% desconto (antes 1215.00 com 10%)
  deliveries_total = 3,
  max_installments = 6,  -- Máximo 6x sem juros (antes 10x)
  description = 'Receba 3 personagens consecutivos',
  collections_count = 1,
  collections_count_description = 'Escolha 1 coleção'
WHERE plan_type = 'trimestral';

-- ATUALIZAR PLANO SEMESTRAL (PREMIUM)
UPDATE subscription_plans
SET 
  price_full = 2700.00,
  price_pix = 2565.00,  -- 5% desconto (antes 2430.00 com 10%)
  deliveries_total = 7,
  max_installments = 6,  -- Máximo 6x sem juros (antes 10x)
  description = 'Receba 6 personagens + 1 peça bônus',
  collections_count = 1,
  collections_count_description = 'Escolha 1 coleção'
WHERE plan_type = 'semestral';

-- MANTER ANUAL DESATIVADO
UPDATE subscription_plans
SET is_active = false
WHERE plan_type = 'anual';

-- VERIFICAR RESULTADO
SELECT 
  plan_type,
  name,
  price_full,
  price_pix,
  ROUND((price_full - price_pix) / price_full * 100, 2) as desconto_pix_percent,
  deliveries_total,
  max_installments,
  is_active,
  description
FROM subscription_plans
ORDER BY display_order;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Trimestral: R$ 1.350 | PIX R$ 1.282,50 (5%) | 6x sem juros | Ativo
-- Semestral:  R$ 2.700 | PIX R$ 2.565,00 (5%) | 6x sem juros | Ativo
-- Anual:      R$ 4.200 | PIX R$ 3.780,00 (10%) | 10x sem juros | Inativo
-- ============================================

-- OBSERVAÇÕES:
-- 1. Cliente pode parcelar em até 6x SEM JUROS
-- 2. Cliente pode parcelar em 10x COM JUROS (~20,65% de acréscimo)
-- 3. Exemplo 10x: R$ 500 vira R$ 603,25 (10x de R$ 60,33)
-- 4. Juros de 10x são pagos pelo CLIENTE, não pela loja
