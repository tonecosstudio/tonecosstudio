-- =====================================================
-- AUTO-SYNC GROUPS - Quick Reference SQL Queries
-- =====================================================
-- Common queries for managing and monitoring the auto-sync system
-- Feature: chat-groups-system
-- Task: 9.1, 9.2
-- =====================================================

-- =====================================================
-- SETUP QUERIES
-- =====================================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule auto-sync job (REPLACE PLACEHOLDERS!)
SELECT cron.schedule(
  'auto-sync-groups',
  '*/15 * * * *',
  $$ 
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/auto-sync-groups',
    headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb
  ) AS request_id;
  $$
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- List all cron jobs
SELECT * FROM cron.job;

-- Check if auto-sync job is scheduled
SELECT * FROM cron.job WHERE jobname = 'auto-sync-groups';

-- View recent job executions (last 10)
SELECT 
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time AS duration
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-sync-groups')
ORDER BY start_time DESC 
LIMIT 10;

-- View failed job executions
SELECT 
  runid,
  status,
  return_message,
  start_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-sync-groups')
  AND status != 'succeeded'
ORDER BY start_time DESC;

-- =====================================================
-- MONITORING QUERIES
-- =====================================================

-- List all automatic groups (groups that will be synced)
SELECT 
  id,
  name,
  type,
  membership_criteria,
  created_at
FROM chat_groups 
WHERE deleted_at IS NULL 
  AND type != 'manual'
ORDER BY created_at DESC;

-- Count members in each automatic group
SELECT 
  g.id,
  g.name,
  g.type,
  COUNT(m.user_id) AS member_count
FROM chat_groups g
LEFT JOIN chat_group_members m ON m.group_id = g.id
WHERE g.deleted_at IS NULL 
  AND g.type != 'manual'
GROUP BY g.id, g.name, g.type
ORDER BY member_count DESC;

-- View recent membership changes (requires audit table - optional)
-- Note: This query assumes you have an audit log table
-- If not, you can track changes by comparing member counts over time

-- Check active subscriptions (for assinantes groups)
SELECT 
  user_id,
  collection_id,
  plan,
  status,
  created_at
FROM subscriptions 
WHERE status = 'active'
ORDER BY created_at DESC;

-- Check recent orders (for pedidos groups)
SELECT 
  user_id,
  status,
  created_at
FROM orders 
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- =====================================================
-- MANAGEMENT QUERIES
-- =====================================================

-- Unschedule auto-sync job (disable)
SELECT cron.unschedule('auto-sync-groups');

-- Reschedule with different interval (e.g., every 10 minutes)
SELECT cron.unschedule('auto-sync-groups');
SELECT cron.schedule(
  'auto-sync-groups',
  '*/10 * * * *',
  $$ 
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/auto-sync-groups',
    headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb
  ) AS request_id;
  $$
);

-- Delete all cron job history (cleanup)
DELETE FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-sync-groups')
  AND start_time < NOW() - INTERVAL '7 days';

-- =====================================================
-- TESTING QUERIES
-- =====================================================

-- Manually test membership criteria for assinantes group
SELECT DISTINCT user_id 
FROM subscriptions 
WHERE status = 'active'
  -- Add optional filters as needed:
  -- AND collection_id = '[collection-uuid]'
  -- AND plan = 'premium'
;

-- Manually test membership criteria for coleção group
SELECT DISTINCT user_id 
FROM subscriptions 
WHERE collection_id = '[collection-uuid]'
  AND status = 'active';

-- Manually test membership criteria for lançamentos group (all users)
SELECT id AS user_id FROM profiles;

-- Manually test membership criteria for lançamentos group (previous buyers)
SELECT DISTINCT user_id 
FROM orders 
WHERE status = 'completed';

-- Manually test membership criteria for pedidos group
SELECT DISTINCT user_id 
FROM orders 
WHERE status IN ('pending', 'processing')  -- Replace with desired statuses
  -- Add optional date filters:
  -- AND created_at >= '2024-01-01'
  -- AND created_at <= '2024-12-31'
;

-- Compare expected vs actual members for a group
WITH expected_members AS (
  -- Replace this query with the appropriate criteria query from above
  SELECT DISTINCT user_id FROM subscriptions WHERE status = 'active'
),
actual_members AS (
  SELECT user_id FROM chat_group_members WHERE group_id = '[group-uuid]'
)
SELECT 
  'Missing' AS status,
  user_id
FROM expected_members
WHERE user_id NOT IN (SELECT user_id FROM actual_members)
UNION ALL
SELECT 
  'Extra' AS status,
  user_id
FROM actual_members
WHERE user_id NOT IN (SELECT user_id FROM expected_members);

-- =====================================================
-- DEBUGGING QUERIES
-- =====================================================

-- Check if Edge Function is accessible (requires psql with http extension)
-- Note: This is a simplified check - actual testing should use curl
SELECT net.http_post(
  url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/auto-sync-groups',
  headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb
) AS response;

-- View last sync result from cron logs
SELECT 
  return_message::json->'summary' AS summary,
  start_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-sync-groups')
  AND status = 'succeeded'
ORDER BY start_time DESC 
LIMIT 1;

-- Check for groups with invalid membership criteria
SELECT 
  id,
  name,
  type,
  membership_criteria
FROM chat_groups 
WHERE deleted_at IS NULL 
  AND type != 'manual'
  AND (
    membership_criteria IS NULL
    OR NOT (membership_criteria ? 'type')
  );

-- =====================================================
-- PERFORMANCE QUERIES
-- =====================================================

-- Check average sync duration
SELECT 
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) AS avg_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (end_time - start_time))) AS min_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (end_time - start_time))) AS max_duration_seconds,
  COUNT(*) AS total_runs
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-sync-groups')
  AND status = 'succeeded'
  AND start_time >= NOW() - INTERVAL '7 days';

-- Check sync frequency (should be ~15 minutes)
SELECT 
  start_time,
  LAG(start_time) OVER (ORDER BY start_time) AS previous_start,
  start_time - LAG(start_time) OVER (ORDER BY start_time) AS interval
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-sync-groups')
ORDER BY start_time DESC 
LIMIT 10;

-- =====================================================
-- CLEANUP QUERIES
-- =====================================================

-- Remove old cron job history (keep last 30 days)
DELETE FROM cron.job_run_details 
WHERE start_time < NOW() - INTERVAL '30 days';

-- Remove orphaned group members (members in deleted groups)
DELETE FROM chat_group_members 
WHERE group_id IN (
  SELECT id FROM chat_groups WHERE deleted_at IS NOT NULL
);

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- Remember to replace placeholders:
-- - [YOUR-PROJECT-REF]: Your Supabase project reference
-- - [YOUR-SERVICE-ROLE-KEY]: Your service role key
-- - [group-uuid]: Specific group ID for testing
-- - [collection-uuid]: Specific collection ID for testing
--
-- For production use:
-- - Monitor cron job execution regularly
-- - Set up alerts for failed executions
-- - Review member counts periodically
-- - Keep cron history for at least 7-30 days
--
-- =====================================================
