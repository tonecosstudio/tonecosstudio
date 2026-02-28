# Cycle Transition Cron Job

## Overview

This cron job automatically transitions cycles from 'open' to 'production' status when their open period ends, and creates new cycles for upcoming periods to ensure the system always has cycles ready.

## Schedule

Runs daily at **00:01 America/Bahia time**

## Functionality

### 1. Cycle Transition

- Finds all cycles with status 'open' where `open_end <= current_time`
- Transitions each cycle to 'production' status
- Sets `status_changed_at` timestamp to current Bahia time
- Logs all transitions

### 2. Cycle Creation

Creates new cycles for upcoming periods if they don't already exist:

- **Current month Cycle 2** (if current day <= 15)
- **Next month Cycle 1**
- **Next month Cycle 2**
- **Second next month Cycle 1**
- **Second next month Cycle 2**

This ensures the system always has at least 2 months of cycles prepared in advance.

## Cycle Dates Logic

### Cycle 1 (Days 1-15)
- **Open Period**: Day 1 00:00:00 to Day 15 23:59:59
- **Production Period**: Day 16 00:00:00 to Day 28 23:59:59 (approximate)
- **Shipping Date**: 5th business day of next month

### Cycle 2 (Days 16-End)
- **Open Period**: Day 16 00:00:00 to Last Day 23:59:59
- **Production Period**: 1st of next month to 14th of next month
- **Shipping Date**: 5th business day of second next month

## Requirements Validated

- **Requirement 2.3**: Transition cycle status from "open" to "production" when cutoff is reached
- **Requirement 2.7**: Record status transition timestamps in Bahia Time

## Response Format

### Success Response
```json
{
  "success": true,
  "cyclesTransitioned": 2,
  "transitionedCycles": [
    {
      "id": "uuid",
      "cycleNumber": 1,
      "month": 3,
      "year": 2026
    }
  ],
  "cyclesCreated": 3,
  "createdCycles": [
    {
      "cycleNumber": 1,
      "month": 4,
      "year": 2026
    }
  ],
  "currentDate": "2026-03-16T00:01:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Error Handling

- Individual cycle transition errors are logged but don't stop processing of other cycles
- Cycle creation errors are logged separately
- All errors are included in the response and logged to `cron_job_logs` table
- Critical failures trigger admin alert emails

## Testing

### Manual Invocation

You can manually trigger the cron job for testing:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/cron-transition-cycles \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Test Scenarios

1. **No cycles to transition**: Should complete successfully with 0 transitions
2. **Cycles ready to transition**: Should transition all eligible cycles
3. **Missing upcoming cycles**: Should create necessary cycles
4. **All cycles exist**: Should skip creation and report 0 created

## Logging

All executions are logged to the `cron_job_logs` table with:
- Job name: `cron-transition-cycles`
- Execution details including cycles transitioned and created
- Any errors encountered during processing

## Dependencies

- `@supabase/supabase-js@2`: Supabase client
- `../_shared/cron-logger.ts`: Logging utilities
- `../_shared/timezone.ts`: Bahia timezone utilities

## Related Files

- Migration: `supabase/migrations/20260301000000_create_premium_club_system.sql` (cycles table)
- Scheduler: `supabase/migrations/20260404000001_schedule_cycle_transition_cron.sql`
