# Task 8.5 Implementation: Apply Cutoff Rule to Standalone Purchases

## Overview

This task implements the cutoff rule enforcement for standalone purchases, ensuring that standalone purchases (single piece purchases without subscription) cannot be created after the cutoff deadline or when the cycle is not in "open" status.

**Requirement:** 7.6 - THE ORDAX_Platform SHALL apply Cycle_Cutoff rule to both subscription deliveries and standalone purchases

## Implementation Details

### 1. Standalone Purchase Service (`src/services/standalone-purchase-service.ts`)

Created a comprehensive service for managing standalone purchases with the following key functions:

#### `createWithDeposit(params)`
Creates a new standalone purchase with the following validations:
1. **Cutoff Check**: Verifies current time is before day 15 at 23:59:59 Bahia time
2. **Cycle Status Check**: Ensures cycle status is 'open' (not 'production', 'shipping', or 'completed')
3. **Capacity Check**: Verifies production capacity is available
4. **Amount Calculation**: Sets deposit to R$100.00 and calculates balance
5. **Capacity Reservation**: Reserves capacity for the cycle

**Error Handling:**
- Throws `CutoffPassedError` if cutoff has passed
- Throws error if cycle is not open
- Throws error if capacity exceeded
- Rolls back purchase creation if capacity reservation fails

#### `canCreateStandalonePurchase(cycleId)`
Non-throwing validation function that checks if a purchase can be created:
- Returns `{ canCreate: boolean, reason?: string }`
- Useful for UI conditional rendering
- Performs same validations as `createWithDeposit` but doesn't throw

#### `getUserStandalonePurchases(userId)`
Retrieves all standalone purchases for a user, ordered by creation date.

#### `getStandalonePurchase(purchaseId)`
Retrieves a single standalone purchase by ID.

### 2. Edge Function (`supabase/functions/create-standalone-purchase/index.ts`)

Created a Supabase Edge Function endpoint that:
1. Authenticates the user
2. Validates request parameters
3. Checks cutoff using `is_before_cutoff()` database function
4. Verifies cycle is open
5. Validates collection is active
6. Checks capacity availability
7. Creates purchase record
8. Reserves capacity

**HTTP Status Codes:**
- `201`: Purchase created successfully
- `400`: Invalid request (missing fields, inactive collection)
- `401`: Unauthorized (no valid auth token)
- `403`: Forbidden (cutoff passed, cycle not open)
- `404`: Not found (cycle or collection not found)
- `409`: Conflict (capacity exceeded)
- `500`: Internal server error

**Response Format:**
```json
{
  "success": true,
  "purchase": { /* purchase object */ },
  "message": "Standalone purchase created successfully"
}
```

**Error Response Format:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Error Codes:**
- `CUTOFF_PASSED`: Cutoff deadline has passed
- `CYCLE_NOT_OPEN`: Cycle is not in open status
- `CYCLE_NOT_FOUND`: Cycle ID not found
- `COLLECTION_NOT_FOUND`: Collection ID not found
- `COLLECTION_INACTIVE`: Collection is not active
- `CAPACITY_EXCEEDED`: Production capacity limit reached
- `INTERNAL_ERROR`: Server error

### 3. UI Component (`src/components/StandalonePurchaseButton.tsx`)

Created a React component that:
1. Checks purchase availability on mount
2. Displays countdown timer until cutoff
3. Shows appropriate error messages when purchase not allowed
4. Disables button when:
   - Cutoff has passed
   - Cycle is not open
   - Capacity is exceeded
   - Component is explicitly disabled

**User Messages:**
- **Cutoff passed**: "The cutoff deadline has passed. Production has started for this cycle. Please wait for the next cycle to make a purchase."
- **Cycle not open**: "Only open cycles accept new standalone purchases."
- **Capacity exceeded**: "The production capacity for this cycle has been reached. Please check back next cycle."

### 4. Tests (`src/services/standalone-purchase-service.test.ts`)

Comprehensive test suite with 10 tests covering:

#### `createWithDeposit` Tests:
1. ✅ Should reject purchase if cutoff has passed
2. ✅ Should reject purchase if cycle is not open
3. ✅ Should reject purchase if capacity is exceeded
4. ✅ Should create purchase successfully when all validations pass

#### `canCreateStandalonePurchase` Tests:
5. ✅ Should return false if cutoff has passed
6. ✅ Should return false if cycle is not open
7. ✅ Should return false if capacity is exceeded
8. ✅ Should return true when all validations pass

#### Cutoff Enforcement Tests (Requirement 7.6):
9. ✅ Should apply cutoff rule to standalone purchases
10. ✅ Should check both cutoff and cycle status

**All tests pass successfully.**

## Validation Logic

The implementation enforces the cutoff rule through multiple layers:

### Layer 1: Database Function
- `is_before_cutoff()` function checks current Bahia time against day 15 at 23:59:59
- Returns boolean result
- Used by both service and edge function

### Layer 2: Service Layer
- `validateBeforeCutoff()` from cutoff middleware
- Throws `CutoffPassedError` if cutoff passed
- Used in `createWithDeposit()`

### Layer 3: Cycle Status Check
- Verifies cycle.status === 'open'
- Rejects purchases for cycles in 'production', 'shipping', or 'completed' status
- Provides clear error messages

### Layer 4: UI Layer
- `canCreateStandalonePurchase()` checks availability
- Displays countdown timer
- Shows appropriate error messages
- Disables purchase button

## Integration Points

### Existing Code Integration:
1. **Cutoff Middleware** (`src/lib/cutoff-middleware.ts`): Reuses existing `validateBeforeCutoff()` and `isBeforeCutoff()` functions
2. **Database Functions**: Uses existing `is_before_cutoff()`, `check_capacity_available()`, and `reserve_capacity()` functions
3. **Type Definitions** (`src/types/database.ts`): Uses existing `StandalonePurchase` interface

### Future Integration (Task 10.2):
When task 10.2 is implemented, the following will be added:
- Full standalone purchase UI page
- Payment voucher upload
- Balance payment processing
- Admin interface for managing standalone purchases

## Requirement Validation

✅ **Requirement 7.6**: "THE ORDAX_Platform SHALL apply Cycle_Cutoff rule to both subscription deliveries and standalone purchases"

**Validation:**
1. Cutoff check is performed before creating standalone purchase
2. Cycle status is verified to be 'open'
3. Purchase is rejected if cutoff passed or cycle not open
4. Error messages clearly communicate the reason
5. UI prevents purchase attempts after cutoff
6. Tests verify cutoff enforcement

## Usage Example

### Service Usage:
```typescript
import { createWithDeposit } from '@/services/standalone-purchase-service';

try {
  const purchase = await createWithDeposit({
    userId: 'user-123',
    collectionId: 'collection-456',
    cycleId: 'cycle-789',
    depositVoucherUrl: 'https://example.com/voucher.jpg'
  });
  console.log('Purchase created:', purchase.id);
} catch (error) {
  if (error.message.includes('cutoff')) {
    console.error('Cutoff has passed');
  } else if (error.message.includes('cycle')) {
    console.error('Cycle not open');
  } else if (error.message.includes('capacity')) {
    console.error('Capacity exceeded');
  }
}
```

### UI Component Usage:
```tsx
import { StandalonePurchaseButton } from '@/components/StandalonePurchaseButton';

<StandalonePurchaseButton
  cycleId="cycle-789"
  collectionId="collection-456"
  collectionName="Dragon Collection"
  onPurchase={handlePurchase}
/>
```

### Edge Function Usage:
```typescript
const response = await fetch('/functions/v1/create-standalone-purchase', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    collectionId: 'collection-456',
    cycleId: 'cycle-789',
    depositVoucherUrl: 'https://example.com/voucher.jpg'
  })
});

const result = await response.json();
if (result.success) {
  console.log('Purchase created:', result.purchase);
} else {
  console.error('Error:', result.error, result.code);
}
```

## Files Created

1. `src/services/standalone-purchase-service.ts` - Service layer implementation
2. `src/services/standalone-purchase-service.test.ts` - Comprehensive test suite
3. `supabase/functions/create-standalone-purchase/index.ts` - Edge function endpoint
4. `src/components/StandalonePurchaseButton.tsx` - UI component
5. `.kiro/specs/ordax-complete-system/task-8.5-implementation.md` - This documentation

## Next Steps

This implementation provides the foundation for standalone purchases with cutoff enforcement. When task 10.2 is implemented, the following should be added:

1. Full standalone purchase page with collection selection
2. Payment voucher upload interface
3. Balance payment processing
4. Production completion workflow
5. Shipping integration
6. Admin interface for managing standalone purchases

The cutoff enforcement implemented in this task will automatically apply to all future standalone purchase functionality.

## Status

✅ **Task 8.5 Complete**

All acceptance criteria met:
- ✅ Cutoff rule applied to standalone purchases
- ✅ Cycle status checked (must be 'open')
- ✅ Current time verified before cutoff
- ✅ Purchase rejected if cutoff passed
- ✅ Clear error messages provided
- ✅ UI prevents invalid purchases
- ✅ All tests passing
