-- Quick verification script for pg_cron setup

-- Check if pg_cron extension exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    THEN 'PASS: pg_cron extension is enabled'
    ELSE 'FAIL: pg_cron extension is NOT enabled'
  END as extension_check;

-- Check if cron_job_logs table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'cron_job_logs'
    )
    THEN 'PASS: cron_job_logs table exists'
    ELSE 'FAIL: cron_job_logs table does NOT exist'
  END as table_check;

-- Check if helper functions exist
SELECT 
  CASE 
    WHEN COUNT(*) = 4
    THEN 'PASS: All 4 helper functions exist'
    ELSE 'FAIL: Missing helper functions (found ' || COUNT(*) || ' of 4)'
  END as functions_check
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'start_cron_job_log',
  'complete_cron_job_log',
  'fail_cron_job_log',
  'cleanup_old_cron_logs'
);
