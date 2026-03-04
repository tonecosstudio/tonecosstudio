-- Migration: Schedule Character Revelation Cron Job
-- Feature: ORDAX Complete System
-- Task: 14.2 Schedule character revelation cron job
-- Requirements: 12.2
-- Description: Schedules the character revelation cron job to run daily at 10:00 Bahia time

-- =====================================================
-- ORDAX COMPLETE SYSTEM - Schedule Character Revelation
-- =====================================================
-- This migration schedules the character revelation
-- cron job to run daily at 10:00 America/Bahia time.
--
-- The job calls the cron-reveal-characters Edge Function
-- which reveals characters for collections whose
-- revelation date has been reached and sends email
-- notifications to subscribers.
--
-- Requirements:
-- - 12.2: Execute cron job daily at 10:00 Bahia Time
-- =====================================================

-- =====================================================
-- STEP 1: Unschedule existing job (if any)
-- =====================================================

-- Remove any existing schedule for this job
-- This ensures clean re-deployment of the migration
DO $$
BEGIN
  PERFORM cron.unschedule('daily-character-revelation');
  RAISE NOTICE 'Unscheduled existing daily-character-revelation job (if any)';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available, skipping unschedule';
  WHEN OTHERS THEN
    -- Job doesn't exist, that's fine
    RAISE NOTICE 'No existing job to unschedule';
END $$;

-- =====================================================
-- STEP 2: Schedule the character revelation cron job
-- =====================================================

-- Schedule the job to run daily at 10:00 Bahia time
-- Cron expression: '0 10 * * *' means minute 0, hour 10 (10:00), every day
-- Since cron.timezone is set to 'America/Bahia', this runs at 10:00 Bahia time
-- which is 13:00 UTC (Bahia is UTC-3)

DO $$
BEGIN
  PERFORM cron.schedule(
    'daily-character-revelation',         -- Job name
    '0 10 * * *',                         -- Cron expression: 10:00 daily (Bahia time)
    $body$
    SELECT
      net.http_post(
        url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-reveal-characters',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $body$
  );
  
  RAISE NOTICE 'Successfully scheduled daily-character-revelation cron job at 10:00 Bahia time';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available. Please schedule manually or use Edge Function with cron trigger';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error scheduling job: %', SQLERRM;
END $$;

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler - includes daily-character-revelation job at 10:00 Bahia time';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- 
-- To verify the job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'daily-character-revelation';
--
-- To view job execution history:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-character-revelation')
-- ORDER BY start_time DESC LIMIT 10;
--
-- To manually trigger the job for testing:
-- SELECT cron.schedule('test-character-revelation-now', '* * * * *', $$
--   SELECT net.http_post(
--     url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-reveal-characters',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
--     body:='{}'::jsonb
--   ) as request_id;
-- $$);
-- -- Then unschedule after testing:
-- -- SELECT cron.unschedule('test-character-revelation-now');
--
-- To check ORDAX cron job logs:
-- SELECT * FROM cron_job_logs 
-- WHERE job_name = 'cron-reveal-characters'
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
-- - The job calls the cron-reveal-characters Edge Function
-- - The function checks for collections with character_revelation_date <= today
-- - For each collection, it updates revealed = true
-- - Sends email notifications to all subscribers who chose that collection
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
