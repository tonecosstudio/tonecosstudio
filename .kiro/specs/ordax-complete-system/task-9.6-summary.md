# Task 9.6 Summary: Release Capacity on Standalone Purchase Cancellation

## Implementation Date
2026-03-28

## Requirements Addressed
- **Requirement 3.6**: WHEN a subscription is cancelled before Cycle_Cutoff, THE ORDAX_Platform SHALL release the reserved capacity
- **Requirement 4.7**: THE ORDAX_Platform SHALL release Production_Capacity for cancelled standalone purchases

## Changes Made

### 1. Added Cancellation Function to Standalone Purchase Service
**File**: `src/services/standalone-purchase-service.ts`

Added `cancelStandalonePurchase()` function with the following logic:

1. **Get Purchase**: Fetches the purchase record with id, cycle_id, and status
2. **Validate Status**: Checks if purchase is already cancelled
3. **Update Status**: Sets status to 'cancelled', adds cancelled_at timestamp and cancellation_reason
4. **Check Cutoff**: Uses `is_before_cutoff()` database function to verify if before day 15 23:59:59 Bahia time
5. **Release Capacity**: If before cutoff and purchase has cycle_id, calls `release_capacity` database function
6. **Error Handling**: Logs errors but doesn't fail the cancellation operation (best-effort approach)

#### Key Implementation Details:
- Only releases capacity if `is_before_cutoff()` returns true
- Skips capacity release if purchase has no `cycle_id` (graceful handling)
- Releases 1 unit of capacity per purchase
- Logs success/failure for each capacity release
- Cancellation succeeds even if capacity release fails

### 2. Created Comprehensive Tests
**File**: `src/services/standalone-purchase-service.test.ts`

Added 7 new test cases for cancellation:

1. ✅ Cancel purchase and release capacity when before cutoff
2. ✅ Do not release capacity when after cutoff
3. ✅ Handle purchase without cycle_id
4. ✅ Throw error if purchase not found
5. ✅ Throw error if purchase already cancelled
6. ✅ Handle capacity release errors gracefully
7. ✅ Include cancellation reason in update

All 17 tests pass successfully (10 existing + 7 new).

## Implementation Flow

```
Standalone Purchase Cancellation Request
         ↓
Get purchase record (id, cycle_id, status)
         ↓
Validate purchase exists and not already cancelled
         ↓
Update purchase status to 'cancelled'
         ↓
    ┌────────────────┐
    │ Has cycle_id?  │
    └────────────────┘
         ↓
    Yes  │  No
         ↓  └─→ End (no capacity to release)
Check if before cutoff (is_before_cutoff())
         ↓
    ┌────────────────┐
    │ Before Cutoff? │
    └────────────────┘
         ↓
    Yes  │  No
         ↓  └─→ Log "Cutoff passed" → End
Call release_capacity(cycle_id, 1)
         ↓
Log success or error
         ↓
Return success
```

## Cutoff Enforcement

The implementation correctly enforces the cutoff rule:
- **Before Day 15 23:59:59 Bahia Time**: Capacity is released
- **After Day 15 23:59:59 Bahia Time**: Capacity is NOT released (production has started)

This ensures that once production begins, capacity cannot be reclaimed even if a standalone purchase is cancelled.

## Error Handling Strategy

The implementation uses a **best-effort approach**:
- Errors in capacity release are logged but don't fail the cancellation
- This ensures customers can always cancel their purchase
- Admins can review logs to manually adjust capacity if needed

## Database Functions Used

1. **`is_before_cutoff()`**: Returns boolean indicating if current Bahia time is before cutoff
2. **`release_capacity(p_cycle_id, p_quantity)`**: Decrements cycle's capacity_current by quantity

## Testing Results

All 17 tests pass:
```
✓ Standalone Purchase Service (17 tests) 59ms
  ✓ createWithDeposit (4 tests)
  ✓ canCreateStandalonePurchase (4 tests)
  ✓ Cutoff Enforcement - Requirement 7.6 (2 tests)
  ✓ cancelStandalonePurchase (7 tests)

Test Files: 1 passed (1)
Tests: 17 passed (17)
Duration: 14.57s
```

## Verification Checklist

- [x] Capacity released for standalone purchases before cutoff
- [x] Capacity NOT released after cutoff
- [x] Purchases without cycle_id handled gracefully
- [x] Errors logged but don't fail cancellation
- [x] Each capacity release logged for audit trail
- [x] Database functions called correctly
- [x] Comprehensive tests created and passing
- [x] Requirements 3.6 and 4.7 fully satisfied

## Comparison with Subscription Cancellation (Task 9.5)

Both implementations follow the same pattern:
- Check if before cutoff
- Release capacity only if before cutoff
- Handle errors gracefully (best-effort)
- Log all operations for audit trail

**Key Differences:**
- Subscriptions: Release capacity for multiple future deliveries
- Standalone Purchases: Release capacity for single purchase
- Subscriptions: Query deliveries with status filter
- Standalone Purchases: Direct purchase record with cycle_id

## Notes

1. **Capacity Release Quantity**: Each standalone purchase releases exactly 1 unit of capacity
2. **Cycle Association**: Purchase must have a `cycle_id` to release capacity
3. **Timezone Awareness**: Cutoff check uses America/Bahia timezone (UTC-3)
4. **Idempotency**: If purchase is already cancelled, returns error without attempting capacity release again
5. **Cancellation Reason**: Optional reason parameter is stored in cancellation_reason field

## Future Considerations

1. **Admin Override**: Consider adding admin capability to manually release capacity for cancelled purchases after cutoff
2. **Capacity Audit**: Consider adding audit trail for capacity release operations
3. **Notification**: Consider notifying admins when capacity is released due to cancellation
4. **Metrics**: Consider tracking cancellation rates and capacity recovery metrics
5. **Refund Policy**: Consider implementing refund logic for cancelled purchases (deposit retention vs full refund)

## Related Tasks

- Task 9.1: Create capacity service ✅
- Task 9.5: Release capacity on subscription cancellation ✅
- Task 10.8: Implement deposit retention on non-payment (related)
- Task 26.x: Cancellation and refund policy (related)
