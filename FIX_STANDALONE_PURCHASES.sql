-- =====================================================
-- FIX: Corrigir tabela standalone_purchases
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Adicionar character_id
ALTER TABLE standalone_purchases
  ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES collection_characters(id);

CREATE INDEX IF NOT EXISTS idx_standalone_purchases_character 
  ON standalone_purchases(character_id);

-- 2. Renomear campos de preço
DO $$
BEGIN
  -- Renomear deposit_amount para price_deposit
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'deposit_amount'
  ) THEN
    ALTER TABLE standalone_purchases RENAME COLUMN deposit_amount TO price_deposit;
  END IF;
  
  -- Renomear balance_amount para price_balance
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'balance_amount'
  ) THEN
    ALTER TABLE standalone_purchases RENAME COLUMN balance_amount TO price_balance;
  END IF;
  
  -- Renomear total_amount para price_full
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE standalone_purchases RENAME COLUMN total_amount TO price_full;
  END IF;
END $$;

-- 3. Renomear campos de voucher
DO $$
BEGIN
  -- Renomear payment_voucher_deposit_url para deposit_voucher_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'payment_voucher_deposit_url'
  ) THEN
    ALTER TABLE standalone_purchases RENAME COLUMN payment_voucher_deposit_url TO deposit_voucher_url;
  END IF;
  
  -- Renomear payment_voucher_balance_url para balance_voucher_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'payment_voucher_balance_url'
  ) THEN
    ALTER TABLE standalone_purchases RENAME COLUMN payment_voucher_balance_url TO balance_voucher_url;
  END IF;
END $$;

-- 4. Adicionar campos de data de entrega
ALTER TABLE standalone_purchases
  ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMPTZ;

ALTER TABLE standalone_purchases
  ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMPTZ;

-- 5. Verificar se tudo foi aplicado corretamente
SELECT 
  'character_id' as campo,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'character_id'
  ) THEN '✅ OK' ELSE '❌ FALTANDO' END as status
UNION ALL
SELECT 
  'price_deposit',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'price_deposit'
  ) THEN '✅ OK' ELSE '❌ FALTANDO' END
UNION ALL
SELECT 
  'price_balance',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'price_balance'
  ) THEN '✅ OK' ELSE '❌ FALTANDO' END
UNION ALL
SELECT 
  'price_full',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'price_full'
  ) THEN '✅ OK' ELSE '❌ FALTANDO' END
UNION ALL
SELECT 
  'deposit_voucher_url',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'deposit_voucher_url'
  ) THEN '✅ OK' ELSE '❌ FALTANDO' END
UNION ALL
SELECT 
  'balance_voucher_url',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'balance_voucher_url'
  ) THEN '✅ OK' ELSE '❌ FALTANDO' END
UNION ALL
SELECT 
  'expected_delivery_date',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'expected_delivery_date'
  ) THEN '✅ OK' ELSE '❌ FALTANDO' END
UNION ALL
SELECT 
  'actual_delivery_date',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' AND column_name = 'actual_delivery_date'
  ) THEN '✅ OK' ELSE '❌ FALTANDO' END;
