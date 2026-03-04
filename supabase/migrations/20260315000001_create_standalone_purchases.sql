-- =====================================================
-- MIGRATION: Create standalone_purchases table
-- Date: 2026-03-15
-- Description: Creates table for standalone purchases with deposit model
-- Requirements: 4.1, 4.2, 4.3, 29.9
-- =====================================================

-- =====================================================
-- 1. CREATE STANDALONE_PURCHASES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS standalone_purchases (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Collection reference
  collection_id UUID NOT NULL REFERENCES collections(id),
  
  -- Cycle reference
  cycle_id UUID NOT NULL REFERENCES cycles(id),
  
  -- Status with enum constraint
  status TEXT NOT NULL CHECK (status IN (
    'deposit_paid', 
    'awaiting_balance', 
    'balance_paid', 
    'shipped', 
    'delivered', 
    'cancelled'
  )),
  
  -- Financial fields
  deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 100.00, -- R$100 fixed deposit (arras confirmatÃƒÆ’Ã‚Â³rias)
  balance_amount DECIMAL(10,2) NOT NULL, -- collection price - deposit
  total_amount DECIMAL(10,2) NOT NULL, -- collection price
  
  -- Timestamps for status transitions (all stored in UTC, converted from America/Bahia timezone)
  deposit_paid_at TIMESTAMPTZ,
  balance_due_date TIMESTAMPTZ, -- 5 business days after production_complete_at
  balance_paid_at TIMESTAMPTZ,
  production_complete_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Cancellation details
  cancellation_reason TEXT,
  
  -- Shipping information
  tracking_code TEXT,
  
  -- Payment verification
  payment_voucher_deposit_url TEXT,
  payment_voucher_balance_url TEXT,
  
  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_user ON standalone_purchases(user_id);

-- Index for cycle lookups
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_cycle ON standalone_purchases(cycle_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_status ON standalone_purchases(status);

-- Partial index for balance due date (only for purchases awaiting balance)
CREATE INDEX IF NOT EXISTS idx_standalone_purchases_balance_due ON standalone_purchases(balance_due_date) 
  WHERE status = 'awaiting_balance';

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE standalone_purchases IS 'Stores standalone purchases with R$100 deposit model (arras confirmatÃƒÆ’Ã‚Â³rias). Balance must be paid within 5 business days after production completion.';

COMMENT ON COLUMN standalone_purchases.deposit_amount IS 'Fixed R$100.00 deposit (non-refundable arras confirmatÃƒÆ’Ã‚Â³rias)';
COMMENT ON COLUMN standalone_purchases.balance_amount IS 'Remaining amount after deposit (collection price - 100)';
COMMENT ON COLUMN standalone_purchases.total_amount IS 'Total collection price';
COMMENT ON COLUMN standalone_purchases.balance_due_date IS 'Deadline for balance payment (5 business days after production completion)';
COMMENT ON COLUMN standalone_purchases.cancellation_reason IS 'Reason for cancellation, typically "Balance payment not received within deadline (Arras ConfirmatÃƒÆ’Ã‚Â³rias)"';

-- =====================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_standalone_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_standalone_purchases_updated_at
  BEFORE UPDATE ON standalone_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_standalone_purchases_updated_at();

-- =====================================================
-- 5. VALIDATE TABLE CREATION
-- =====================================================

DO $$
BEGIN
  -- Check if table was created
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'standalone_purchases'
  ) THEN
    RAISE EXCEPTION 'Table standalone_purchases was not created';
  END IF;
  
  -- Check if indexes were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'standalone_purchases' 
    AND indexname = 'idx_standalone_purchases_user'
  ) THEN
    RAISE EXCEPTION 'Index idx_standalone_purchases_user was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'standalone_purchases' 
    AND indexname = 'idx_standalone_purchases_cycle'
  ) THEN
    RAISE EXCEPTION 'Index idx_standalone_purchases_cycle was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'standalone_purchases' 
    AND indexname = 'idx_standalone_purchases_status'
  ) THEN
    RAISE EXCEPTION 'Index idx_standalone_purchases_status was not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'standalone_purchases' 
    AND indexname = 'idx_standalone_purchases_balance_due'
  ) THEN
    RAISE EXCEPTION 'Index idx_standalone_purchases_balance_due was not created';
  END IF;
  
  RAISE NOTICE 'Migration 20260315000000_create_standalone_purchases.sql completed successfully';
END $$;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant SELECT to authenticated users (they can view their own purchases via RLS)
GRANT SELECT ON standalone_purchases TO authenticated;

-- Grant INSERT, UPDATE to authenticated users (they can create and update their own purchases via RLS)
GRANT INSERT, UPDATE ON standalone_purchases TO authenticated;

-- Grant all to service role (for backend operations)
GRANT ALL ON standalone_purchases TO service_role;

-- =====================================================
-- 7. MIGRATION SUMMARY
-- =====================================================

SELECT 
  '20260315000000_create_standalone_purchases.sql' AS migration_file,
  'Create standalone_purchases table' AS description,
  'SUCCESS' AS status,
  NOW() AS executed_at,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'standalone_purchases') AS table_created,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'standalone_purchases') AS indexes_created;