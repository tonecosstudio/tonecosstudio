-- =====================================================
-- MIGRATION: Add rejection_reason fields for payment vouchers
-- Date: 2026-04-20
-- Description: Adds rejection_reason fields to standalone_purchases and subscriptions
--              to store admin rejection reasons for payment vouchers
-- Requirements: 25.8, 25.9
-- Task: 25.6
-- =====================================================

-- =====================================================
-- 1. ADD REJECTION_REASON TO STANDALONE_PURCHASES
-- =====================================================

-- Add rejection_reason field for deposit voucher
ALTER TABLE standalone_purchases
  ADD COLUMN IF NOT EXISTS deposit_rejection_reason TEXT;

-- Add rejection_reason field for balance voucher
ALTER TABLE standalone_purchases
  ADD COLUMN IF NOT EXISTS balance_rejection_reason TEXT;

-- Add comments for documentation
COMMENT ON COLUMN standalone_purchases.deposit_rejection_reason IS 
  'Reason provided by admin when deposit payment voucher is rejected. Cleared when new voucher is uploaded.';

COMMENT ON COLUMN standalone_purchases.balance_rejection_reason IS 
  'Reason provided by admin when balance payment voucher is rejected. Cleared when new voucher is uploaded.';

-- =====================================================
-- 2. ADD REJECTION_REASON TO SUBSCRIPTIONS
-- =====================================================

-- Add rejection_reason field for subscription payment voucher
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.payment_rejection_reason IS 
  'Reason provided by admin when payment voucher is rejected. Cleared when new voucher is uploaded.';

-- =====================================================
-- 3. VALIDATE MIGRATION
-- =====================================================

DO $$
BEGIN
  -- Check if columns were added to standalone_purchases
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standalone_purchases'
    AND column_name = 'deposit_rejection_reason'
  ) THEN
    RAISE EXCEPTION 'Column deposit_rejection_reason was not added to standalone_purchases';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standalone_purchases'
    AND column_name = 'balance_rejection_reason'
  ) THEN
    RAISE EXCEPTION 'Column balance_rejection_reason was not added to standalone_purchases';
  END IF;
  
  -- Check if column was added to subscriptions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'subscriptions'
    AND column_name = 'payment_rejection_reason'
  ) THEN
    RAISE EXCEPTION 'Column payment_rejection_reason was not added to subscriptions';
  END IF;
  
  RAISE NOTICE 'Migration 20260420000000_add_rejection_reason_fields.sql completed successfully';
END $$;

-- =====================================================
-- 4. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260420000000_add_rejection_reason_fields.sql' AS migration_file,
  'Add rejection_reason fields for payment vouchers' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'standalone_purchases' AND column_name IN ('deposit_rejection_reason', 'balance_rejection_reason')) AS standalone_columns_added,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'payment_rejection_reason') AS subscription_columns_added;
