# Shared Utilities for Supabase Edge Functions

This directory contains shared utility modules used across multiple Supabase Edge Functions in the ORDAX platform.

## Available Utilities

### 1. `cron-logger.ts`
Cron job logging and alert notification utility.

**Functions:**
- `logCronStart(jobName, executionDetails?)`: Start logging a cron job execution
- `logCronSuccess(logId, executionDetails?)`: Mark execution as successful
- `logCronError(logId, error, executionDetails?)`: Mark execution as failed and send alerts

**Usage:**
```typescript
import { logCronStart, logCronSuccess, logCronError } from '../_shared/cron-logger.ts';

let logId: string | undefined;
try {
  logId = await logCronStart('my-job');
  // ... your logic
  await logCronSuccess(logId);
} catch (error) {
  if (logId) await logCronError(logId, error);
}
```

**See:** `cron-logger-example.ts` for comprehensive usage examples

### 2. `timezone.ts`
Timezone utilities for Bahia, Brazil (America/Bahia, UTC-3).

**Functions:**
- `toUTC(bahiaDate)`: Convert Bahia time to UTC for storage
- `toBahiaTime(utcDate)`: Convert UTC to Bahia time for display
- `nowInBahia()`: Get current time in Bahia timezone
- `isBeforeCutoff(currentBahiaTime)`: Check if before day 15 at 23:59:59
- `getCutoffDate(month, year)`: Get cutoff date for a month
- `addDays(date, days)`: Add days to a date
- `addMonths(date, months)`: Add months to a date

**Usage:**
```typescript
import { nowInBahia, isBeforeCutoff } from '../_shared/timezone.ts';

const now = nowInBahia();
if (isBeforeCutoff(now)) {
  // Allow changes
}
```

### 3. `supabase.ts`
Supabase client creation and authentication utilities.

**Functions:**
- `getClaims(req)`: Get JWT claims from request
- `getServiceClient()`: Get service role client (bypasses RLS)
- `assertAdmin(req)`: Verify user is admin

**Usage:**
```typescript
import { getServiceClient, assertAdmin } from '../_shared/supabase.ts';

// For admin-only endpoints
const { userId } = await assertAdmin(req);

// For system operations
const supabase = getServiceClient();
```

### 4. `cors.ts`
CORS headers for Edge Functions.

**Usage:**
```typescript
import { corsHeaders } from '../_shared/cors.ts';

return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

### 5. `ai.ts`, `ai-vision.ts`, `ai-vision-temp.ts`
AI and vision utilities (implementation details vary).

## Environment Variables

### Required for Most Functions
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `SUPABASE_ANON_KEY`: Anonymous key for client operations

### Required for Cron Logger Alerts
- `EMAIL_PROVIDER`: 'resend' or 'sendgrid' (default: 'resend')
- `EMAIL_API_KEY`: API key for email provider
- `EMAIL_FROM`: Sender email address (default: 'alerts@ordax.com.br')
- `EMAIL_FROM_NAME`: Sender name (default: 'ORDAX Alerts')

## Testing

### Unit Tests
Run tests with Deno:
```bash
deno test supabase/functions/_shared/*.test.ts --allow-env --allow-net
```

### Integration Tests
Test utilities in the context of actual Edge Functions.

## Best Practices

### 1. Error Handling
Always wrap utility calls in try-catch blocks:
```typescript
try {
  const result = await someUtility();
} catch (error) {
  console.error('Utility failed:', error);
  // Handle appropriately
}
```

### 2. Environment Variables
Check for required environment variables early:
```typescript
const apiKey = Deno.env.get('API_KEY');
if (!apiKey) {
  throw new Error('API_KEY not configured');
}
```

### 3. Logging
Use console.log/error for debugging:
```typescript
console.log('Starting operation:', { param1, param2 });
console.error('Operation failed:', error);
```

### 4. Type Safety
Import types from utilities when available:
```typescript
import type { SomeType } from '../_shared/utility.ts';
```

## Adding New Utilities

When adding a new shared utility:

1. Create the utility file in this directory
2. Export functions with clear JSDoc comments
3. Create a corresponding `.test.ts` file
4. Create an `.example.ts` file if complex
5. Update this README with usage information
6. Add to the "Available Utilities" section above

## File Naming Conventions

- `utility-name.ts`: Main utility implementation
- `utility-name.test.ts`: Unit tests
- `utility-name.example.ts`: Usage examples (optional)

## Dependencies

Utilities should minimize external dependencies. When needed:
- Use `npm:` prefix for npm packages (e.g., `npm:@supabase/supabase-js@2`)
- Use `https://deno.land/std@VERSION/` for Deno standard library
- Pin versions for stability

## Support

For questions or issues with shared utilities:
1. Check the utility's JSDoc comments
2. Review the `.example.ts` file if available
3. Check the `.test.ts` file for usage patterns
4. Consult the task documentation in `.kiro/specs/ordax-complete-system/`
