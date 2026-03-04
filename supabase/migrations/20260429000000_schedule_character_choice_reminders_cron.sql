-- Migration: Schedule Character Choice Reminders Cron Job
-- Feature: Production Management System
-- Task: 3.3.2 Create reminder job (runs daily)
-- Requirements: 2.2.4
-- Description: Schedules the character choice reminders cron job to run daily at 09:00 Bahia time

-- =====================================================
-- PRODUCTION MANAGEMENT SYSTEM - Schedule Character Choice Reminders
-- =====================================================
-- This migration schedules the character choice reminders
-- cron job to run daily at 09:00 America/Bahia time.
--
-- The job calls the cron-send-character-choice-reminders Edge Function
-- which sends reminder emails to customers who haven't chosen their
-- character yet, based on how many days remain until the deadline.
--
-- Requirements:
-- - 2.2.4: Deadline Management - Send reminders at 5, 2, and 1 day before deadline
-- =====================================================

-- =====================================================
-- STEP 1: Unschedule existing job (if any)
-- =====================================================

-- Remove any existing schedule for this job
-- This ensures clean re-deployment of the migration
DO $$
BEGIN
  PERFORM cron.unschedule('send-character-choice-reminders');
  RAISE NOTICE 'Unscheduled existing send-character-choice-reminders job (if any)';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available, skipping unschedule';
  WHEN OTHERS THEN
    -- Job doesn't exist, that's fine
    RAISE NOTICE 'No existing job to unschedule';
END $$;

-- =====================================================
-- STEP 2: Schedule the character choice reminders cron job
-- =====================================================

-- Schedule the job to run daily at 09:00 Bahia time
-- Cron expression: '0 9 * * *' means minute 0, hour 9 (09:00), every day
-- Since cron.timezone is set to 'America/Bahia', this runs at 09:00 Bahia time
-- which is 12:00 UTC (Bahia is UTC-3)

DO $$
BEGIN
  PERFORM cron.schedule(
    'send-character-choice-reminders',    -- Job name
    '0 9 * * *',                          -- Cron expression: 09:00 daily (Bahia time)
    $body$
    SELECT
      net.http_post(
        url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-send-character-choice-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $body$
  );
  
  RAISE NOTICE 'Successfully scheduled send-character-choice-reminders cron job at 09:00 Bahia time';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available. Please schedule manually or use Edge Function with cron trigger';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error scheduling job: %', SQLERRM;
END $$;

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler - includes send-character-choice-reminders job at 09:00 Bahia time';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- 
-- To verify the job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'send-character-choice-reminders';
--
-- To view job execution history:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-character-choice-reminders')
-- ORDER BY start_time DESC LIMIT 10;
--
-- To manually trigger the job for testing:
-- SELECT cron.schedule('test-reminders-now', '* * * * *', $$
--   SELECT net.http_post(
--     url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-send-character-choice-reminders',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
--     body:='{}'::jsonb
--   ) as request_id;
-- $$);
-- -- Then unschedule after testing:
-- -- SELECT cron.unschedule('test-reminders-now');
--
-- To check ORDAX cron job logs:
-- SELECT * FROM cron_job_logs 
-- WHERE job_name = 'cron-send-character-choice-reminders'
-- ORDER BY started_at DESC LIMIT 20;
--
-- To check pending character choices:
-- SELECT 
--   cc.id,
--   cc.order_id,
--   cc.order_type,
--   cc.deadline,
--   cc.reminders_sent,
--   cc.last_reminder_at,
--   EXTRACT(DAY FROM (cc.deadline - NOW())) as days_until_deadline,
--   p.email,
--   p.full_name,
--   c.name as collection_name
-- FROM character_choices cc
-- JOIN profiles p ON p.id = cc.user_id
-- JOIN collections c ON c.id = cc.collection_id
-- WHERE cc.status = 'pending'
-- ORDER BY cc.deadline ASC;
--
-- =====================================================

-- =====================================================
-- NOTES
-- =====================================================
--
-- Cron Expression Breakdown:
-- - '0 9 * * *' = minute 0, hour 9, any day, any month, any weekday
-- - This runs at 09:00 every day in America/Bahia timezone
--
-- Timezone Configuration:
-- - The database is configured with cron.timezone = 'America/Bahia'
-- - This was set in migration 20260402000000_setup_pg_cron_infrastructure.sql
-- - All cron jobs execute in Bahia time (UTC-3)
--
-- Edge Function:
-- - The job calls the cron-send-character-choice-reminders Edge Function
-- - The function checks for character choices with status 'pending'
-- - For choices with deadline in 5 days, it sends the first reminder
-- - For choices with deadline in 2 days, it sends the second reminder
-- - For choices with deadline in 1 day, it sends the final urgent reminder
-- - Each reminder updates the reminders_sent counter and last_reminder_at timestamp
--
-- Reminder Types:
-- 1. First Reminder (5 days before deadline):
--    - Friendly tone, blue color scheme
--    - Subject: "Escolha seu Personagem - [Collection Name]"
--    - Invites customer to make their choice
--
-- 2. Second Reminder (2 days before deadline):
--    - More urgent tone, orange color scheme
--    - Subject: "Ã¢ÂÂ° Lembrete: Escolha seu Personagem - [Collection Name]"
--    - Warns that deadline is approaching
--
-- 3. Final Reminder (1 day before deadline):
--    - Urgent tone, red color scheme
--    - Subject: "Ã°Å¸Å¡Â¨ URGENTE: ÃƒÅ¡ltimo Dia para Escolher - [Collection Name]"
--    - Explains that admin will assign character if not chosen
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
-- - Deadline is set to 7 days after order payment approval
-- - Reminders are sent at 5, 2, and 1 day before deadline
-- - After deadline expires, admin must manually assign character
-- - Customer can change choice up to 3 times before approval
--
-- =====================================================
