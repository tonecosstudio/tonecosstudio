-- ============================================
-- APLICAR AGORA: Desconto PIX 5%
-- Copie e cole este SQL no Supabase SQL Editor
-- ============================================

-- 1. VERIFICAR VALORES ATUAIS
SELECT 
  '=== VALORES ATUAIS ===' as status,
  plan_type,
  name,
  price_full,
  price_pix,
  ROUND(((price_full - price_pix) / price_full) * 100, 2) as desconto_atual
FROM subscription_plans
WHERE is_active = true
ORDER BY display_order;

-- 2. ATUALIZAR PARA 5% DE DESCONTO

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

-- 3. VERIFICAR RESULTADO
SELECT 
  '=== VALORES ATUALIZADOS ===' as status,
  plan_type,
  name,
  price_full,
  price_pix,
  ROUND(((price_full - price_pix) / price_full) * 100, 2) as desconto_novo,
  price_full - price_pix as economia_reais
FROM subscription_plans
WHERE is_active = true
ORDER BY display_order;

-- ============================================
-- RESULTADO ESPERADO:
-- trimestral | 1350.00 | 1282.50 | 5.00 | 67.50
-- semestral  | 2700.00 | 2565.00 | 5.00 | 135.00
-- ============================================

