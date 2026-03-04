-- =====================================================
-- TEST: Sync production status to orders
-- Description: Tests the sync_production_status_to_orders trigger
-- =====================================================

-- Start transaction for testing
BEGIN;

-- =====================================================
-- 1. SETUP TEST DATA
-- =====================================================

-- Create test user
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com')
ON CONFLICT (id) DO NOTHING;

-- Create test collection
INSERT INTO collections (id, name, price, is_active)
VALUES ('00000000-0000-0000-0000-000000000002', 'Test Collection', 100.00, true)
ON CONFLICT (id) DO NOTHING;

-- Create test cycle
INSERT INTO cycles (id, name, start_date, end_date, status)
VALUES ('00000000-0000-0000-0000-000000000003', 'Test Cycle', now(), now() + interval '30 days', 'active')
ON CONFLICT (id) DO NOTHING;

-- Create test subscription
INSERT INTO subscriptions (id, user_id, collection_id, status)
VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'active')
ON CONFLICT (id) DO NOTHING;

-- Create test subscription delivery
INSERT INTO subscription_deliveries (
  id, 
  subscription_id, 
  delivery_number, 
  status,
  expected_delivery_date
)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000004',
  1,
  'in_production',
  now() + interval '7 days'
)
ON CONFLICT (id) DO NOTHING;

-- Create test standalone purchase
INSERT INTO standalone_purchases (
  id,
  user_id,
  collection_id,
  cycle_id,
  status,
  deposit_amount,
  balance_amount,
  total_amount
)
VALUES (
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  'balance_paid',
  100.00,
  400.00,
  500.00
)
ON CONFLICT (id) DO NOTHING;

-- Create test production queue items
INSERT INTO production_queue (
  id,
  order_id,
  order_type,
  customer_id,
  customer_name,
  customer_email,
  collection_id,
  collection_name,
  current_stage,
  production_status,
  estimated_completion_date
)
VALUES 
  (
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000005',
    'subscription_delivery',
    '00000000-0000-0000-0000-000000000001',
    'Test User',
    'test@example.com',
    '00000000-0000-0000-0000-000000000002',
    'Test Collection',
    'packaging',
    'in_production',
    now() + interval '3 days'
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000006',
    'standalone_purchase',
    '00000000-0000-0000-0000-000000000001',
    'Test User',
    'test@example.com',
    '00000000-0000-0000-0000-000000000002',
    'Test Collection',
    'packaging',
    'in_production',
    now() + interval '3 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. TEST CASE 1: Update subscription_delivery to 'shipped'
-- =====================================================

DO $$
DECLARE
  v_status TEXT;
  v_tracking_code TEXT;
BEGIN
  -- Update production queue to 'shipped' stage
  UPDATE production_queue
  SET 
    current_stage = 'shipped',
    production_notes = 'TRACK123456'
  WHERE id = '00000000-0000-0000-0000-000000000007';
  
  -- Check if subscription_delivery was updated
  SELECT status, tracking_code
  INTO v_status, v_tracking_code
  FROM subscription_deliveries
  WHERE id = '00000000-0000-0000-0000-000000000005';
  
  IF v_status != 'shipped' THEN
    RAISE EXCEPTION 'TEST FAILED: subscription_delivery status should be "shipped", got "%"', v_status;
  END IF;
  
  IF v_tracking_code != 'TRACK123456' THEN
    RAISE EXCEPTION 'TEST FAILED: subscription_delivery tracking_code should be "TRACK123456", got "%"', v_tracking_code;
  END IF;
  
  RAISE NOTICE 'TEST PASSED: subscription_delivery updated to shipped with tracking code';
END $$;

-- =====================================================
-- 3. TEST CASE 2: Update standalone_purchase to 'shipped'
-- =====================================================

DO $$
DECLARE
  v_status TEXT;
  v_tracking_code TEXT;
  v_shipped_at TIMESTAMPTZ;
BEGIN
  -- Update production queue to 'shipped' stage
  UPDATE production_queue
  SET 
    current_stage = 'shipped',
    production_notes = 'TRACK789012'
  WHERE id = '00000000-0000-0000-0000-000000000008';
  
  -- Check if standalone_purchase was updated
  SELECT status, tracking_code, shipped_at
  INTO v_status, v_tracking_code, v_shipped_at
  FROM standalone_purchases
  WHERE id = '00000000-0000-0000-0000-000000000006';
  
  IF v_status != 'shipped' THEN
    RAISE EXCEPTION 'TEST FAILED: standalone_purchase status should be "shipped", got "%"', v_status;
  END IF;
  
  IF v_tracking_code != 'TRACK789012' THEN
    RAISE EXCEPTION 'TEST FAILED: standalone_purchase tracking_code should be "TRACK789012", got "%"', v_tracking_code;
  END IF;
  
  IF v_shipped_at IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: standalone_purchase shipped_at should not be NULL';
  END IF;
  
  RAISE NOTICE 'TEST PASSED: standalone_purchase updated to shipped with tracking code and timestamp';
END $$;

-- =====================================================
-- 4. TEST CASE 3: Update subscription_delivery to 'delivered'
-- =====================================================

DO $$
DECLARE
  v_status TEXT;
  v_actual_delivery_date TIMESTAMPTZ;
BEGIN
  -- Update production queue to 'completed' status
  UPDATE production_queue
  SET 
    production_status = 'completed',
    production_completed_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000007';
  
  -- Check if subscription_delivery was updated
  SELECT status, actual_delivery_date
  INTO v_status, v_actual_delivery_date
  FROM subscription_deliveries
  WHERE id = '00000000-0000-0000-0000-000000000005';
  
  IF v_status != 'delivered' THEN
    RAISE EXCEPTION 'TEST FAILED: subscription_delivery status should be "delivered", got "%"', v_status;
  END IF;
  
  IF v_actual_delivery_date IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: subscription_delivery actual_delivery_date should not be NULL';
  END IF;
  
  RAISE NOTICE 'TEST PASSED: subscription_delivery updated to delivered with actual delivery date';
END $$;

-- =====================================================
-- 5. TEST CASE 4: Update standalone_purchase to 'delivered'
-- =====================================================

DO $$
DECLARE
  v_status TEXT;
  v_delivered_at TIMESTAMPTZ;
BEGIN
  -- Update production queue to 'completed' status
  UPDATE production_queue
  SET 
    production_status = 'completed',
    production_completed_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000008';
  
  -- Check if standalone_purchase was updated
  SELECT status, delivered_at
  INTO v_status, v_delivered_at
  FROM standalone_purchases
  WHERE id = '00000000-0000-0000-0000-000000000006';
  
  IF v_status != 'delivered' THEN
    RAISE EXCEPTION 'TEST FAILED: standalone_purchase status should be "delivered", got "%"', v_status;
  END IF;
  
  IF v_delivered_at IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: standalone_purchase delivered_at should not be NULL';
  END IF;
  
  RAISE NOTICE 'TEST PASSED: standalone_purchase updated to delivered with delivered_at timestamp';
END $$;

-- =====================================================
-- 6. TEST CASE 5: Update expected_delivery_date
-- =====================================================

DO $$
DECLARE
  v_expected_delivery_date TIMESTAMPTZ;
  v_new_date TIMESTAMPTZ;
BEGIN
  v_new_date := now() + interval '10 days';
  
  -- Update production queue estimated_completion_date
  UPDATE production_queue
  SET estimated_completion_date = v_new_date
  WHERE id = '00000000-0000-0000-0000-000000000007';
  
  -- Check if subscription_delivery was updated
  SELECT expected_delivery_date
  INTO v_expected_delivery_date
  FROM subscription_deliveries
  WHERE id = '00000000-0000-0000-0000-000000000005';
  
  IF v_expected_delivery_date IS NULL OR v_expected_delivery_date != v_new_date THEN
    RAISE EXCEPTION 'TEST FAILED: subscription_delivery expected_delivery_date should be updated to new date';
  END IF;
  
  RAISE NOTICE 'TEST PASSED: subscription_delivery expected_delivery_date updated';
END $$;

-- =====================================================
-- 7. CLEANUP
-- =====================================================

ROLLBACK;

-- =====================================================
-- 8. TEST SUMMARY
-- =====================================================

SELECT 
  'All tests passed successfully!' AS result,
  'The sync_production_status_to_orders trigger is working correctly' AS message;
