-- ============================================================================
-- Migration: Add Coin Conversion Rate to Price Categories
-- Description: Adiciona campo para mostrar quanto custaria comprar os coins
-- Date: 2026-03-07 02:00:00
-- ============================================================================

-- Adicionar coluna para taxa de conversão de coins
ALTER TABLE price_categories
ADD COLUMN IF NOT EXISTS coin_value_in_cents INTEGER DEFAULT 200;

COMMENT ON COLUMN price_categories.coin_value_in_cents IS 
  'Valor de 1 coin em centavos (ex: 200 = R$ 2,00 por coin).
   Usado para calcular quanto custaria comprar os coins necessários.
   Exemplo: 200 coins × R$ 2,00 = R$ 400,00';

-- Atualizar categorias existentes com valor padrão (R$ 2,00 por coin)
UPDATE price_categories
SET coin_value_in_cents = 200
WHERE coin_value_in_cents IS NULL;

-- Tornar NOT NULL após popular
ALTER TABLE price_categories
ALTER COLUMN coin_value_in_cents SET NOT NULL;

-- Verificação
DO $$
DECLARE
  v_category RECORD;
  v_coin_cost INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONVERSÃO DE COINS ADICIONADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOR v_category IN 
    SELECT * FROM price_categories ORDER BY display_order
  LOOP
    v_coin_cost := v_category.price_coins * v_category.coin_value_in_cents;
    
    RAISE NOTICE '% (%)', v_category.display_name, v_category.name;
    RAISE NOTICE '  Coins: %', v_category.price_coins;
    RAISE NOTICE '  Valor por coin: R$ %', (v_category.coin_value_in_cents::FLOAT / 100);
    RAISE NOTICE '  Custo em coins: R$ %', (v_coin_cost::FLOAT / 100);
    RAISE NOTICE '  Avulso: R$ %', (v_category.price_standalone::FLOAT / 100);
    RAISE NOTICE '  Economia: R$ %', ((v_category.price_standalone - v_coin_cost)::FLOAT / 100);
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE 'Valor padrão: R$ 2,00 por coin';
  RAISE NOTICE 'Admin pode ajustar este valor por categoria';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
