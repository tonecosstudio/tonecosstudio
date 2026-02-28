# Cron Job: Automatic Delivery Creation

## Overview

This cron job runs daily at 00:01 Bahia Time to automatically create delivery records for active subscriptions scheduled for the current month.

## Requirements

- **10.1**: Execute cron job daily at 00:01 Bahia Time
- **10.2**: Identify all subscriptions with deliveries scheduled for current month
- **10.3**: Create delivery record with status 'pending_choice'
- **10.4**: Apply automatic maintenance if subscriber hasn't made collection choice
- **10.6**: Log all automatic delivery creation actions
- **10.7**: Send alert notification to administrator if cron job fails

## Functionality

### Execution Logic

1. **Check Current Day**: Only runs on day 1 of the month (Bahia time)
2. **Query Active Subscriptions**: Fetches all subscriptions with status 'active'
3. **Process Each Subscription**:
   - Checks if all deliveries have been created
   - Checks if a delivery for the current month already exists
   - Creates a new delivery record with status 'pending_choice'
   - Applies automatic maintenance for deliveries after the first one
4. **Logging**: Records all actions using the cron logger utility
5. **Error Handling**: Sends alert notifications to administrators on failure

### Automatic Maintenance

For deliveries after the first one, the function calls `activate_delivery_with_auto_maintenance` which:
- Copies the previous delivery's collection choice if it's still active in the current month
- Sets `auto_maintained = true` on the delivery
- Creates an audit trail record with reason 'automatic_maintenance'
- If the previous collection is not active, leaves the delivery in 'pending_choice' status

## Error Handling

The cron job implements comprehensive error handling to ensure reliability:

### Top-Level Error Handling
- Entire execution wrapped in try-catch
- Critical failures logged to `cron_job_logs` table
- Alert emails sent to all admin users on complete failure
- Detailed error information including stack traces

### Individual Subscription Error Handling
- Each subscription processed in isolated try-catch block
- Individual subscription failures logged to `cron_job_logs`
- Processing continues for remaining subscriptions if one fails
- Partial failure alert sent to admins with summary of failed subscriptions

### Error Logging Details
Individual subscription errors are logged with:
- Subscription ID and user ID
- Plan type (trimestral/semestral)
- Error message and stack trace
- Month and year context
- Timestamp in Bahia timezone

### Alert Notifications
Two types of alerts are sent to administrators:

1. **Complete Failure Alert** (🚨)
   - Sent when the entire cron job fails
   - Includes job name, start time, error message, and stack trace
   - Indicates critical system issue requiring immediate attention

2. **Partial Failure Alert** (⚠️)
   - Sent when some subscriptions fail but job completes
   - Includes count of successful vs failed subscriptions
   - Lists all failed subscription IDs with error messages
   - Allows admins to investigate and manually resolve issues

### Resilience Features
- Automatic maintenance errors don't fail delivery creation
- Email sending failures don't stop processing
- Individual subscription errors don't affect others
- Comprehensive logging for troubleshooting

## Scheduling

This function should be scheduled to run daily at 00:01 Bahia Time using pg_cron:

```sql
-- Schedule the cron job
SELECT cron.schedule(
  'daily-delivery-creation',
  '1 3 * * *',  -- 00:01 Bahia Time = 03:01 UTC (Bahia is UTC-3)
  $$
  SELECT
    net.http_post(
      url:='https://your-project.supabase.co/functions/v1/cron-create-deliveries',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

## Response Format

### Success Response

```json
{
  "success": true,
  "subscriptionsProcessed": 42,
  "deliveriesCreated": 35,
  "month": 3,
  "year": 2026
}
```

### Skipped Response (Not Day 1)

```json
{
  "success": true,
  "skipped": true,
  "message": "Not day 1 of month",
  "currentDay": 15
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message here"
}
```

## Testing

To manually trigger the cron job for testing:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/cron-create-deliveries \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Monitoring

- Check the `cron_job_logs` table for execution history
- Failed executions trigger email alerts to administrators
- Console logs provide detailed information about each subscription processed

## Dependencies

- `_shared/cron-logger.ts`: Logging and alerting utilities
- `_shared/timezone.ts`: Bahia timezone utilities
- Database function: `activate_delivery_with_auto_maintenance`

## Notes

- The function only creates deliveries on day 1 of the month
- It skips subscriptions that already have a delivery for the current month
- It handles errors gracefully and continues processing other subscriptions
- Expected delivery date is set to the 5th of the month (simplified - should be enhanced with business day calculation)
