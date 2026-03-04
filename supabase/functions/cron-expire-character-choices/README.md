# Cron Job: Character Choice Expiration Handler

## Overview

This cron job runs hourly to handle character choices with expired deadlines. When a customer fails to choose their character within the 7-day deadline, this job automatically marks the choice as expired and notifies administrators to manually assign a character.

## Requirements

- **2.2.4**: Deadline Management - After deadline expires, admin is notified to manually assign character

## Actions Performed

### 1. Query Expired Choices

- Finds character choices with:
  - Status = `pending`
  - Deadline < current time (Bahia timezone)

### 2. Send Admin Notification

For each expired choice:
- Sends email notification to admin
- Email includes:
  - Customer name and email
  - Collection name
  - Order ID and type
  - Deadline date
  - Days expired
  - Link to admin panel for manual assignment

### 3. Update Choice Status

- Updates `character_choices.status` to `expired`
- Updates `character_choices.updated_at` timestamp

### 4. Add to Urgent Alerts

- Finds corresponding `production_queue` item
- Adds `choice_expired` flag to `internal_flags` array
- This makes the item appear in the dashboard's urgent alerts

### 5. Log Expiration

- Logs all actions to `cron_job_logs` table
- Includes details of expired choices and any errors

## Schedule

- **Frequency**: Hourly
- **Time**: Every hour at minute 0 (America/Bahia timezone)
- **Cron Expression**: `0 * * * *`

## Email Template

### Admin Notification

- **Subject**: "⚠️ Escolha de Personagem Expirada - [Collection Name]"
- **Tone**: Alert/Action Required
- **Color scheme**: Red (critical)
- **Content**:
  - Customer details (name, email)
  - Order details (ID, type, collection)
  - Deadline information (date, days expired)
  - Action required explanation
  - Link to admin panel
  - Next steps checklist

## Logging

All actions are logged to the `cron_job_logs` table:
- Job name: `cron-expire-character-choices`
- Execution details include:
  - Total expired choices processed
  - Details of each expired choice (ID, order, customer, collection, days expired)
  - Any errors encountered
  - Execution timestamp

## Error Handling

- Individual choice processing errors are logged but don't stop the job
- Failed email sends are logged but don't fail the status update
- Missing production queue items are logged as warnings (not critical)
- Database update errors are logged and tracked
- Overall job failure sends alert email to admins

## Business Logic

### Deadline Calculation

- Deadline is set to 7 days after order payment approval
- Calculated in Bahia timezone (America/Bahia, UTC-3)

### Status Transitions

```
pending → expired (when deadline passes)
```

### Urgent Alerts

When a choice expires:
1. `choice_expired` flag is added to production_queue.internal_flags
2. Dashboard shows item in urgent alerts section
3. Admin can filter dashboard to show only expired choices
4. Admin must manually assign character to proceed with production

### After Manual Assignment

Once admin assigns a character:
1. Admin updates choice status to `approved`
2. `choice_expired` flag is removed from internal_flags
3. Production can proceed normally

## Testing

To test this function locally:

```bash
# Run the function
supabase functions serve cron-expire-character-choices

# Invoke it
curl -X POST http://localhost:54321/functions/v1/cron-expire-character-choices \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

To test with expired choices:

```sql
-- Create a test choice with expired deadline
INSERT INTO character_choices (
  user_id,
  order_id,
  order_type,
  collection_id,
  status,
  deadline,
  reminders_sent
) VALUES (
  'test-user-id',
  'test-order-id',
  'subscription_delivery',
  'test-collection-id',
  'pending',
  NOW() - INTERVAL '1 day', -- Expired 1 day ago
  3 -- All reminders sent
);

-- Run the cron job
-- Check that status changed to 'expired'
SELECT * FROM character_choices WHERE order_id = 'test-order-id';

-- Check that production_queue was updated
SELECT internal_flags FROM production_queue WHERE order_id = 'test-order-id';

-- Check cron logs
SELECT * FROM cron_job_logs 
WHERE job_name = 'cron-expire-character-choices'
ORDER BY started_at DESC LIMIT 1;
```

## Deployment

Deploy to Supabase:

```bash
supabase functions deploy cron-expire-character-choices
```

Schedule the cron job (see migration file for SQL):

```sql
SELECT cron.schedule(
  'expire-character-choices',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/cron-expire-character-choices',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);
```

## Dependencies

- `_shared/cron-logger.ts`: Logging utilities
- `_shared/timezone.ts`: Bahia timezone utilities

## Environment Variables

Required:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `EMAIL_PROVIDER`: Email provider (resend or sendgrid)
- `EMAIL_API_KEY`: API key for email provider
- `EMAIL_FROM`: Sender email address
- `EMAIL_FROM_NAME`: Sender name
- `ADMIN_EMAIL`: Admin email address for notifications
- `FRONTEND_URL`: Frontend URL for admin panel links

## Database Tables

### character_choices

Fields used:
- `id`: Choice ID
- `user_id`: Customer ID
- `order_id`: Order ID
- `order_type`: Order type (subscription_delivery or standalone_purchase)
- `collection_id`: Collection ID
- `status`: Choice status (pending → expired)
- `deadline`: Deadline for choice
- `updated_at`: Last update timestamp

### production_queue

Fields used:
- `id`: Queue item ID
- `order_id`: Order ID (for matching)
- `order_type`: Order type (for matching)
- `internal_flags`: Array of flags (adds 'choice_expired')
- `updated_at`: Last update timestamp

### profiles

Fields used:
- `id`: User ID
- `email`: User email (for admin notification)
- `full_name`: User name (for admin notification)

### collections

Fields used:
- `id`: Collection ID
- `name`: Collection name (for admin notification)

## Related Files

- `supabase/functions/cron-send-character-choice-reminders/`: Reminder job (runs daily)
- `supabase/migrations/20260428000001_create_character_choices.sql`: Table creation
- `src/services/admin/choice-service.ts`: Frontend service
- `.kiro/specs/production-management-system/requirements.md`: Requirements document
- `.kiro/specs/production-management-system/design.md`: Design document

## Workflow Integration

This job is part of the character choice deadline management workflow:

1. **Day 0**: Order approved → Deadline set to 7 days
2. **Day 2**: First reminder sent (5 days remaining)
3. **Day 5**: Second reminder sent (2 days remaining)
4. **Day 6**: Final reminder sent (1 day remaining)
5. **Day 7+**: **This job runs** → Choice marked as expired, admin notified
6. **Admin action**: Manually assigns character
7. **Production**: Continues with assigned character

## Monitoring

### Success Metrics

- Number of expired choices processed per hour
- Admin response time (time from expiration to manual assignment)
- Percentage of choices that expire (target: < 5%)

### Alerts

- Email sent to admin for each expired choice
- Dashboard urgent alerts show expired choices
- Cron job logs track all expirations

### Queries for Monitoring

```sql
-- Check recent expirations
SELECT 
  cc.id,
  cc.order_id,
  cc.deadline,
  cc.updated_at as expired_at,
  EXTRACT(EPOCH FROM (cc.updated_at - cc.deadline)) / 3600 as hours_expired,
  p.email as customer_email,
  c.name as collection_name
FROM character_choices cc
JOIN profiles p ON p.id = cc.user_id
JOIN collections c ON c.id = cc.collection_id
WHERE cc.status = 'expired'
ORDER BY cc.updated_at DESC
LIMIT 20;

-- Check expiration rate
SELECT 
  DATE(deadline) as deadline_date,
  COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
  COUNT(*) FILTER (WHERE status IN ('approved', 'locked')) as completed_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'expired') / COUNT(*), 2) as expiration_rate_pct
FROM character_choices
WHERE deadline >= NOW() - INTERVAL '30 days'
GROUP BY DATE(deadline)
ORDER BY deadline_date DESC;

-- Check admin response time
SELECT 
  AVG(EXTRACT(EPOCH FROM (approved_at - updated_at)) / 3600) as avg_hours_to_assign,
  MIN(EXTRACT(EPOCH FROM (approved_at - updated_at)) / 3600) as min_hours_to_assign,
  MAX(EXTRACT(EPOCH FROM (approved_at - updated_at)) / 3600) as max_hours_to_assign
FROM character_choices
WHERE status = 'approved' 
  AND updated_at > deadline -- Was expired before approval
  AND approved_at IS NOT NULL;
```

## Notes

- This job runs every hour to catch expirations quickly
- Multiple expirations can be processed in a single run
- Admin notifications are sent immediately upon expiration
- The `choice_expired` flag ensures visibility in the dashboard
- Expired choices remain in the system for audit purposes
- Admin can still approve an expired choice (it won't be processed again)
- The job is idempotent - running it multiple times on the same expired choice is safe
