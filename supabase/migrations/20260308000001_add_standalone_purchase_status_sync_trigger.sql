-- Migration: Add Status Synchronization Trigger for Standalone Purchases
-- Date: 2026-03-08
-- Purpose: Automatically sync status field when payment date fields are updated
--
-- Problem: Status can become inconsistent when payment dates are updated directly
-- Solution: Trigger that automatically updates status based on payment date fields
--
-- Status Flow:
-- pending → deposit_paid → awaiting_balance → balance_paid → shipped → delivered → completed

-- Drop trigger and function if they exist (for idempotency)
DROP TRIGGER IF EXISTS standalone_purchase_status_sync ON standalone_purchases;
DROP FUNCTION IF EXISTS sync_standalone_purchase_status();

-- Create function to sync status with payment dates
CREATE OR REPLACE FUNCTION sync_standalone_purchase_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Rule 1: If balance_paid_at is set and status is still deposit_paid or awaiting_balance
  -- → Update status to balance_paid
  IF NEW.balance_paid_at IS NOT NULL 
     AND (OLD.balance_paid_at IS NULL OR OLD.balance_paid_at IS DISTINCT FROM NEW.balance_paid_at)
     AND NEW.status IN ('deposit_paid', 'awaiting_balance', 'pending') THEN
    
    NEW.status := 'balance_paid';
    RAISE NOTICE 'Auto-updated status to balance_paid for purchase %', NEW.id;
  END IF;
  
  -- Rule 2: If deposit_paid_at is set and status is still pending
  -- → Update status to deposit_paid
  IF NEW.deposit_paid_at IS NOT NULL 
     AND (OLD.deposit_paid_at IS NULL OR OLD.deposit_paid_at IS DISTINCT FROM NEW.deposit_paid_at)
     AND NEW.status = 'pending' THEN
    
    NEW.status := 'deposit_paid';
    RAISE NOTICE 'Auto-updated status to deposit_paid for purchase %', NEW.id;
  END IF;
  
  -- Rule 3: If shipped_at is set and status is balance_paid
  -- → Update status to shipped
  IF NEW.shipped_at IS NOT NULL 
     AND (OLD.shipped_at IS NULL OR OLD.shipped_at IS DISTINCT FROM NEW.shipped_at)
     AND NEW.status = 'balance_paid' THEN
    
    NEW.status := 'shipped';
    RAISE NOTICE 'Auto-updated status to shipped for purchase %', NEW.id;
  END IF;
  
  -- Rule 4: If delivered_at is set and status is shipped
  -- → Update status to delivered
  IF NEW.delivered_at IS NOT NULL 
     AND (OLD.delivered_at IS NULL OR OLD.delivered_at IS DISTINCT FROM NEW.delivered_at)
     AND NEW.status = 'shipped' THEN
    
    NEW.status := 'delivered';
    RAISE NOTICE 'Auto-updated status to delivered for purchase %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires BEFORE UPDATE
CREATE TRIGGER standalone_purchase_status_sync
  BEFORE UPDATE ON standalone_purchases
  FOR EACH ROW
  EXECUTE FUNCTION sync_standalone_purchase_status();

-- Add comment for documentation
COMMENT ON FUNCTION sync_standalone_purchase_status() IS 
'Automatically synchronizes standalone_purchases.status with payment date fields.
Prevents inconsistencies when dates are updated directly without updating status.
Fires on BEFORE UPDATE to modify the NEW record before it is saved.';

COMMENT ON TRIGGER standalone_purchase_status_sync ON standalone_purchases IS
'Ensures status field stays consistent with payment date fields (deposit_paid_at, balance_paid_at, etc.)';

-- Verification query (run manually to check existing inconsistencies)
DO $$
DECLARE
  inconsistent_count INTEGER;
BEGIN
  -- Count purchases where balance_paid_at is set but status is wrong
  SELECT COUNT(*) INTO inconsistent_count
  FROM standalone_purchases
  WHERE balance_paid_at IS NOT NULL 
    AND status NOT IN ('balance_paid', 'shipped', 'delivered', 'completed');
  
  IF inconsistent_count > 0 THEN
    RAISE WARNING 'Found % standalone_purchases with inconsistent status. Run fix script: scripts/database/fix-standalone-purchase-status.mjs', inconsistent_count;
  ELSE
    RAISE NOTICE 'All standalone_purchases have consistent status ✓';
  END IF;
  
  -- Count purchases where deposit_paid_at is set but status is pending
  SELECT COUNT(*) INTO inconsistent_count
  FROM standalone_purchases
  WHERE deposit_paid_at IS NOT NULL 
    AND status = 'pending';
  
  IF inconsistent_count > 0 THEN
    RAISE WARNING 'Found % standalone_purchases with deposit paid but status=pending', inconsistent_count;
  ELSE
    RAISE NOTICE 'All deposits have correct status ✓';
  END IF;
END $$;
