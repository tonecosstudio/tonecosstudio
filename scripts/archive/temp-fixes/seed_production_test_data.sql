-- Seed test data for production system
-- This script creates sample data to test the production dashboard

-- First, check if we have any data
DO $$
DECLARE
  queue_count INTEGER;
  delivery_count INTEGER;
  purchase_count INTEGER;
BEGIN
  -- Check production_queue
  SELECT COUNT(*) INTO queue_count FROM production_queue;
  RAISE NOTICE 'Current production_queue rows: %', queue_count;
  
  -- Check subscription_deliveries
  SELECT COUNT(*) INTO delivery_count FROM subscription_deliveries;
  RAISE NOTICE 'Current subscription_deliveries rows: %', delivery_count;
  
  -- Check standalone_purchases
  SELECT COUNT(*) INTO purchase_count FROM standalone_purchases;
  RAISE NOTICE 'Current standalone_purchases rows: %', purchase_count;
  
  IF queue_count = 0 THEN
    RAISE NOTICE 'No data in production_queue - need to create test deliveries/purchases first';
  END IF;
END $$;

-- Note: The production_queue is populated automatically by triggers
-- when subscription_deliveries or standalone_purchases are created.
-- 
-- To test the dashboard, you need to:
-- 1. Create test subscriptions with deliveries
-- 2. Create test standalone purchases
-- 3. The auto_populate_production_queue trigger will populate production_queue
--
-- Example query to check if trigger exists:
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname LIKE '%auto_populate%';
