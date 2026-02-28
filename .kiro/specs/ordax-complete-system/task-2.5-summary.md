# Task 2.5: Update Existing Date Operations to Use Bahia Timezone

## Summary

Updated all critical date operations across the codebase to use America/Bahia timezone (UTC-3) utilities instead of raw `Date.now()` and `new Date()` calls. This ensures accurate cycle cutoff calculations and user-facing date displays.

## Files Modified

### 1. **supabase/functions/_shared/timezone.ts** (NEW)
- Created shared timezone utility module for Deno/Edge Functions
- Implements core functions:
  - `toUTC()` - Convert Bahia time to UTC for database storage
  - `toBahiaTime()` - Convert UTC to Bahia time for display
  - `nowInBahia()` - Get current time in Bahia timezone
  - `isBeforeCutoff()` - Check if before day 15 at 23:59:59
  - `getCutoffDate()` - Get cutoff date for specific month/year
  - `addDays()` - Add days to a date
  - `addMonths()` - Add months to a date

### 2. **src/pages/MySubscriptions.tsx**
- **Import added**: `import { toBahiaTime, nowInBahia } from "@/lib/timezone"`
- **Updated functions**:
  - `canChangeCollection()`: Now uses `toBahiaTime()` and `nowInBahia()` for accurate cutoff checks
  - `getDaysUntilCutoff()`: Now uses `toBahiaTime()` and `nowInBahia()` for accurate countdown

### 3. **supabase/functions/create-subscription/index.ts**
- **Import added**: `import { nowInBahia, addDays, toUTC } from "../_shared/timezone.ts"`
- **Updated**: `next_delivery_at` calculation now uses `toUTC(addDays(nowInBahia(), 30))` instead of `new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)`
- Ensures subscription delivery dates are calculated in Bahia timezone

### 4. **supabase/functions/schedule-deliveries/index.ts**
- **Import added**: `import { nowInBahia, toUTC } from "../_shared/timezone.ts"`
- **Updated**: All timestamp fields now use `toUTC(nowInBahia()).toISOString()`:
  - `status_changed_at`
  - `shipped_at`
  - `delivered_at`

### 5. **supabase/functions/cancel-subscription/index.ts**
- **Import added**: `import { nowInBahia, toUTC } from "../_shared/timezone.ts"`
- **Updated**: `cancelled_at` timestamp now uses `toUTC(nowInBahia()).toISOString()`

### 6. **supabase/functions/send-email/index.ts**
- **Import added**: `import { nowInBahia, toUTC, addDays } from '../_shared/timezone.ts'`
- **Updated**:
  - `isUserOnline()`: Now uses `toUTC(addDays(nowInBahia(), -5 / (24 * 60)))` for 5-minute threshold
  - `sent_at` timestamp now uses `toUTC(nowInBahia()).toISOString()`

### 7. **src/pages/admin/AdminSubscriptions.tsx**
- **Import added**: `import { nowInBahia, toUTC } from "@/lib/timezone"`
- **Updated**: All delivery status timestamps now use `toUTC(nowInBahia()).toISOString()`:
  - `shipping_date`
  - `delivered_at`
  - `production_start_date`

## Requirements Validated

- **Requirement 1.1**: All date/time operations now use America/Bahia timezone
- **Requirement 1.4**: Database writes convert from Bahia time to UTC using `toUTC()`
- **Requirement 1.5**: User-facing dates use Bahia time via `toBahiaTime()` and `nowInBahia()`

## Testing Recommendations

1. **Cutoff Checks**: Test that collection changes are blocked after day 15 at 23:59:59 Bahia time
2. **Subscription Creation**: Verify `next_delivery_at` is calculated correctly in Bahia timezone
3. **Status Timestamps**: Confirm all delivery status changes record accurate Bahia time
4. **Email Notifications**: Verify online status checks use correct 5-minute window in Bahia time

## Notes

- The existing `src/lib/timezone.ts` already had comprehensive timezone utilities for the frontend
- Created new `supabase/functions/_shared/timezone.ts` for Deno/Edge Functions (cannot use date-fns-tz in Deno)
- All database writes now properly convert Bahia time to UTC before storage
- All user-facing date calculations now use Bahia timezone
- No TypeScript errors or diagnostics issues detected

## Next Steps

- Task 2.3: Write property test for timezone round-trip preservation
- Task 2.4: Write property test for business day calculation
- Continue with remaining tasks in Phase 1
