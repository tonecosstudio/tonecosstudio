# Cron Job: Character Choice Reminder Sender

## Overview

This cron job runs daily at 09:00 Bahia Time to send character choice reminders to customers who haven't yet chosen their character.

## Requirements

- **2.2.4**: Deadline Management - Automatically manage choice deadlines and send reminders
  - First reminder sent at 5 days before deadline
  - Second reminder sent at 2 days before deadline
  - Final reminder sent at 24 hours before deadline

## Actions Performed

### 1. First Reminder (5 days before deadline)

- Finds character choices with status `pending` AND deadline in 5 days
- For each choice:
  - Sends friendly reminder email to customer
  - Email includes:
    - Collection name
    - Deadline date
    - Days remaining (5)
    - Link to make choice
  - Updates `reminders_sent` counter
  - Updates `last_reminder_at` timestamp

### 2. Second Reminder (2 days before deadline)

- Finds character choices with status `pending` AND deadline in 2 days
- For each choice:
  - Sends more urgent reminder email to customer
  - Email includes:
    - Collection name
    - Deadline date
    - Days remaining (2)
    - Warning about approaching deadline
    - Link to make choice
  - Updates `reminders_sent` counter
  - Updates `last_reminder_at` timestamp

### 3. Final Reminder (1 day before deadline)

- Finds character choices with status `pending` AND deadline in 1 day
- For each choice:
  - Sends final urgent reminder email to customer
  - Email includes:
    - Collection name
    - Deadline date
    - Days remaining (1)
    - Strong warning about last day
    - Explanation that admin will assign character if not chosen
    - Link to make choice
  - Updates `reminders_sent` counter
  - Updates `last_reminder_at` timestamp

## Schedule

- **Frequency**: Daily
- **Time**: 09:00 AM America/Bahia (UTC-3)
- **Cron Expression**: `0 9 * * *`

## Email Templates

### First Reminder (5 days)

- Subject: "Escolha seu Personagem - [Collection Name]"
- Tone: Friendly and informative
- Color scheme: Blue (informational)
- Content: Invitation to choose character with deadline information

### Second Reminder (2 days)

- Subject: "⏰ Lembrete: Escolha seu Personagem - [Collection Name]"
- Tone: More urgent but still friendly
- Color scheme: Orange (warning)
- Content: Reminder that deadline is approaching

### Final Reminder (1 day)

- Subject: "🚨 URGENTE: Último Dia para Escolher - [Collection Name]"
- Tone: Urgent and clear
- Color scheme: Red (critical)
- Content: Final warning with explanation of consequences

## Logging

All actions are logged to the `cron_job_logs` table:
- Job name: `cron-send-character-choice-reminders`
- Execution details include:
  - Total reminders sent
  - Count per reminder type (first, second, final)
  - Any errors encountered
  - Execution timestamp

## Error Handling

- Individual choice processing errors are logged but don't stop the job
- Failed email sends are logged but don't fail the reminder update
- Database update errors are logged but don't fail the email send
- Overall job failure sends alert email to admins

## Testing

To test this function locally:

```bash
# Run the function
supabase functions serve cron-send-character-choice-reminders

# Invoke it
curl -X POST http://localhost:54321/functions/v1/cron-send-character-choice-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Deployment

Deploy to Supabase:

```bash
supabase functions deploy cron-send-character-choice-reminders
```

Schedule the cron job (see migration file for SQL):

```sql
SELECT cron.schedule(
  'send-character-choice-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/cron-send-character-choice-reminders',
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
- `FRONTEND_URL`: Frontend URL for choice links

## Database Tables

### character_choices

Fields used:
- `id`: Choice ID
- `user_id`: Customer ID
- `order_id`: Order ID
- `order_type`: Order type (subscription_delivery or standalone_purchase)
- `collection_id`: Collection ID
- `status`: Choice status (must be 'pending')
- `deadline`: Deadline for choice
- `reminders_sent`: Count of reminders sent
- `last_reminder_at`: Timestamp of last reminder

## Related Files

- `supabase/migrations/20260428000001_create_character_choices.sql`: Table creation
- `src/services/admin/choice-service.ts`: Frontend service
- `src/services/customer/choice-service.ts`: Customer service

## Notes

- Reminders are only sent for choices with status 'pending'
- The job checks for exact day matches (5, 2, or 1 day before deadline)
- Each reminder type has a distinct visual style and urgency level
- The `reminders_sent` counter is incremented regardless of which reminder type is sent
- Customers can receive multiple reminders as the deadline approaches
