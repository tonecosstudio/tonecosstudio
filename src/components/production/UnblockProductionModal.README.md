# UnblockProductionModal Component

## Overview

The `UnblockProductionModal` component provides an interface for admins to unblock production items after resolving issues that caused the blockage. It displays the original block reason, allows adding resolution notes, and shows the updated estimated completion date.

## Features

- **Original Block Reason Display**: Shows the reason why production was blocked and when it was blocked
- **Blocked Duration**: Calculates and displays how long the item has been blocked
- **Resolution Notes**: Optional textarea for documenting how the issue was resolved
- **New Estimated Completion Date**: Automatically calculates and displays the updated completion date after unblocking
- **Unblock & Resume Button**: Triggers the unblock operation and resumes production
- **Real-time Updates**: Invalidates queries to refresh dashboard data after unblocking

## Usage

```tsx
import { UnblockProductionModal } from "@/components/production/UnblockProductionModal";

function ProductionDashboard() {
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const handleUnblock = () => {
    console.log("Production unblocked successfully");
    // Refresh data or show notification
  };

  return (
    <>
      <Button onClick={() => {
        setSelectedItemId("queue-123");
        setIsUnblockModalOpen(true);
      }}>
        Unblock Production
      </Button>

      <UnblockProductionModal
        isOpen={isUnblockModalOpen}
        onOpenChange={setIsUnblockModalOpen}
        productionQueueId={selectedItemId!}
        onUnblock={handleUnblock}
      />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls modal visibility |
| `onOpenChange` | `(open: boolean) => void` | Yes | Callback when modal open state changes |
| `productionQueueId` | `string` | Yes | ID of the production queue item to unblock |
| `onUnblock` | `() => void` | No | Optional callback executed after successful unblock |

## Component Behavior

### Data Fetching

The component automatically fetches:
1. **Block Information**: Queries the `production_stages` table to get the block reason and blocked timestamp
2. **Estimated Completion Date**: Calculates the new estimated completion date using the `calculateEstimatedCompletion` function

### Unblock Process

When the "Unblock & Resume" button is clicked:

1. Updates the `production_stages` table:
   - Sets `is_blocked` to `false`
   - Clears `block_reason`
   - Sets `unblocked_at` timestamp
   - Changes `status` to `in_progress`
   - Adds resolution notes if provided

2. Calls `unblockProduction` service function:
   - Updates `production_queue` status based on current stage
   - Recalculates estimated completion date
   - Sends notification to customer (handled by service)

3. Invalidates queries to refresh:
   - Production queue data
   - Production stages data
   - Block info data

4. Executes `onUnblock` callback if provided

5. Closes the modal

### Error Handling

- **Fetch Errors**: Shows fallback data from `production_notes` if stage data is unavailable
- **Unblock Errors**: Displays error toast and keeps modal open for retry
- **Calculation Errors**: Gracefully handles date calculation failures without blocking the unblock operation

## Integration

### Services Used

- `unblockProduction` from `@/services/admin/production-service`
- `calculateEstimatedCompletion` from `@/services/admin/stage-service`
- Direct Supabase queries for fetching block information

### Database Tables

- `production_queue`: Main production item data
- `production_stages`: Stage-specific data including block information

### Notifications

The component triggers customer notifications through the `unblockProduction` service function, which internally calls the notification service.

## Styling

The component uses:
- Green color scheme to indicate positive action (unblocking)
- Muted background for displaying block information
- Green-tinted section for new estimated completion date
- Consistent spacing and typography with other production modals

## Accessibility

- Proper ARIA labels for form inputs
- Keyboard navigation support
- Loading states with appropriate indicators
- Clear visual feedback for all actions

## Related Components

- `BlockProductionModal`: Counterpart component for blocking production
- `ProductionStageTracker`: Displays stage progression including blocked status
- `ProductionKanbanCard`: Shows blocked items in the dashboard

## Testing

The component includes comprehensive tests covering:
- Rendering with block information
- Display of original block reason and duration
- Resolution notes input
- Unblock functionality
- New estimated completion date display
- Error handling scenarios
- Modal controls and state management

Run tests with:
```bash
npm test UnblockProductionModal.test.tsx
```

## Example Scenarios

### Scenario 1: Material Shortage Resolved

```tsx
// Item was blocked due to missing materials
// Block reason: "Aguardando material em falta"
// Admin receives materials and wants to resume production

<UnblockProductionModal
  isOpen={true}
  onOpenChange={setIsOpen}
  productionQueueId="queue-456"
  onUnblock={() => {
    toast({
      title: "Produção Retomada",
      description: "O item voltou para a fila de produção",
    });
  }}
/>

// Admin adds resolution notes: "Material recebido e verificado"
// Clicks "Unblock & Resume"
// Production resumes with updated estimated completion date
```

### Scenario 2: Equipment Repair Completed

```tsx
// Item was blocked due to equipment failure
// Block reason: "Equipamento quebrado - aguardando reparo"
// Equipment is fixed and production can continue

<UnblockProductionModal
  isOpen={true}
  onOpenChange={setIsOpen}
  productionQueueId="queue-789"
  onUnblock={() => {
    // Refresh dashboard to show updated status
    queryClient.invalidateQueries({ queryKey: ["production-queue"] });
  }}
/>

// Admin adds resolution notes: "Equipamento reparado e testado"
// New estimated completion date is calculated
// Customer receives notification about production resumption
```

## Notes

- Resolution notes are optional but recommended for maintaining a clear audit trail
- The component automatically calculates blocked duration in a human-readable format
- New estimated completion date is calculated based on remaining stages and average durations
- The modal prevents closing while an unblock operation is in progress
- All state is reset when the modal closes to ensure clean state for next use
