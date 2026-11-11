# Character Revelation Cron Job

> **Escopo e segurança (04/11/2026):** documentação técnica de módulo **comercial futuro**; não integra o MVP público somente leitura hospedado no Cloudflare Pages. Conteúdo histórico não autoriza deploy, acesso a Supabase, envio de e-mails, operações financeiras nem reutilização de domínios/credenciais da OrdaX. Validar código, identidade, configuração e autorização antes de ativar esta funcionalidade.


## Overview

This Supabase Edge Function runs daily at 10:00 AM (Bahia Time) to automatically reveal characters for collections whose revelation date has been reached.

## Requirements

Implements the following requirements:
- **12.1**: Store character revelation date and character details
- **12.2**: Execute cron job daily at 10:00 Bahia Time
- **12.3**: Update collection status to "revealed" when date is reached
- **12.4**: Send email notification to all subscribers who chose that collection

## Functionality

### What it does:

1. **Checks for collections to reveal**: Queries the `collections` table for entries where:
   - `revealed = false`
   - `character_revelation_date IS NOT NULL`
   - `character_revelation_date <= current Bahia time`

2. **Updates collection status**: For each collection found, sets `revealed = true`

3. **Finds subscribers**: Queries `subscription_deliveries` to find all subscribers who chose the revealed collection

4. **Sends revelation emails**: Sends a beautifully formatted email to each unique subscriber with:
   - Collection name
   - Character name
   - Character image (if available)
   - Link to view their deliveries

5. **Logs execution**: Records all actions in the `cron_job_logs` table

### Error Handling

- Continues processing other collections if one fails
- Logs individual collection errors
- Sends alert emails to admins on critical failures
- Gracefully handles missing email configuration

## Scheduling

The function is scheduled to run daily at 10:00 AM Bahia Time using pg_cron:

```sql
SELECT cron.schedule(
  'reveal-characters',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/cron-reveal-characters',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

## Environment Variables

Required environment variables:

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
- `EMAIL_PROVIDER`: Email service provider ('resend' or 'sendgrid')
- `EMAIL_API_KEY`: API key for the email provider
- `EMAIL_FROM`: explicit, authorized sender address. Shared email config throws if this value is absent.
- `EMAIL_FROM_NAME`: explicitly set the approved Tonecos sender name; the existing shared email code still has an obsolete OrdaX fallback and must be corrected before the commercial release.
- `FRONTEND_URL`: explicit authorized HTTPS commercial origin, required by getPublicBaseUrl; there is no valid OrdaX fallback.

## Testing

### Manual Testing

You can manually trigger the function for testing:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/cron-reveal-characters \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Test Data Setup

To test the revelation flow:

1. Create a test collection with a revelation date in the past:
```sql
UPDATE collections
SET 
  character_revelation_date = NOW() - INTERVAL '1 day',
  revealed = false,
  character_name = 'Test Character',
  character_image_url = 'https://example.com/character.jpg'
WHERE id = 'your-collection-id';
```

2. Create a test delivery with that collection:
```sql
INSERT INTO subscription_deliveries (subscription_id, collection_id, delivery_number, status)
VALUES ('your-subscription-id', 'your-collection-id', 1, 'confirmed');
```

3. Run the cron function manually and check:
   - Collection `revealed` field is now `true`
   - Email was sent to the subscriber
   - Entry created in `cron_job_logs` table

## Response Format

### Success Response

```json
{
  "success": true,
  "collectionsRevealed": 2,
  "subscribersNotified": 15,
  "currentDate": "2026-04-15"
}
```

### Success with Partial Failures

```json
{
  "success": true,
  "collectionsRevealed": 1,
  "subscribersNotified": 8,
  "errors": [
    {
      "collectionId": "uuid-here",
      "error": "Failed to send email: API error"
    }
  ],
  "currentDate": "2026-04-15"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Failed to fetch collections: connection timeout"
}
```

## Database Schema

### Collections Table Fields Used

- `id`: Collection UUID
- `name`: Collection name
- `character_revelation_date`: Scheduled revelation date (TIMESTAMPTZ)
- `revealed`: Boolean flag indicating if revealed
- `character_name`: Name of the character (nullable)
- `character_image_url`: URL to character image (nullable)

### Subscription Deliveries Table

- `id`: Delivery UUID
- `subscription_id`: Reference to subscription
- `collection_id`: Reference to chosen collection

### Profiles Table

- `email`: Subscriber email address
- `full_name`: Subscriber name

## Email Template

The revelation email includes:
- Personalized greeting with subscriber name
- Collection name
- Character name in a highlighted reveal box
- Character image (if available)
- Call-to-action button to view deliveries
- Branding must be reviewed and approved for Tonecos Studio before commercial deployment

## Monitoring

Check the `cron_job_logs` table for execution history:

```sql
SELECT 
  job_name,
  status,
  started_at,
  completed_at,
  execution_details,
  error_message
FROM cron_job_logs
WHERE job_name = 'cron-reveal-characters'
ORDER BY started_at DESC
LIMIT 10;
```

## Related Files

- `supabase/functions/_shared/cron-logger.ts`: Logging utility
- `supabase/functions/_shared/timezone.ts`: Timezone utilities
- `supabase/migrations/20260327110326_add_collection_rotation_fields.sql`: Database schema
