-- Check if sync trigger exists
SELECT 
  'Trigger Check' AS check_type,
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  CASE 
    WHEN tgname = 'trigger_sync_production_status_to_orders' THEN '✓ EXISTS'
    ELSE '✗ NOT FOUND'
  END AS status
FROM pg_trigger
WHERE tgname = 'trigger_sync_production_status_to_orders';

-- Check if function exists
SELECT 
  'Function Check' AS check_type,
  proname AS function_name,
  CASE 
    WHEN proname = 'sync_production_status_to_orders' THEN '✓ EXISTS'
    ELSE '✗ NOT FOUND'
  END AS status
FROM pg_proc
WHERE proname = 'sync_production_status_to_orders';
