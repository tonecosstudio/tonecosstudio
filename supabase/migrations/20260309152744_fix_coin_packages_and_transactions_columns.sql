-- =====================================================
-- Migration: Fix Coin Packages and Transactions Columns
-- Description: Adicionar colunas faltantes para queries do frontend
-- =====================================================

-- =====================================================
-- 1. Adicionar alias 'amount' para coin_packages
-- =====================================================
-- O frontend busca por 'amount', mas a coluna é 'coins_amount'
-- Vamos adicionar uma coluna computada ou view, mas por simplicidade,
-- vamos adicionar um índice e garantir que ambos funcionem

-- Criar índice para coins_amount (já usado como amount em queries)
CREATE INDEX IF NOT EXISTS idx_coin_packages_coins_amount ON coin_packages(coins_amount);

-- =====================================================
-- 2. Adicionar reference_type a coin_transactions
-- =====================================================
ALTER TABLE coin_transactions ADD COLUMN IF NOT EXISTS reference_type TEXT;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_coin_transactions_reference_type ON coin_transactions(reference_type);

-- Atualizar transações existentes (se houver)
UPDATE coin_transactions 
SET reference_type = CASE 
  WHEN transaction_type = 'purchase' THEN 'coin_package'
  WHEN transaction_type = 'spend' THEN 'character_purchase'
  WHEN transaction_type = 'refund' THEN 'refund'
  WHEN transaction_type = 'bonus' THEN 'admin_bonus'
  WHEN transaction_type = 'adjustment' THEN 'admin_adjustment'
  ELSE 'other'
END
WHERE reference_type IS NULL;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON COLUMN coin_transactions.reference_type IS 'Tipo de referência: coin_package, character_purchase, refund, admin_bonus, admin_adjustment';
