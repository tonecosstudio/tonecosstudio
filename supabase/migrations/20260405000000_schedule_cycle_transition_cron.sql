-- Migration: Schedule Cycle Transition Cron Job
-- Feature: ORDAX Complete System
-- Task: 15.2 Schedule cycle transition cron job
-- Requirements: 2.3
-- Description: Schedules the cycle transition cron job to run daily at 00:01 Bahia time

-- =====================================================
-- ORDAX COMPLETE SYSTEM - Schedule Cycle Transition
-- =====================================================
-- This migration schedules the cycle transition
-- cron job to run daily at 00:01 America/Bahia time.
--
-- The job calls the cron-transition-cycles Edge Function
-- which transitions cycles from 'open' to 'production'
-- status when their open period ends, and creates new
-- cycles for upcoming periods.
--
-- Requirements:
-- - 2.3: Transition cycle status from "open" to "production" when cutoff is reached
-- =====================================================

-- =====================================================
-- STEP 1: Unschedule existing job (if any)
-- =====================================================

-- Remove any existing schedule for this job
-- This ensures clean re-deployment of the migration
DO $$
BEGIN
  PERFORM cron.unschedule('daily-cycle-transition');
  RAISE NOTICE 'Unscheduled existing daily-cycle-transition job (if any)';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available, skipping unschedule';
  WHEN OTHERS THEN
    -- Job doesn't exist, that's fine
    RAISE NOTICE 'No existing job to unschedule';
END $$;

-- =====================================================
-- STEP 2: Schedule the cycle transition cron job
-- =====================================================

-- Schedule the job to run daily at 00:01 Bahia time
-- Cron expression: '1 0 * * *' means minute 1, hour 0 (00:01), every day
-- Since cron.timezone is set to 'America/Bahia', this runs at 00:01 Bahia time
-- which is 03:01 UTC (Bahia is UTC-3)

DO $$
BEGIN
  PERFORM cron.schedule(
    'daily-cycle-transition',             -- Job name
    '1 0 * * *',                          -- Cron expression: 00:01 daily (Bahia time)
    $body$
    SELECT
      net.http_post(
        url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-transition-cycles',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $body$
  );
  
  RAISE NOTICE 'Successfully scheduled daily-cycle-transition cron job at 00:01 Bahia time';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available. Please schedule manually or use Edge Function with cron trigger';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error scheduling job: %', SQLERRM;
END $$;

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler - includes daily-cycle-transition job at 00:01 Bahia time';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- 
-- To verify the job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'daily-cycle-transition';
--
-- To view job execution history:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-cycle-transition')
-- ORDER BY start_time DESC LIMIT 10;
--
-- To manually trigger the job for testing:
-- SELECT cron.schedule('test-cycle-transition-now', '* * * * *', $
--   SELECT net.http_post(
--     url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-transition-cycles',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
--     body:='{}'::jsonb
--   ) as request_id;
-- $);
-- -- Then unschedule after testing:
-- -- SELECT cron.unschedule('test-cycle-transition-now');
--
-- To check ORDAX cron job logs:
-- SELECT * FROM cron_job_logs 
-- WHERE job_name = 'cron-transition-cycles'
-- ORDER BY started_at DESC LIMIT 20;
--
-- =====================================================

-- =====================================================
-- NOTES
-- =====================================================
--
-- Cron Expression Breakdown:
-- - '1 0 * * *' = minute 1, hour 0, any day, any month, any weekday
-- - This runs at 00:01 every day in America/Bahia timezone
--
-- Timezone Configuration:
-- - The database is configured with cron.timezone = 'America/Bahia'
-- - This was set in migration 20260402000000_setup_pg_cron_infrastructure.sql
-- - All cron jobs execute in Bahia time (UTC-3)
--
-- Edge Function:
-- - The job calls the cron-transition-cycles Edge Function
-- - The function transitions cycles from 'open' to 'production' when open_end is reached
-- - It also creates new cycles for upcoming periods to ensure continuity
-- - Logs all transitions and cycle creations
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
-- =====================================================
