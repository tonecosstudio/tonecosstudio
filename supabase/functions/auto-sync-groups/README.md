# Auto-Sync Groups Edge Function

## Overview

This Edge Function automatically synchronizes group memberships based on membership criteria. It runs periodically (every 10-15 minutes) via pg_cron to ensure that automatic groups (assinantes, coleção, lançamentos, pedidos) have the correct members.

**Feature:** chat-groups-system  
**Task:** 9.1 Create auto-sync Edge Function  
**Requirements:** 17.1, 17.2, 17.3, 17.4, 17.5

## Functionality

### What it does

1. Fetches all active automatic groups (non-manual, non-deleted)
2. For each group, evaluates membership criteria
3. Adds new members who match the criteria
4. Removes members who no longer match the criteria
5. Returns a summary of changes

### Group Types Supported

- **assinantes**: Users with active subscriptions (optional filters: collection, plan)
- **coleção**: Users subscribed to a specific collection
- **lançamentos**: All users OR users with previous completed orders
- **pedidos**: Users with orders matching status and/or date range

### Important Behavior

**Removed members lose ALL access including history.** When a user no longer matches the criteria (e.g., subscription canceled), they are removed from the group and can no longer view any messages, including historical ones.

## Configuration

### Environment Variables

Required:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin access

### Cron Schedule

The function should be scheduled to run every 10-15 minutes using pg_cron:

```sql
SELECT cron.schedule(
  'auto-sync-groups',
  '*/15 * * * *',  -- Every 15 minutes
  $$ 
  SELECT net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/auto-sync-groups',
    headers := '{"Authorization": "Bearer [service-role-key]"}'::jsonb
  ) 
  $$
);
```

## API

### Endpoint

```
POST https://[project-ref].supabase.co/functions/v1/auto-sync-groups
```

### Authentication

Requires service role key in Authorization header:

```
Authorization: Bearer [service-role-key]
```

### Request

No request body required. The function automatically processes all active automatic groups.

### Response

Success (200):
```json
{
  "success": true,
  "message": "Auto-sync completed",
  "summary": {
    "groupsProcessed": 5,
    "totalAdded": 12,
    "totalRemoved": 3,
    "errors": 0
  },
  "results": [
    {
      "groupId": "uuid",
      "groupName": "Assinantes Ativos",
      "added": 5,
      "removed": 1,
      "error": null
    }
  ]
}
```

Error (500):
```json
{
  "success": false,
  "error": "Error message"
}
```

## Testing

### Manual Trigger

You can manually trigger the sync job for testing:

```bash
curl -X POST \
  https://[project-ref].supabase.co/functions/v1/auto-sync-groups \
  -H "Authorization: Bearer [service-role-key]" \
  -H "Content-Type: application/json"
```

### Test Scenarios

1. **Add new subscriber**: Create a subscription → wait for sync → verify user added to group
2. **Remove subscriber**: Cancel subscription → wait for sync → verify user removed from group
3. **Collection filter**: Create subscription with specific collection → verify user added to collection group
4. **Order filter**: Create order with specific status → verify user added to order group

## Logging

The function logs:
- Start of sync job
- Number of groups found
- Sync results for each group (members added/removed)
- Errors encountered
- Summary of total changes

View logs in Supabase Dashboard → Edge Functions → auto-sync-groups → Logs

## Error Handling

- If a group sync fails, the function continues with other groups
- Errors are logged and included in the response
- Failed member additions/removals are logged but don't stop the sync
- Database errors are caught and returned in the response

## Performance Considerations

- Processes groups sequentially (not in parallel) to avoid database contention
- Uses batch inserts/deletes for efficiency
- Skips manual groups automatically
- Typical execution time: 1-5 seconds for 10-20 groups

## Monitoring

Monitor the function's health by checking:
- Cron job execution logs
- Function invocation count (should match cron schedule)
- Error rate in function logs
- Member count changes in groups

## Troubleshooting

### Sync not running

1. Check pg_cron schedule is active
2. Verify service role key is correct
3. Check function deployment status

### Members not being added/removed

1. Check membership criteria in group definition
2. Verify source tables (subscriptions, orders, profiles) have correct data
3. Check function logs for errors
4. Manually trigger sync and inspect response

### Performance issues

1. Check number of groups being synced
2. Monitor database query performance
3. Consider increasing sync interval if needed
4. Check for large member lists causing slow queries

## Related Files

- Migration: `supabase/migrations/20260223000000_create_chat_groups.sql`
- Service: `src/lib/services/membershipService.ts`
- Types: `src/types/groups.ts`
- Design: `.kiro/specs/chat-groups-system/design.md`
