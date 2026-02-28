# Cron Job: Balance Deadline Checker

## Overview

This cron job runs daily at 10:00 Bahia Time to check standalone purchase balance payment deadlines and take appropriate actions.

## Requirements

- **4.6**: Cancel order and retain deposit if balance not paid by deadline
- **17.7**: Send balance payment reminder when production complete
- **17.8**: Send urgent payment reminder 1 day before deadline

## Actions Performed

### 1. Cancel Overdue Purchases

- Finds standalone purchases with status `awaiting_balance` AND `balance_due_date < today`
- For each overdue purchase:
  - Calls `cancel-standalone-for-non-payment` Edge Function
  - Updates status to `cancelled`
  - Sets cancellation reason: "Balance payment not received within deadline (Arras Confirmatórias)"
  - Releases production capacity
  - Sends cancellation notice email to customer

### 2. Send Urgent Reminders

- Finds standalone purchases with status `awaiting_balance` AND `balance_due_date = tomorrow`
- For each purchase due tomorrow:
  - Sends urgent reminder email to customer
  - Email includes:
    - Collection name
    - Balance amount
    - Due date
    - Warning about deposit retention
    - Payment link

## Schedule

- **Frequency**: Daily
- **Time**: 10:00 AM America/Bahia (UTC-3)
- **Cron Expression**: `0 10 * * *`

## Email Templates

### Urgent Balance Reminder

Sent 1 day before deadline:
- Subject: "⚠️ URGENTE: Pagamento do Saldo Vence Amanhã - [Collection Name]"
- Content: Warning about deadline, balance amount, payment link
- Tone: Urgent but professional

### Cancellation Notice

Sent when purchase is cancelled:
- Subject: "Pedido Cancelado - [Collection Name]"
- Content: Explanation of cancellation, deposit retention policy
- Tone: Professional and informative

## Logging

All actions are logged to the `cron_job_logs` table:
- Job name: `cron-check-balance-deadlines`
- Execution details include:
  - Number of purchases cancelled
  - Number of reminders sent
  - Count of overdue purchases
  - Count of purchases due tomorrow
  - Any errors encountered

## Error Handling

- Individual purchase processing errors are logged but don't stop the job
- Failed email sends are logged but don't fail the cancellation/reminder
- Capacity release errors are logged but don't fail the cancellation
- Overall job failure sends alert email to admins

## Testing

To test this function locally:

```bash
# Run the function
supabase functions serve cron-check-balance-deadlines

# Invoke it
curl -X POST http://localhost:54321/functions/v1/cron-check-balance-deadlines \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Deployment

Deploy to Supabase:

```bash
supabase functions deploy cron-check-balance-deadlines
```

Schedule the cron job (see migration file for SQL):

```sql
SELECT cron.schedule(
  'check-balance-deadlines',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/cron-check-balance-deadlines',
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
- `cancel-standalone-for-non-payment`: Edge function for cancellation

## Environment Variables

Required:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `EMAIL_PROVIDER`: Email provider (resend or sendgrid)
- `EMAIL_API_KEY`: API key for email provider
- `EMAIL_FROM`: Sender email address
- `EMAIL_FROM_NAME`: Sender name
- `FRONTEND_URL`: Frontend URL for payment links

## Related Files

- `supabase/functions/cancel-standalone-for-non-payment/index.ts`: Cancellation handler
- `src/services/standalone-purchase-service.ts`: Frontend service
- `supabase/migrations/YYYYMMDD_schedule_balance_deadline_cron.sql`: Cron schedule migration
