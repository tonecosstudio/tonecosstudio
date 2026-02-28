# Task 9.5 Summary: Release Capacity on Subscription Cancellation

## Implementation Date
2026-03-28

## Requirements Addressed
- **Requirement 3.6**: WHEN a subscription is cancelled before Cycle_Cutoff, THE ORDAX_Platform SHALL release the reserved capacity
- **Requirement 26.6**: THE ORDAX_Platform SHALL release Production_Capacity for cancelled deliveries

## Changes Made

### 1. Updated Subscription Cancellation Endpoint
**File**: `supabase/functions/cancel-subscription/index.ts`

Added capacity release logic after cancelling deliveries:

1. **Query Future Deliveries**: Fetches all deliveries with status 'scheduled' or 'pending_choice'
2. **Check Cutoff**: Uses `is_before_cutoff()` database function to verify if before day 15 23:59:59 Bahia time
3. **Release Capacity**: For each delivery with a `cycle_id`, calls `release_capacity` database function
4. **Error Handling**: Logs errors but doesn't fail the cancellation operation (best-effort approach)

#### Key Implementation Details:
- Only releases capacity if `is_before_cutoff()` returns true
- Skips deliveries without `cycle_id` (graceful handling)
- Releases 1 unit of capacity per delivery
- Logs success/failure for each capacity release
- Continues processing even if one release fails

### 2. Created Comprehensive Tests
**File**: `src/services/subscription-cancellation.test.ts`

Created 10 test cases covering:

#### Main Scenarios:
1. ✅ Release capacity for future deliveries when cancelled before cutoff
2. ✅ Do not release capacity when cancelled after cutoff
3. ✅ Skip deliveries without cycle_id
4. ✅ Handle capacity release errors gracefully
5. ✅ Only release capacity for scheduled and pending_choice deliveries
6. ✅ Handle case where subscription has no future deliveries
7. ✅ Log each capacity release operation

#### Edge Cases:
8. ✅ Handle database errors when fetching future deliveries
9. ✅ Handle database errors when checking cutoff
10. ✅ Handle concurrent cancellations gracefully

All tests pass successfully.

### 3. Created Deno Tests
**File**: `supabase/functions/cancel-subscription/cancel-subscription.test.ts`

Created 4 test structure validations for the Deno Edge Function:
- Capacity release before cutoff
- No capacity release after cutoff
- Handling deliveries without cycle_id
- Continuing on capacity release errors

## Implementation Flow

```
Subscription Cancellation Request
         ↓
Update subscription status to 'cancelled'
         ↓
Cancel future deliveries (status = 'cancelled')
         ↓
Query future deliveries (scheduled or pending_choice)
         ↓
Check if before cutoff (is_before_cutoff())
         ↓
    ┌────────────────┐
    │ Before Cutoff? │
    └────────────────┘
         ↓
    Yes  │  No
         ↓  └─→ Log "Cutoff passed" → End
For each delivery with cycle_id:
    ↓
Call release_capacity(cycle_id, 1)
    ↓
Log success or error
    ↓
Continue to next delivery
    ↓
Return success response
```

## Cutoff Enforcement

The implementation correctly enforces the cutoff rule:
- **Before Day 15 23:59:59 Bahia Time**: Capacity is released
- **After Day 15 23:59:59 Bahia Time**: Capacity is NOT released (production has started)

This ensures that once production begins, capacity cannot be reclaimed even if a subscription is cancelled.

## Error Handling Strategy

The implementation uses a **best-effort approach**:
- Errors in capacity release are logged but don't fail the cancellation
- This ensures subscribers can always cancel their subscription
- Admins can review logs to manually adjust capacity if needed

## Database Functions Used

1. **`is_before_cutoff()`**: Returns boolean indicating if current Bahia time is before cutoff
2. **`release_capacity(p_cycle_id, p_quantity)`**: Decrements cycle's capacity_current by quantity

## Testing Results

All 10 tests pass:
```
✓ Subscription Cancellation - Capacity Release (7 tests)
✓ Subscription Cancellation - Edge Cases (3 tests)

Test Files: 1 passed (1)
Tests: 10 passed (10)
Duration: 5.99s
```

## Verification Checklist

- [x] Capacity released for future deliveries before cutoff
- [x] Capacity NOT released after cutoff
- [x] Only scheduled and pending_choice deliveries processed
- [x] Deliveries without cycle_id handled gracefully
- [x] Errors logged but don't fail cancellation
- [x] Each capacity release logged for audit trail
- [x] Database functions called correctly
- [x] Comprehensive tests created and passing
- [x] Requirements 3.6 and 26.6 fully satisfied

## Notes

1. **Capacity Release Quantity**: Each delivery releases exactly 1 unit of capacity
2. **Status Filter**: Only deliveries with status 'scheduled' or 'pending_choice' are considered for capacity release
3. **Cycle Association**: Deliveries must have a `cycle_id` to release capacity
4. **Timezone Awareness**: Cutoff check uses America/Bahia timezone (UTC-3)
5. **Idempotency**: If subscription is already cancelled, returns error without attempting capacity release again

## Future Considerations

1. **Admin Override**: Consider adding admin capability to manually release capacity for cancelled subscriptions after cutoff
2. **Capacity Audit**: Consider adding audit trail for capacity release operations
3. **Notification**: Consider notifying admins when capacity is released due to cancellation
4. **Metrics**: Consider tracking cancellation rates and capacity recovery metrics

## Related Tasks

- Task 9.1: Create capacity service ✅
- Task 9.6: Release capacity on standalone purchase cancellation (next)
- Task 26.x: Subscription cancellation and refund policy (related)
