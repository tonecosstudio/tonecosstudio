-- Test script for pg_cron infrastructure setup
-- This script verifies the migration was applied correctly

\echo '=== Testing pg_cron Infrastructure Setup ==='
\echo ''

-- Test 1: Check if pg_cron extension is enabled
\echo 'Test 1: Checking pg_cron extension...'
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ pg_cron extension is enabled'
    ELSE '✗ pg_cron extension is NOT enabled'
  END as result
FROM pg_extension 
WHERE extname = 'pg_cron';

\echo ''

-- Test 2: Check if cron_job_logs table exists
\echo 'Test 2: Checking cron_job_logs table...'
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ cron_job_logs table exists'
    ELSE '✗ cron_job_logs table does NOT exist'
  END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'cron_job_logs';

\echo ''

-- Test 3: Check table structure
\echo 'Test 3: Checking cron_job_logs columns...'
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'cron_job_logs'
ORDER BY ordinal_position;

\echo ''

-- Test 4: Check indexes
\echo 'Test 4: Checking indexes...'
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'cron_job_logs'
ORDER BY indexname;

\echo ''

-- Test 5: Check helper functions exist
\echo 'Test 5: Checking helper functions...'
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'start_cron_job_log',
  'complete_cron_job_log',
  'fail_cron_job_log',
  'cleanup_old_cron_logs'
)
ORDER BY routine_name;

\echo ''

-- Test 6: Test logging functions
\echo 'Test 6: Testing logging functions...'
DO $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Test start_cron_job_log
  v_log_id := start_cron_job_log('test-job', '{"test": true}'::jsonb);
  RAISE NOTICE '✓ start_cron_job_log created log with ID: %', v_log_id;
  
  -- Test complete_cron_job_log
  PERFORM complete_cron_job_log(v_log_id, '{"result": "success"}'::jsonb);
  RAISE NOTICE '✓ complete_cron_job_log marked job as success';
  
  -- Test fail_cron_job_log (create another log)
  v_log_id := start_cron_job_log('test-job-fail', '{"test": true}'::jsonb);
  PERFORM fail_cron_job_log(v_log_id, 'Test error message', '{"error": "test"}'::jsonb);
  RAISE NOTICE '✓ fail_cron_job_log marked job as failed';
  
  -- Clean up test logs
  DELETE FROM cron_job_logs WHERE job_name LIKE 'test-job%';
  RAISE NOTICE '✓ Test logs cleaned up';
END $$;

\echo ''
\echo '=== All Tests Completed ==='
