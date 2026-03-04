-- Migration: Schedule Character Choice Expiration Cron Job
-- Feature: Production Management System
-- Task: 3.3.3 Create deadline expiration job (runs hourly)
-- Requirements: 2.2.4
-- Description: Schedules the character choice expiration cron job to run hourly

-- =====================================================
-- PRODUCTION MANAGEMENT SYSTEM - Schedule Character Choice Expiration
-- =====================================================
-- This migration schedules the character choice expiration
-- cron job to run hourly at minute 0 in America/Bahia time.
--
-- The job calls the cron-expire-character-choices Edge Function
-- which handles expired character choices by:
-- 1. Marking them as 'expired'
-- 2. Sending admin notifications
-- 3. Adding to urgent alerts
-- 4. Logging the expiration
--
-- Requirements:
-- - 2.2.4: Deadline Management - After deadline expires, admin is notified to manually assign character
-- =====================================================

-- =====================================================
-- STEP 1: Unschedule existing job (if any)
-- =====================================================

-- Remove any existing schedule for this job
-- This ensures clean re-deployment of the migration
DO $$
BEGIN
  PERFORM cron.unschedule('expire-character-choices');
  RAISE NOTICE 'Unscheduled existing expire-character-choices job (if any)';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available, skipping unschedule';
  WHEN OTHERS THEN
    -- Job doesn't exist, that's fine
    RAISE NOTICE 'No existing job to unschedule';
END $$;

-- =====================================================
-- STEP 2: Schedule the character choice expiration cron job
-- =====================================================

-- Schedule the job to run hourly at minute 0 in Bahia time
-- Cron expression: '0 * * * *' means minute 0, every hour, every day
-- Since cron.timezone is set to 'America/Bahia', this runs every hour Bahia time
-- which is UTC-3

DO $$
BEGIN
  PERFORM cron.schedule(
    'expire-character-choices',           -- Job name
    '0 * * * *',                          -- Cron expression: Every hour at minute 0 (Bahia time)
    $body$
    SELECT
      net.http_post(
        url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-expire-character-choices',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $body$
  );
  
  RAISE NOTICE 'Successfully scheduled expire-character-choices cron job to run hourly';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available. Please schedule manually or use Edge Function with cron trigger';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error scheduling job: %', SQLERRM;
END $$;

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler - includes expire-character-choices job running hourly';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- 
-- To verify the job is scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'expire-character-choices';
--
-- To view job execution history:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'expire-character-choices')
-- ORDER BY start_time DESC LIMIT 10;
--
-- To manually trigger the job for testing:
-- SELECT cron.schedule('test-expiration-now', '* * * * *', $$
--   SELECT net.http_post(
--     url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-expire-character-choices',
--     headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
--     body:='{}'::jsonb
--   ) as request_id;
-- $$);
-- -- Then unschedule after testing:
-- -- SELECT cron.unschedule('test-expiration-now');
--
-- To check ORDAX cron job logs:
-- SELECT * FROM cron_job_logs 
-- WHERE job_name = 'cron-expire-character-choices'
-- ORDER BY started_at DESC LIMIT 20;
--
-- To check expired character choices:
-- SELECT 
--   cc.id,
--   cc.order_id,
--   cc.order_type,
--   cc.deadline,
--   cc.status,
--   cc.updated_at as expired_at,
--   EXTRACT(EPOCH FROM (NOW() - cc.deadline)) / 86400 as days_expired,
--   p.email as customer_email,
--   p.full_name as customer_name,
--   c.name as collection_name
-- FROM character_choices cc
-- JOIN profiles p ON p.id = cc.user_id
-- JOIN collections c ON c.id = cc.collection_id
-- WHERE cc.status = 'expired'
-- ORDER BY cc.updated_at DESC;
--
-- To check production queue items with expired choices:
-- SELECT 
--   pq.id,
--   pq.order_id,
--   pq.order_type,
--   pq.internal_flags,
--   pq.production_status,
--   pq.customer_name,
--   pq.collection_name
-- FROM production_queue pq
-- WHERE 'choice_expired' = ANY(pq.internal_flags)
-- ORDER BY pq.updated_at DESC;
--
-- =====================================================

-- =====================================================
-- NOTES
-- =====================================================
--
-- Cron Expression Breakdown:
-- - '0 * * * *' = minute 0, every hour, any day, any month, any weekday
-- - This runs at the top of every hour in America/Bahia timezone
-- - Examples: 00:00, 01:00, 02:00, ..., 23:00 (Bahia time)
--
-- Timezone Configuration:
-- - The database is configured with cron.timezone = 'America/Bahia'
-- - This was set in migration 20260402000000_setup_pg_cron_infrastructure.sql
-- - All cron jobs execute in Bahia time (UTC-3)
--
-- Edge Function:
-- - The job calls the cron-expire-character-choices Edge Function
-- - The function checks for character choices with:
--   - status = 'pending'
--   - deadline < current time (Bahia timezone)
-- - For each expired choice:
--   1. Sends admin notification email
--   2. Updates choice status to 'expired'
--   3. Adds 'choice_expired' flag to production_queue.internal_flags
--   4. Logs the expiration to cron_job_logs
--
-- Admin Notification:
-- - Email sent to ADMIN_EMAIL environment variable
-- - Subject: "Ã¢Å¡Â Ã¯Â¸Â Escolha de Personagem Expirada - [Collection Name]"
-- - Includes customer details, order info, and action required
-- - Links to admin panel for manual character assignment
--
-- Urgent Alerts:
-- - The 'choice_expired' flag in production_queue.internal_flags
-- - Makes the item appear in dashboard urgent alerts
-- - Admin can filter dashboard to show only expired choices
-- - Flag is removed when admin manually assigns character
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
-- - Reminders are sent at 5, 2, and 1 day before deadline (separate job)
-- - After deadline expires, this job marks choice as 'expired'
-- - Admin must manually assign character to proceed with production
-- - Expired choices remain in system for audit purposes
--
-- Frequency Rationale:
-- - Hourly execution ensures timely admin notification
-- - Catches expirations within 1 hour of deadline passing
-- - More frequent than daily reminder job (which runs at 09:00)
-- - Balances responsiveness with system load
--
-- Error Handling:
-- - Individual choice processing errors don't stop the job
-- - Failed email sends are logged but don't fail status update
-- - Missing production queue items are logged as warnings
-- - Overall job failure sends alert email to admins
--
-- Testing:
-- - Create test choice with expired deadline
-- - Run job manually or wait for next hourly execution
-- - Verify status changed to 'expired'
-- - Verify admin received notification email
-- - Verify production_queue has 'choice_expired' flag
-- - Verify cron_job_logs has execution record
--
-- =====================================================
