# Auto-Sync Groups Setup Guide

This guide walks you through setting up the automatic group membership synchronization system.

## Overview

The auto-sync system runs every 15 minutes to automatically:
- Add new members to groups when they match membership criteria
- Remove members from groups when they no longer match criteria

**Important:** Removed members lose ALL access to the group, including message history.

## Prerequisites

1. Supabase project with Edge Functions enabled
2. Database migrations applied (chat_groups tables created)
3. Service role key (found in Supabase Dashboard → Settings → API)

## Step 1: Deploy the Edge Function

Deploy the auto-sync-groups Edge Function to your Supabase project:

```bash
# Navigate to your project root
cd /path/to/your/project

# Deploy the function
supabase functions deploy auto-sync-groups
```

Verify deployment:
```bash
supabase functions list
```

You should see `auto-sync-groups` in the list.

## Step 2: Test the Edge Function Manually

Before setting up the cron job, test the function manually:

```bash
curl -X POST \
  https://[YOUR-PROJECT-REF].supabase.co/functions/v1/auto-sync-groups \
  -H "Authorization: Bearer [YOUR-SERVICE-ROLE-KEY]" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "Auto-sync completed",
  "summary": {
    "groupsProcessed": 0,
    "totalAdded": 0,
    "totalRemoved": 0,
    "errors": 0
  },
  "results": []
}
```

## Step 3: Enable pg_cron Extension

Run the migration to enable pg_cron:

```bash
supabase migration up
```

Or manually in SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

Verify:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

## Step 4: Schedule the Cron Job

In Supabase SQL Editor, run the following (replace placeholders):

```sql
SELECT cron.schedule(
  'auto-sync-groups',           -- Job name
  '*/15 * * * *',               -- Every 15 minutes
  $$ 
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/auto-sync-groups',
    headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb
  ) AS request_id;
  $$
);
```

**Replace:**
- `[YOUR-PROJECT-REF]`: Your Supabase project reference (e.g., `abcdefghijklmnop`)
- `[YOUR-SERVICE-ROLE-KEY]`: Your service role key from Supabase Dashboard

**Security Note:** The service role key is stored in the database. Ensure your database has proper access controls.

## Step 5: Verify Cron Job is Scheduled

Check that the job was created:

```sql
SELECT * FROM cron.job WHERE jobname = 'auto-sync-groups';
```

Expected output:
```
jobid | schedule    | command                  | nodename  | nodeport | database | username | active | jobname
------+-------------+-------------------------+-----------+----------+----------+----------+--------+------------------
1     | */15 * * * *| SELECT net.http_post...  | localhost | 5432     | postgres | postgres | t      | auto-sync-groups
```

## Step 6: Monitor Job Execution

Wait 15 minutes for the first execution, then check the logs:

```sql
SELECT 
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-sync-groups')
ORDER BY start_time DESC 
LIMIT 10;
```

Successful execution should show:
- `status`: 'succeeded'
- `return_message`: Contains the HTTP response

## Step 7: Check Edge Function Logs

View detailed logs in Supabase Dashboard:

1. Go to Edge Functions → auto-sync-groups
2. Click "Logs" tab
3. Look for entries like:
   ```
   Starting auto-sync job...
   Found 3 automatic groups to sync
   Synced group "Assinantes Ativos": +2 members, -1 members
   Auto-sync completed: 5 members added, 2 members removed, 0 errors
   ```

## Troubleshooting

### Job not executing

**Check if job is scheduled:**
```sql
SELECT * FROM cron.job WHERE jobname = 'auto-sync-groups';
```

If not found, re-run Step 4.

**Check pg_cron is enabled:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

If not found, re-run Step 3.

### Job failing

**Check execution logs:**
```sql
SELECT return_message 
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-sync-groups')
ORDER BY start_time DESC 
LIMIT 1;
```

Common errors:
- **"Connection refused"**: Edge Function not deployed or URL incorrect
- **"Unauthorized"**: Service role key incorrect
- **"Function not found"**: Edge Function name incorrect or not deployed

### Members not syncing

**Manually trigger the function:**
```bash
curl -X POST \
  https://[YOUR-PROJECT-REF].supabase.co/functions/v1/auto-sync-groups \
  -H "Authorization: Bearer [YOUR-SERVICE-ROLE-KEY]" \
  -H "Content-Type: application/json"
```

Check the response for errors.

**Verify group criteria:**
```sql
SELECT id, name, type, membership_criteria 
FROM chat_groups 
WHERE deleted_at IS NULL AND type != 'manual';
```

**Check source data:**
```sql
-- For assinantes groups
SELECT user_id, status FROM subscriptions WHERE status = 'active';

-- For pedidos groups
SELECT user_id, status, created_at FROM orders;
```

## Adjusting Sync Interval

To change the sync frequency, unschedule and reschedule:

```sql
-- Unschedule existing job
SELECT cron.unschedule('auto-sync-groups');

-- Schedule with new interval (e.g., every 10 minutes)
SELECT cron.schedule(
  'auto-sync-groups',
  '*/10 * * * *',  -- Every 10 minutes
  $$ 
  SELECT net.http_post(
    url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/auto-sync-groups',
    headers := '{"Authorization": "Bearer [YOUR-SERVICE-ROLE-KEY]", "Content-Type": "application/json"}'::jsonb
  ) AS request_id;
  $$
);
```

## Disabling Auto-Sync

To temporarily disable auto-sync:

```sql
SELECT cron.unschedule('auto-sync-groups');
```

To re-enable, re-run Step 4.

## Monitoring Best Practices

1. **Set up alerts** for failed cron executions
2. **Monitor Edge Function logs** for errors
3. **Check member counts** periodically to ensure sync is working
4. **Review sync results** in the function response

## Security Considerations

1. **Service role key**: Stored in database, ensure proper access controls
2. **Edge Function**: Only accessible with valid authorization
3. **Cron job**: Runs with database user permissions
4. **Audit trail**: All member additions/removals are logged

## Related Documentation

- Edge Function: `supabase/functions/auto-sync-groups/README.md`
- Migration: `supabase/migrations/20260223000010_setup_auto_sync_cron.sql`
- Service: `src/lib/services/membershipService.ts`
- Design: `.kiro/specs/chat-groups-system/design.md`
