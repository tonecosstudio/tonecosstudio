-- Migration: Schedule Tracking Status Updater Cron Job
-- Feature: ORDAX Complete System
-- Task: 17.2 Schedule tracking status updater cron job
-- Requirements: 18.6
-- Description: Schedules the tracking status updater cron job to run daily at 14:00 Bahia time

-- =====================================================
-- ORDAX COMPLETE SYSTEM - Schedule Tracking Status Updater
-- =====================================================
-- This migration schedules the tracking status updater
-- cron job to run daily at 14:00 America/Bahia time.
--
-- The job calls the cron-update-tracking Edge Function
-- which polls shipping carrier APIs for tracking status
-- updates and automatically marks deliveries as delivered
-- when the carrier confirms delivery.
--
-- Requirements:
-- - 18.6: Poll carrier API daily for tracking status updates
-- =====================================================

-- =====================================================
-- STEP 1: Unschedule existing job (if any)
-- =====================================================

-- Remove any existing schedule for this job
-- This ensures clean re-deployment of the migration
DO $$
BEGIN
  PERFORM cron.unschedule('update-tracking');
  RAISE NOTICE 'Unscheduled existing update-tracking job (if any)';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available, skipping unschedule';
  WHEN OTHERS THEN
    -- Job doesn't exist, that's fine
    RAISE NOTICE 'No existing job to unschedule';
END $$;

-- =====================================================
-- STEP 2: Schedule the tracking status updater cron job
-- =====================================================

-- Schedule the job to run daily at 14:00 Bahia time
-- Cron expression: '0 14 * * *' means minute 0, hour 14 (14:00), every day
-- Since cron.timezone is set to 'America/Bahia', this runs at 14:00 Bahia time
-- which is 17:00 UTC (Bahia is UTC-3)

DO $$
BEGIN
  PERFORM cron.schedule(
    'update-tracking',                    -- Job name
    '0 14 * * *',                         -- Cron expression: 14:00 daily (Bahia time)
    $body$
    SELECT
      net.http_post(
        url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-update-tracking',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $body$
  );
  
  RAISE NOTICE 'Successfully scheduled update-tracking cron job at 14:00 Bahia time';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available. Please schedule manually or use Edge Function with cron trigger';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error scheduling job: %', SQLERRM;
END $$;

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler - includes update-tracking job at 14:00 Bahia time';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- 
-- To verify the job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'update-tracking';
--
-- To view job execution history:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'update-tracking')
-- ORDER BY start_time DESC LIMIT 10;
--
-- To manually trigger the job for testing:
-- SELECT cron.schedule('test-tracking-updater-now', '* * * * *', $
--   SELECT net.http_post(
--     url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-update-tracking',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
--     body:='{}'::jsonb
--   ) as request_id;
-- $);
-- -- Then unschedule after testing:
-- -- SELECT cron.unschedule('test-tracking-updater-now');
--
-- To check ORDAX cron job logs:
-- SELECT * FROM cron_job_logs 
-- WHERE job_name = 'cron-update-tracking'
-- ORDER BY started_at DESC LIMIT 20;
--
-- =====================================================

-- =====================================================
-- NOTES
-- =====================================================
--
-- Cron Expression Breakdown:
-- - '0 14 * * *' = minute 0, hour 14, any day, any month, any weekday
-- - This runs at 14:00 every day in America/Bahia timezone
--
-- Timezone Configuration:
-- - The database is configured with cron.timezone = 'America/Bahia'
-- - This was set in migration 20260402000000_setup_pg_cron_infrastructure.sql
-- - All cron jobs execute in Bahia time (UTC-3)
--
-- Edge Function:
-- - The job calls the cron-update-tracking Edge Function
-- - The function finds all deliveries with tracking_code AND status = 'shipped'
-- - For each delivery, it calls the shipping carrier API to get current status
-- - If the carrier reports the package as delivered, it:
--   1. Updates delivery status to 'delivered'
--   2. Sets actual_delivery_date to the delivery timestamp
--   3. Logs the status update
-- - Handles API errors gracefully and continues processing other deliveries
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
-- - Only checks deliveries with status 'shipped' to avoid unnecessary API calls
-- - Automatically updates delivery status when carrier confirms delivery
-- - Reduces manual work for administrators
-- - Provides real-time delivery status to customers
--
-- Scheduling Time:
-- - Runs at 14:00 (2:00 PM) Bahia time
-- - This is during business hours when carrier systems are most reliable
-- - Provides timely updates to customers during the afternoon
--
-- =====================================================
