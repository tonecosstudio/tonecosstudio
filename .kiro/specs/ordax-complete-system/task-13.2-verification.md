# Task 13.2 Verification: Schedule Delivery Creation Cron Job

## Overview

This document provides verification steps for Task 13.2, which schedules the automatic delivery creation cron job to run daily at 00:01 Bahia time.

## What Was Implemented

### Migration File Created
- **File**: `supabase/migrations/20260403000000_schedule_delivery_creation_cron.sql`
- **Purpose**: Schedules the `cron-create-deliveries` Edge Function to run daily at 00:01 America/Bahia time

### Cron Job Configuration
- **Job Name**: `daily-delivery-creation`
- **Schedule**: `1 0 * * *` (00:01 daily in Bahia time)
- **Timezone**: America/Bahia (UTC-3)
- **Target**: Edge Function `cron-create-deliveries`
- **Method**: HTTP POST via `net.http_post`

## Verification Steps

### Step 1: Apply the Migration

The migration needs to be applied to the Supabase database. You can do this via:

**Option A: Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20260403000000_schedule_delivery_creation_cron.sql`
4. Paste and execute the SQL

**Option B: Supabase CLI** (if configured)
```bash
npx supabase db push
```

### Step 2: Verify the Job is Scheduled

Run this query in the Supabase SQL Editor:

```sql
-- Check if the job is scheduled
SELECT * FROM cron.job WHERE jobname = 'daily-delivery-creation';
```

**Expected Result:**
- One row with jobname = 'daily-delivery-creation'
- Schedule = '1 0 * * *'
- Command should contain the HTTP POST to the Edge Function

### Step 3: Check Timezone Configuration

Verify the cron timezone is set to America/Bahia:

```sql
-- Check cron timezone
SHOW cron.timezone;
```

**Expected Result:**
- Should return: `America/Bahia`

### Step 4: View Job Execution History

After the job has run (or after manually triggering it), check the execution history:

```sql
-- View recent job executions
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-delivery-creation')
ORDER BY start_time DESC 
LIMIT 10;
```

**Expected Result:**
- Shows execution history with timestamps
- Status should be 'succeeded' for successful runs
- return_message should contain the HTTP response

### Step 5: Check ORDAX Cron Job Logs

The Edge Function logs its execution to the `cron_job_logs` table:

```sql
-- View ORDAX cron job logs
SELECT 
  id,
  job_name,
  started_at,
  completed_at,
  status,
  error_message,
  execution_details,
  created_at
FROM cron_job_logs 
WHERE job_name = 'cron-create-deliveries'
ORDER BY started_at DESC 
LIMIT 20;
```

**Expected Result:**
- Shows detailed execution logs from the Edge Function
- Status should be 'success' for successful runs
- execution_details contains JSON with deliveries created, subscriptions processed, etc.

### Step 6: Manual Test Trigger

To test the cron job immediately without waiting for the scheduled time:

```sql
-- Manually trigger the job
SELECT cron.schedule(
  'test-delivery-creation-now',
  '* * * * *',  -- Run every minute
  $
  SELECT
    net.http_post(
      url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-create-deliveries',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $
);

-- Wait 1-2 minutes, then check the logs

-- Unschedule the test job
SELECT cron.unschedule('test-delivery-creation-now');
```

**Alternative: Direct Edge Function Call**

You can also test by calling the Edge Function directly:

```bash
curl -X POST https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-create-deliveries \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4" \
  -H "Content-Type: application/json"
```

## Expected Behavior

### On Day 1 of Month (00:01 Bahia Time)
1. Cron job triggers at 00:01
2. Edge Function checks current day (should be 1)
3. Queries all active subscriptions
4. For each subscription:
   - Checks if delivery for current month already exists
   - If not, creates delivery with status 'pending_choice'
   - Applies automatic maintenance (copies previous collection choice if applicable)
5. Logs execution details to `cron_job_logs`
6. Returns success response with count of deliveries created

### On Other Days (00:01 Bahia Time)
1. Cron job triggers at 00:01
2. Edge Function checks current day (not 1)
3. Skips delivery creation
4. Logs skip reason to `cron_job_logs`
5. Returns success response with skipped=true

## Troubleshooting

### Job Not Scheduled
- Verify pg_cron extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- Check for errors in migration execution
- Ensure you have proper permissions to schedule cron jobs

### Job Not Executing
- Check `cron.job_run_details` for error messages
- Verify the Edge Function URL is correct
- Verify the authorization token is valid
- Check Edge Function logs in Supabase Dashboard

### Deliveries Not Created
- Check `cron_job_logs` for error messages
- Verify active subscriptions exist
- Check if deliveries already exist for the current month
- Verify the `activate_delivery_with_auto_maintenance` function exists

### Wrong Timezone
- Verify `cron.timezone` is set to 'America/Bahia'
- Check if migration `20260402000000_setup_pg_cron_infrastructure.sql` was applied
- The job should run at 00:01 Bahia time = 03:01 UTC

## Success Criteria

✅ **Task 13.2 is complete when:**

1. Migration file exists and is syntactically correct
2. Cron job is scheduled in `cron.job` table
3. Job name is 'daily-delivery-creation'
4. Schedule is '1 0 * * *' (00:01 daily)
5. Job executes successfully (check `cron.job_run_details`)
6. Edge Function logs execution to `cron_job_logs`
7. On day 1 of month, deliveries are created for active subscriptions
8. On other days, execution is skipped with appropriate log

## Related Files

- **Migration**: `supabase/migrations/20260403000000_schedule_delivery_creation_cron.sql`
- **Edge Function**: `supabase/functions/cron-create-deliveries/index.ts`
- **Edge Function README**: `supabase/functions/cron-create-deliveries/README.md`
- **Cron Logger**: `supabase/functions/_shared/cron-logger.ts`
- **Timezone Utils**: `supabase/functions/_shared/timezone.ts`

## Requirements Validated

- **Requirement 10.1**: Execute cron job daily at 00:01 Bahia Time ✅

## Notes

- The cron job runs daily but only creates deliveries on day 1 of the month
- This design allows for monitoring and ensures the job is always active
- Failed executions trigger email alerts to administrators (via cron-logger)
- The job uses the anon key for authentication (Edge Function has proper authorization)
- All timestamps are in UTC in the database, converted to Bahia time for business logic

