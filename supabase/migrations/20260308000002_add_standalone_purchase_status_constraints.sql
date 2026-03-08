-- Migration: Add Status Validation Constraints for Standalone Purchases
-- Date: 2026-03-08
-- Purpose: Add database constraints to prevent invalid status/date combinations
--
-- These constraints work together with the trigger to ensure data integrity:
-- - Trigger: Auto-updates status when dates change
-- - Constraints: Prevent invalid combinations from being saved

-- Drop existing constraints if they exist (for idempotency)
ALTER TABLE standalone_purchases 
  DROP CONSTRAINT IF EXISTS check_balance_paid_status,
  DROP CONSTRAINT IF EXISTS check_deposit_paid_status,
  DROP CONSTRAINT IF EXISTS check_shipped_status,
  DROP CONSTRAINT IF EXISTS check_delivered_status;

-- Constraint 1: If balance_paid_at is set, status must be balance_paid or later
ALTER TABLE standalone_purchases
ADD CONSTRAINT check_balance_paid_status
CHECK (
  balance_paid_at IS NULL OR 
  status IN ('balance_paid', 'shipped', 'delivered', 'completed')
);

COMMENT ON CONSTRAINT check_balance_paid_status ON standalone_purchases IS
'Ensures that when balance_paid_at is set, status must be balance_paid or a later stage';

-- Constraint 2: If deposit_paid_at is set, status cannot be pending
ALTER TABLE standalone_purchases
ADD CONSTRAINT check_deposit_paid_status
CHECK (
  deposit_paid_at IS NULL OR 
  status IN ('deposit_paid', 'awaiting_balance', 'balance_paid', 'shipped', 'delivered', 'completed')
);

COMMENT ON CONSTRAINT check_deposit_paid_status ON standalone_purchases IS
'Ensures that when deposit_paid_at is set, status must be deposit_paid or a later stage';

-- Constraint 3: If shipped_at is set, status must be shipped or later
ALTER TABLE standalone_purchases
ADD CONSTRAINT check_shipped_status
CHECK (
  shipped_at IS NULL OR 
  status IN ('shipped', 'delivered', 'completed')
);

COMMENT ON CONSTRAINT check_shipped_status ON standalone_purchases IS
'Ensures that when shipped_at is set, status must be shipped or a later stage';

-- Constraint 4: If delivered_at is set, status must be delivered or completed
ALTER TABLE standalone_purchases
ADD CONSTRAINT check_delivered_status
CHECK (
  delivered_at IS NULL OR 
  status IN ('delivered', 'completed')
);

COMMENT ON CONSTRAINT check_delivered_status ON standalone_purchases IS
'Ensures that when delivered_at is set, status must be delivered or completed';

-- Verification: Test constraints are working
DO $$
BEGIN
  RAISE NOTICE 'Testing constraints...';
  
  -- Test 1: Try to set balance_paid_at without proper status (should fail)
  BEGIN
    INSERT INTO standalone_purchases (
      id, user_id, collection_id, cycle_id,
      deposit_amount, balance_amount, total_amount,
      status, balance_paid_at
    ) VALUES (
      gen_random_uuid(), 
      (SELECT id FROM profiles LIMIT 1),
      (SELECT id FROM collections LIMIT 1),
      (SELECT id FROM cycles LIMIT 1),
      100, 400, 500,
      'pending', -- INVALID: balance_paid_at set but status is pending
      NOW()
    );
    RAISE EXCEPTION 'Constraint check_balance_paid_status FAILED - invalid data was accepted!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ Constraint check_balance_paid_status is working correctly';
  END;
  
  -- Test 2: Valid data should work
  BEGIN
    INSERT INTO standalone_purchases (
      id, user_id, collection_id, cycle_id,
      deposit_amount, balance_amount, total_amount,
      status, balance_paid_at
    ) VALUES (
      gen_random_uuid(), 
      (SELECT id FROM profiles LIMIT 1),
      (SELECT id FROM collections LIMIT 1),
      (SELECT id FROM cycles LIMIT 1),
      100, 400, 500,
      'balance_paid', -- VALID: balance_paid_at set and status is balance_paid
      NOW()
    );
    -- Clean up test data
    DELETE FROM standalone_purchases WHERE status = 'balance_paid' AND created_at > NOW() - INTERVAL '1 second';
    RAISE NOTICE '✓ Valid data can still be inserted';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Valid data was rejected! Error: %', SQLERRM;
  END;
  
  RAISE NOTICE 'All constraint tests passed ✓';
END $$;
