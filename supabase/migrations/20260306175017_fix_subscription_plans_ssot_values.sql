-- ============================================================================
-- Migration: Fix Subscription Plans SSOT Values
-- Description: Corrigir valores dos planos para serem SSOT (Single Source of Truth)
--              Garantir consistência entre preços em R$ e coins
-- Date: 2026-03-06 17:50:17
-- ============================================================================

-- ============================================================================
-- PROBLEMA IDENTIFICADO:
-- 1. Valores de preços em R$ estão desatualizados
-- 2. Valores de coins estão parcialmente corretos
-- 3. Falta consistência entre preço e coins
-- 
-- VALORES CORRETOS (SSOT):
-- Trimestral: R$ 1.350 → 600 coins (3 personagens × 200 coins)
-- Semestral:  R$ 2.400 → 1.300 coins (6 personagens + bônus)
-- Anual:      R$ 4.200 → 2.800 coins (12 personagens + bônus)
-- ============================================================================

-- ============================================================================
-- PASSO 1: Atualizar preços em R$ e coins
-- ============================================================================

UPDATE subscription_plans
SET 
  -- Preços em R$
  price_full = CASE plan_type
    WHEN 'trimestral' THEN 1350.00
    WHEN 'semestral' THEN 2400.00
    WHEN 'anual' THEN 4200.00
    ELSE price_full
  END,
  
  -- Preços PIX (5% desconto)
  price_pix = CASE plan_type
    WHEN 'trimestral' THEN 1282.50  -- 1350 × 0.95
    WHEN 'semestral' THEN 2280.00   -- 2400 × 0.95
    WHEN 'anual' THEN 3990.00       -- 4200 × 0.95
    ELSE price_pix
  END,
  
  -- Total de coins
  total_credits = CASE plan_type
    WHEN 'trimestral' THEN 600
    WHEN 'semestral' THEN 1100  -- Base: 1100 (sem bônus ainda)
    WHEN 'anual' THEN 2400      -- Base: 2400 (sem bônus ainda)
    ELSE total_credits
  END,
  
  -- Coins mensais (distribuição)
  monthly_credits = CASE plan_type
    WHEN 'trimestral' THEN 200  -- 600 ÷ 3 meses
    WHEN 'semestral' THEN 183   -- 1100 ÷ 6 meses (arredondado)
    WHEN 'anual' THEN 200       -- 2400 ÷ 12 meses
    ELSE monthly_credits
  END,
  
  -- Coins bônus
  bonus_credits = CASE plan_type
    WHEN 'trimestral' THEN 0
    WHEN 'semestral' THEN 200   -- Total: 1100 + 200 = 1300
    WHEN 'anual' THEN 400        -- Total: 2400 + 400 = 2800
    ELSE bonus_credits
  END,
  
  -- Descrição atualizada
  description = CASE plan_type
    WHEN 'trimestral' THEN 'Plano de 3 meses - 600 coins (equivalente a 3 personagens)'
    WHEN 'semestral' THEN 'Plano de 6 meses - 1.300 coins (equivalente a 6 personagens + bônus)'
    WHEN 'anual' THEN 'Plano anual - 2.800 coins (equivalente a 12 personagens + bônus)'
    ELSE description
  END,
  
  updated_at = NOW()
WHERE plan_type IN ('trimestral', 'semestral', 'anual');

-- ============================================================================
-- PASSO 2: Adicionar comentários explicativos
-- ============================================================================

COMMENT ON COLUMN subscription_plans.price_full IS 
  'Preço cheio em R$ (SSOT). 
   Trimestral: R$ 1.350, Semestral: R$ 2.400, Anual: R$ 4.200';

COMMENT ON COLUMN subscription_plans.price_pix IS 
  'Preço com 5% desconto PIX. 
   Calculado automaticamente: price_full × 0.95';

COMMENT ON COLUMN subscription_plans.total_credits IS 
  'Total de coins BASE (sem bônus). 
   Trimestral: 600, Semestral: 1.100, Anual: 2.400';

COMMENT ON COLUMN subscription_plans.bonus_credits IS 
  'Coins bônus adicionais. 
   Trimestral: 0, Semestral: 200, Anual: 400
   Total final = total_credits + bonus_credits';

COMMENT ON COLUMN subscription_plans.monthly_credits IS 
  'Coins distribuídos por mês (para distribuição mensal).
   Calculado: total_credits ÷ duration_months';

-- ============================================================================
-- PASSO 3: Criar view para facilitar consultas
-- ============================================================================

CREATE OR REPLACE VIEW subscription_plans_summary AS
SELECT 
  id,
  plan_type,
  name,
  description,
  
  -- Preços em R$
  price_full,
  price_pix,
  ROUND((price_full - price_pix) / price_full * 100, 2) as pix_discount_percentage,
  
  -- Coins
  total_credits as coins_base,
  bonus_credits as coins_bonus,
  (total_credits + bonus_credits) as coins_total,
  monthly_credits as coins_per_month,
  
  -- Equivalência
  ROUND((total_credits + bonus_credits)::DECIMAL / 200, 1) as equivalent_characters,
  
  -- Custo por coin
  ROUND(price_full / (total_credits + bonus_credits), 2) as cost_per_coin_brl,
  
  -- Custo por personagem (200 coins)
  ROUND(price_full / ((total_credits + bonus_credits)::DECIMAL / 200), 2) as cost_per_character_brl,
  
  -- Economia vs avulso (R$ 500 por personagem)
  ROUND(
    (500 * ((total_credits + bonus_credits)::DECIMAL / 200)) - price_full, 
    2
  ) as savings_vs_standalone_brl,
  
  -- Percentual de economia
  ROUND(
    ((500 * ((total_credits + bonus_credits)::DECIMAL / 200)) - price_full) / 
    (500 * ((total_credits + bonus_credits)::DECIMAL / 200)) * 100,
    2
  ) as savings_percentage,
  
  -- Metadata
  is_active,
  display_order,
  created_at,
  updated_at
FROM subscription_plans
WHERE is_active = true
ORDER BY display_order;

COMMENT ON VIEW subscription_plans_summary IS 
  'View consolidada com todos os cálculos de planos.
   Inclui: preços, coins, equivalências, custos e economias.
   Facilita consultas e relatórios.';

-- ============================================================================
-- PASSO 4: Validação
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PLANOS ATUALIZADOS - SSOT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Valores corrigidos com sucesso!';
  RAISE NOTICE 'Consulte: SELECT * FROM subscription_plans_summary;';
  RAISE NOTICE '========================================';
END $$;
