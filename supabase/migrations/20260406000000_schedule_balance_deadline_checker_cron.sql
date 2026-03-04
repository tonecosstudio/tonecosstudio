-- Migration: Schedule Balance Deadline Checker Cron Job
-- Feature: ORDAX Complete System
-- Task: 16.2 Schedule balance deadline checker cron job
-- Requirements: 4.6
-- Description: Schedules the balance deadline checker cron job to run daily at 10:00 Bahia time

-- =====================================================
-- ORDAX COMPLETE SYSTEM - Schedule Balance Deadline Checker
-- =====================================================
-- This migration schedules the balance deadline checker
-- cron job to run daily at 10:00 America/Bahia time.
--
-- The job calls the cron-check-balance-deadlines Edge Function
-- which checks for standalone purchases with overdue balance
-- payments and sends urgent reminders or cancels orders
-- that have exceeded the payment deadline.
--
-- Requirements:
-- - 4.6: Cancel order and retain deposit if balance not paid within deadline
-- =====================================================

-- =====================================================
-- STEP 1: Unschedule existing job (if any)
-- =====================================================

-- Remove any existing schedule for this job
-- This ensures clean re-deployment of the migration
DO $$
BEGIN
  PERFORM cron.unschedule('check-balance-deadlines');
  RAISE NOTICE 'Unscheduled existing check-balance-deadlines job (if any)';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available, skipping unschedule';
  WHEN OTHERS THEN
    -- Job doesn't exist, that's fine
    RAISE NOTICE 'No existing job to unschedule';
END $$;

-- =====================================================
-- STEP 2: Schedule the balance deadline checker cron job
-- =====================================================

-- Schedule the job to run daily at 10:00 Bahia time
-- Cron expression: '0 10 * * *' means minute 0, hour 10 (10:00), every day
-- Since cron.timezone is set to 'America/Bahia', this runs at 10:00 Bahia time
-- which is 13:00 UTC (Bahia is UTC-3)

DO $$
BEGIN
  PERFORM cron.schedule(
    'check-balance-deadlines',            -- Job name
    '0 10 * * *',                         -- Cron expression: 10:00 daily (Bahia time)
    $body$
    SELECT
      net.http_post(
        url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-check-balance-deadlines',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $body$
  );
  
  RAISE NOTICE 'Successfully scheduled check-balance-deadlines cron job at 10:00 Bahia time';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available. Please schedule manually or use Edge Function with cron trigger';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error scheduling job: %', SQLERRM;
END $$;

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler - includes check-balance-deadlines job at 10:00 Bahia time';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- 
-- To verify the job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'check-balance-deadlines';
--
-- To view job execution history:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-balance-deadlines')
-- ORDER BY start_time DESC LIMIT 10;
--
-- To manually trigger the job for testing:
-- SELECT cron.schedule('test-balance-deadlines-now', '* * * * *', $
--   SELECT net.http_post(
--     url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-check-balance-deadlines',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
--     body:='{}'::jsonb
--   ) as request_id;
-- $);
-- -- Then unschedule after testing:
-- -- SELECT cron.unschedule('test-balance-deadlines-now');
--
-- To check ORDAX cron job logs:
-- SELECT * FROM cron_job_logs 
-- WHERE job_name = 'cron-check-balance-deadlines'
-- ORDER BY started_at DESC LIMIT 20;
--
-- =====================================================

-- =====================================================
-- NOTES
-- =====================================================
--
-- Cron Expression Breakdown:
-- - '0 10 * * *' = minute 0, hour 10, any day, any month, any weekday
-- - This runs at 10:00 every day in America/Bahia timezone
--
-- Timezone Configuration:
-- - The database is configured with cron.timezone = 'America/Bahia'
-- - This was set in migration 20260402000000_setup_pg_cron_infrastructure.sql
-- - All cron jobs execute in Bahia time (UTC-3)
--
-- Edge Function:
-- - The job calls the cron-check-balance-deadlines Edge Function
-- - The function checks for standalone purchases with status 'awaiting_balance'
-- - For purchases where balance_due_date has passed, it:
--   1. Cancels the order
--   2. Retains the deposit as Arras ConfirmatÃƒÂ³rias
--   3. Releases production capacity
--   4. Sends cancellation notification to customer
-- - For purchases approaching deadline (1 day remaining), it sends urgent reminders
--
-- Authentication:
-- - Uses the anon key for authentication
-- - The Edge Function has proper authorization checks
--
-- Monitoring:
-- - Execution logs are stored in cron_job_logs table
-- - Failed executions trigger email alerts to administrators
-- - Check cron.job_run_details for pg_cron execution history
--
-- Business Logic:
-- - Deposit (R$100) is retained as Arras ConfirmatÃƒÂ³rias (non-refundable deposit)
-- - Balance payment deadline is 5 business days after production completion
-- - Urgent reminders sent 1 day before deadline
-- - Automatic cancellation on deadline expiration
--
-- =====================================================
