# Deadline Calculation Implementation

## Overview

This document describes the implementation of the character choice deadline calculation feature for the Production Management System.

**Task**: 3.3.1 Create deadline calculation function  
**Requirements**: 2.2.4 (AC1: Deadline is set to 7 days after order payment approval)  
**Date**: 2026-05-05

## Implementation Components

### 1. Database Function

**File**: `supabase/migrations/20260505000000_create_deadline_calculation_function.sql`

A PostgreSQL function that calculates the character choice deadline:

```sql
CREATE OR REPLACE FUNCTION calculate_character_choice_deadline(
  p_approval_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN p_approval_date + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Features**:
- Takes an approval date as input (defaults to current time)
- Returns a timestamp exactly 7 days after the approval date
- Marked as `IMMUTABLE` for query optimization
- Used by the `auto_populate_production_queue()` trigger function

### 2. Frontend Utility

**File**: `src/utils/deadline-calculator.ts`

A TypeScript utility module that mirrors the database logic for frontend use:

**Core Functions**:

- `calculateCharacterChoiceDeadline(approvalDate?: Date): Date`
  - Calculates deadline as 7 days after approval
  - Matches database function behavior

- `getHoursUntilDeadline(deadline: Date): number`
  - Returns hours remaining (negative if expired)

- `isDeadlineCritical(deadline: Date): boolean`
  - Returns true if < 24 hours remain

- `isDeadlineUrgent(deadline: Date): boolean`
  - Returns true if < 48 hours remain

- `hasDeadlineExpired(deadline: Date): boolean`
  - Returns true if deadline has passed

- `formatTimeRemaining(deadline: Date): string`
  - Returns human-readable format like "2 days, 5 hours"

- `getDeadlineUrgency(deadline: Date): 'expired' | 'critical' | 'urgent' | 'normal'`
  - Returns urgency level for UI styling

### 3. Test Suite

**File**: `src/utils/deadline-calculator.test.ts`

Comprehensive test coverage (23 tests) validating:
- Correct 7-day calculation
- Edge cases (month boundaries, leap years)
- Timezone handling
- Urgency level detection
- Time formatting

**Test Results**: ✅ All 23 tests passing

## Integration Points

### Database Integration

The `calculate_character_choice_deadline()` function is integrated into the `auto_populate_production_queue()` trigger function, which:

1. Fires when an order is approved (status changes to 'confirmed', 'balance_paid', or 'approved')
2. Determines if character choice is required (collection has multiple characters)
3. Calculates the deadline using the new function
4. Stores the deadline in both:
   - `character_choices.deadline` column
   - `production_queue.choice_deadline` column

### Order Types Supported

The deadline calculation works for all order types:
- **Subscription Deliveries**: When status changes to 'confirmed'
- **Standalone Purchases**: When status changes to 'balance_paid'
- **Manual Payments**: When status changes to 'approved'

### Frontend Integration

The utility functions can be used in React components for:

```typescript
import { 
  calculateCharacterChoiceDeadline,
  getDeadlineUrgency,
  formatTimeRemaining 
} from '@/utils/deadline-calculator';

// Calculate deadline from approval date
const deadline = calculateCharacterChoiceDeadline(order.approvedAt);

// Get urgency level for styling
const urgency = getDeadlineUrgency(deadline);

// Display formatted time remaining
const timeRemaining = formatTimeRemaining(deadline);
```

## Usage Examples

### Database Usage

```sql
-- Calculate deadline for a new order
SELECT calculate_character_choice_deadline('2026-05-01 10:00:00+00');
-- Returns: 2026-05-08 10:00:00+00

-- Calculate deadline from current time
SELECT calculate_character_choice_deadline();
-- Returns: 7 days from now
```

### Frontend Usage

```typescript
// Example 1: Display deadline countdown
const CharacterChoiceCard = ({ order }) => {
  const deadline = new Date(order.choiceDeadline);
  const urgency = getDeadlineUrgency(deadline);
  const timeRemaining = formatTimeRemaining(deadline);
  
  return (
    <div className={`deadline-${urgency}`}>
      <p>Time remaining: {timeRemaining}</p>
    </div>
  );
};

// Example 2: Check if choice is still allowed
const canChangeChoice = (deadline: Date) => {
  return !hasDeadlineExpired(deadline);
};

// Example 3: Show urgency indicator
const getUrgencyColor = (deadline: Date) => {
  const urgency = getDeadlineUrgency(deadline);
  
  switch (urgency) {
    case 'expired': return 'gray';
    case 'critical': return 'red';
    case 'urgent': return 'yellow';
    case 'normal': return 'green';
  }
};
```

## Validation

### Database Validation

The migration includes automatic validation:
- Function creation check
- Test with sample date (2026-05-01 → 2026-05-08)
- Integration with `auto_populate_production_queue()` function

### Frontend Validation

All utility functions are covered by unit tests:
- ✅ Correct 7-day calculation
- ✅ Timezone handling (UTC)
- ✅ Edge cases (month boundaries)
- ✅ Urgency level detection
- ✅ Time formatting

## Deployment

### Database Migration

To apply the migration:

```bash
# Using Supabase CLI
supabase db push

# Or apply directly to remote database
psql $DATABASE_URL -f supabase/migrations/20260505000000_create_deadline_calculation_function.sql
```

### Frontend Deployment

The utility functions are automatically included in the frontend build. No additional deployment steps required.

## Monitoring

### Key Metrics to Monitor

1. **Deadline Compliance Rate**: % of customers who make choices before deadline
2. **Average Time to Choice**: How long customers take to make their choice
3. **Expired Choices**: Count of choices that expired without selection

### Database Queries for Monitoring

```sql
-- Count of pending choices by urgency
SELECT 
  CASE 
    WHEN EXTRACT(EPOCH FROM (deadline - now())) / 3600 < 0 THEN 'expired'
    WHEN EXTRACT(EPOCH FROM (deadline - now())) / 3600 < 24 THEN 'critical'
    WHEN EXTRACT(EPOCH FROM (deadline - now())) / 3600 < 48 THEN 'urgent'
    ELSE 'normal'
  END AS urgency,
  COUNT(*) AS count
FROM character_choices
WHERE status = 'pending'
GROUP BY urgency;

-- Average time from creation to choice submission
SELECT 
  AVG(EXTRACT(EPOCH FROM (submitted_at - created_at)) / 3600) AS avg_hours_to_choice
FROM character_choices
WHERE status IN ('submitted', 'approved');
```

## Future Enhancements

Potential improvements for future iterations:

1. **Configurable Deadline Duration**: Allow admins to set custom deadline periods per collection
2. **Business Days Calculation**: Exclude weekends/holidays from deadline calculation
3. **Deadline Extensions**: Allow admins to extend deadlines for specific orders
4. **Automatic Reminders**: Integrate with notification system to send reminders at 5 days, 2 days, and 1 day before deadline
5. **Deadline History**: Track deadline changes and extensions for audit purposes

## Related Documentation

- [Requirements Document](../.kiro/specs/production-management-system/requirements.md) - Section 2.2.4
- [Design Document](../.kiro/specs/production-management-system/design.md) - Character Choice Management
- [Tasks Document](../.kiro/specs/production-management-system/tasks.md) - Task 3.3.1

## Support

For questions or issues related to deadline calculation:
1. Check the test suite for expected behavior
2. Review the database function implementation
3. Verify the `auto_populate_production_queue()` trigger is working correctly
4. Check the `character_choices` and `production_queue` tables for deadline values
