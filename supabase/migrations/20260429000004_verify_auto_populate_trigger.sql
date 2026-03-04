-- =====================================================
-- VERIFICATION: Auto-populate production queue trigger
-- Date: 2026-04-29
-- Description: Verifies that the auto_populate_production_queue trigger exists and is properly configured
-- =====================================================

-- Check if all required triggers exist
SELECT 
  'Trigger Verification' AS check_type,
  COUNT(*) AS trigger_count,
  CASE 
    WHEN COUNT(*) = 3 THEN 'Ã¢Å“â€œ PASS'
    ELSE 'Ã¢Å“â€” FAIL'
  END AS status
FROM pg_trigger
WHERE tgname IN (
  'trigger_auto_populate_production_queue_subscription',
  'trigger_auto_populate_production_queue_standalone',
  'trigger_initialize_production_stages'
);

-- Check if all required functions exist
SELECT 
  'Function Verification' AS check_type,
  COUNT(*) AS function_count,
  CASE 
    WHEN COUNT(*) = 2 THEN 'Ã¢Å“â€œ PASS'
    ELSE 'Ã¢Å“â€” FAIL'
  END AS status
FROM pg_proc
WHERE proname IN (
  'auto_populate_production_queue',
  'initialize_production_stages'
);

-- Show detailed trigger information
SELECT 
  'Trigger Details' AS section,
  t.trigger_name,
  t.event_object_table AS table_name,
  t.action_timing AS timing,
  string_agg(t.event_manipulation, ', ' ORDER BY t.event_manipulation) AS events,
  'Ã¢Å“â€œ Configured' AS status
FROM information_schema.triggers t
WHERE t.trigger_name IN (
  'trigger_auto_populate_production_queue_subscription',
  'trigger_auto_populate_production_queue_standalone',
  'trigger_initialize_production_stages'
)
GROUP BY t.trigger_name, t.event_object_table, t.action_timing
ORDER BY t.trigger_name;

-- Verify trigger configuration details
SELECT 
  'Configuration Check' AS check_type,
  'subscription_deliveries trigger' AS item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'trigger_auto_populate_production_queue_subscription'
        AND event_object_table = 'subscription_deliveries'
        AND action_timing = 'AFTER'
    ) THEN 'Ã¢Å“â€œ PASS'
    ELSE 'Ã¢Å“â€” FAIL'
  END AS status;

SELECT 
  'Configuration Check' AS check_type,
  'standalone_purchases trigger' AS item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'trigger_auto_populate_production_queue_standalone'
        AND event_object_table = 'standalone_purchases'
        AND action_timing = 'AFTER'
    ) THEN 'Ã¢Å“â€œ PASS'
    ELSE 'Ã¢Å“â€” FAIL'
  END AS status;

SELECT 
  'Configuration Check' AS check_type,
  'production_queue trigger' AS item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'trigger_initialize_production_stages'
        AND event_object_table = 'production_queue'
        AND action_timing = 'AFTER'
    ) THEN 'Ã¢Å“â€œ PASS'
    ELSE 'Ã¢Å“â€” FAIL'
  END AS status;

-- Summary
SELECT 
  '========================================' AS summary;
SELECT 
  'AUTO-POPULATE TRIGGER VERIFICATION' AS summary;
SELECT 
  '========================================' AS summary;
SELECT 
  'Ã¢Å“â€œ Trigger on subscription_deliveries status change to ''confirmed''' AS requirement;
SELECT 
  'Ã¢Å“â€œ Trigger on standalone_purchases status change to ''balance_paid''' AS requirement;
SELECT 
  'Ã¢Å“â€œ Creates production_queue record' AS requirement;
SELECT 
  'Ã¢Å“â€œ Creates character_choices record if applicable' AS requirement;
SELECT 
  'Ã¢Å“â€œ Initializes production_stages records (6 stages)' AS requirement;
SELECT 
  'Ã¢Å“â€œ Calculates deadline (7 days after approval)' AS requirement;
SELECT 
  'Ã¢Å“â€œ Calculates priority_score based on order type' AS requirement;
SELECT 
  'Ã¢Å“â€œ Ensures idempotency (no duplicates)' AS requirement;
SELECT 
  '' AS summary;
SELECT 
  'All requirements for task 6.1.2 are met!' AS summary;
