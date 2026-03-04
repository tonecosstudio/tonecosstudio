-- =====================================================
-- MIGRATION: Add missing fields to standalone_purchases
-- Date: 2026-04-27
-- Description: Adds character_id and renames price fields to match code expectations
-- =====================================================

-- =====================================================
-- 1. ADD CHARACTER_ID FIELD
-- =====================================================

-- Add character_id field to standalone_purchases
ALTER TABLE standalone_purchases
  ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES collection_characters(id);

-- CREATE INDEX IF NOT EXISTS for character lookups
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_character 
  ON standalone_purchases(character_id);

COMMENT ON COLUMN standalone_purchases.character_id IS 'Reference to the specific character purchased';

-- =====================================================
-- 2. RENAME PRICE FIELDS TO MATCH CODE EXPECTATIONS
-- =====================================================

-- Rename deposit_amount to price_deposit
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'deposit_amount'
  ) THEN
    ALTER TABLE standalone_purchases RENAME COLUMN deposit_amount TO price_deposit;
    RAISE NOTICE 'Renamed deposit_amount to price_deposit';
  END IF;
END $$;

-- Rename balance_amount to price_balance
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'balance_amount'
  ) THEN
    ALTER TABLE standalone_purchases RENAME COLUMN balance_amount TO price_balance;
    RAISE NOTICE 'Renamed balance_amount to price_balance';
  END IF;
END $$;

-- Rename total_amount to price_full
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE standalone_purchases RENAME COLUMN total_amount TO price_full;
    RAISE NOTICE 'Renamed total_amount to price_full';
  END IF;
END $$;

-- =====================================================
-- 3. RENAME VOUCHER FIELDS TO MATCH CODE EXPECTATIONS
-- =====================================================

-- Rename payment_voucher_deposit_url to deposit_voucher_url
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'payment_voucher_deposit_url'
  ) THEN
    ALTER TABLE standalone_purchases RENAME COLUMN payment_voucher_deposit_url TO deposit_voucher_url;
    RAISE NOTICE 'Renamed payment_voucher_deposit_url to deposit_voucher_url';
  END IF;
END $$;

-- Rename payment_voucher_balance_url to balance_voucher_url
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'payment_voucher_balance_url'
  ) THEN
    ALTER TABLE standalone_purchases RENAME COLUMN payment_voucher_balance_url TO balance_voucher_url;
    RAISE NOTICE 'Renamed payment_voucher_balance_url to balance_voucher_url';
  END IF;
END $$;

-- =====================================================
-- 4. ADD EXPECTED_DELIVERY_DATE AND ACTUAL_DELIVERY_DATE
-- =====================================================

-- Add expected_delivery_date if it doesn't exist
ALTER TABLE standalone_purchases
  ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMPTZ;

-- Add actual_delivery_date if it doesn't exist
ALTER TABLE standalone_purchases
  ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMPTZ;

COMMENT ON COLUMN standalone_purchases.expected_delivery_date IS 'Expected delivery date for the purchase';
COMMENT ON COLUMN standalone_purchases.actual_delivery_date IS 'Actual delivery date when the purchase was delivered';

-- =====================================================
-- 5. VALIDATE CHANGES
-- =====================================================

DO $$
BEGIN
  -- Check if character_id was added
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'character_id'
  ) THEN
    RAISE EXCEPTION 'Column character_id was not added';
  END IF;
  
  -- Check if price fields were renamed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'price_deposit'
  ) THEN
    RAISE EXCEPTION 'Column price_deposit does not exist';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'price_balance'
  ) THEN
    RAISE EXCEPTION 'Column price_balance does not exist';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'price_full'
  ) THEN
    RAISE EXCEPTION 'Column price_full does not exist';
  END IF;
  
  -- Check if voucher fields were renamed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'deposit_voucher_url'
  ) THEN
    RAISE EXCEPTION 'Column deposit_voucher_url does not exist';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'balance_voucher_url'
  ) THEN
    RAISE EXCEPTION 'Column balance_voucher_url does not exist';
  END IF;
  
  -- Check if delivery date fields were added
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'expected_delivery_date'
  ) THEN
    RAISE EXCEPTION 'Column expected_delivery_date was not added';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'standalone_purchases' 
    AND column_name = 'actual_delivery_date'
  ) THEN
    RAISE EXCEPTION 'Column actual_delivery_date was not added';
  END IF;
  
  RAISE NOTICE 'Migration 20260427000000_add_missing_fields_to_standalone_purchases.sql completed successfully';
END $$;

-- =====================================================
-- 6. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260427000000_add_missing_fields_to_standalone_purchases.sql' AS migration_file,
  'Add missing fields to standalone_purchases' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at;
