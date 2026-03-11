-- =====================================================
-- Migration: Add Coin Value to Price Categories
-- Description: Adicionar coin_value_in_cents para cotação
-- =====================================================

-- Adicionar coluna coin_value_in_cents
ALTER TABLE price_categories ADD COLUMN IF NOT EXISTS coin_value_in_cents INTEGER DEFAULT 500;

-- Atualizar valores existentes baseado no price_coins
UPDATE price_categories 
SET coin_value_in_cents = CASE 
  WHEN name = 'standard' THEN 500  -- R$ 5,00 por coin (100 coins = R$ 500)
  WHEN name = 'premium' THEN 500
  WHEN name = 'deluxe' THEN 500
  WHEN name = 'special' THEN 500
  ELSE 500
END;

-- Comentário
COMMENT ON COLUMN price_categories.coin_value_in_cents IS 'Valor de 1 coin em centavos (ex: 500 = R$ 5,00 por coin)';
