-- ============================================
-- Migration: Atualizar Desconto PIX para 5%
-- Data: 2026-02-15 13:00
-- Descrição: Corrigir desconto PIX de 10% para 5% em todos os planos
-- ============================================

-- ATUALIZAR PLANO TRIMESTRAL
-- Preço Full: R$ 1.350,00
-- Desconto PIX 5%: R$ 1.350,00 * 0,95 = R$ 1.282,50
UPDATE subscription_plans
SET 
  price_pix = 1282.50,
  updated_at = NOW()
WHERE plan_type = 'trimestral';

-- ATUALIZAR PLANO SEMESTRAL
-- Preço Full: R$ 2.700,00
-- Desconto PIX 5%: R$ 2.700,00 * 0,95 = R$ 2.565,00
UPDATE subscription_plans
SET 
  price_pix = 2565.00,
  updated_at = NOW()
WHERE plan_type = 'semestral';

-- Verificar resultado
SELECT 
  plan_type,
  name,
  price_full,
  price_pix,
  ROUND(((price_full - price_pix) / price_full) * 100, 2) as desconto_percentual,
  deliveries_total,
  is_active
FROM subscription_plans
WHERE is_active = true
ORDER BY display_order;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON COLUMN subscription_plans.price_pix IS 'Preço com 5% de desconto para pagamento via PIX';

-- ============================================
-- VALIDAÇÃO
-- ============================================
-- Deve retornar:
-- Trimestral: price_pix = 1282.50 (5% de desconto)
-- Semestral: price_pix = 2565.00 (5% de desconto)

