-- ============================================
-- SQL: Atualizar Desconto PIX para 5%
-- Data: 2026-02-15
-- Uso: Executar diretamente no Supabase SQL Editor
-- ============================================

-- ANTES DE EXECUTAR: Verificar valores atuais
SELECT 
  plan_type,
  name,
  price_full,
  price_pix,
  ROUND(((price_full - price_pix) / price_full) * 100, 2) as desconto_atual,
  deliveries_total,
  is_active
FROM subscription_plans
WHERE is_active = true
ORDER BY display_order;

-- ============================================
-- ATUALIZAR PREÇOS PIX (5% DESCONTO)
-- ============================================

-- Trimestral: R$ 1.350,00 -> R$ 1.282,50 (5% OFF)
UPDATE subscription_plans
SET 
  price_pix = 1282.50,
  updated_at = NOW()
WHERE plan_type = 'trimestral';

-- Semestral: R$ 2.700,00 -> R$ 2.565,00 (5% OFF)
UPDATE subscription_plans
SET 
  price_pix = 2565.00,
  updated_at = NOW()
WHERE plan_type = 'semestral';

-- ============================================
-- VERIFICAR RESULTADO
-- ============================================

SELECT 
  plan_type,
  name,
  price_full,
  price_pix,
  ROUND(((price_full - price_pix) / price_full) * 100, 2) as desconto_percentual,
  price_full - price_pix as economia_reais,
  deliveries_total,
  is_active
FROM subscription_plans
WHERE is_active = true
ORDER BY display_order;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- trimestral  | Plano Trimestral | 1350.00 | 1282.50 | 5.00 | 67.50  | 3 | true
-- semestral   | Plano Semestral  | 2700.00 | 2565.00 | 5.00 | 135.00 | 7 | true

-- ============================================
-- CÁLCULOS DE REFERÊNCIA
-- ============================================

-- AVULSO (não tem plano, mas para referência):
-- Preço Full: R$ 500,00
-- Preço PIX (5% OFF): R$ 475,00
-- Entrada: R$ 100,00
-- Restante PIX: R$ 375,00
-- Restante Parcelado: R$ 400,00

-- TRIMESTRAL:
-- Preço Full: R$ 1.350,00
-- Preço PIX (5% OFF): R$ 1.282,50
-- Economia: R$ 67,50
-- Preço por peça: R$ 450,00

-- SEMESTRAL:
-- Preço Full: R$ 2.700,00
-- Preço PIX (5% OFF): R$ 2.565,00
-- Economia: R$ 135,00
-- Preço por peça: R$ 385,71 (7 peças = 6 + 1 bônus)

