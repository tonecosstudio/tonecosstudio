# BlockProductionModal Component

## Overview

The `BlockProductionModal` component provides a modal interface for blocking production items when issues arise that prevent progress. It captures the reason for blocking, allows estimation of resolution time, and shows the impact on estimated completion dates.

## Features

- **Required Reason Input**: Textarea for entering the reason for blocking (required field)
- **Estimated Resolution Time**: Optional input for specifying how long the issue will take to resolve
- **Impact Visualization**: Shows current and new estimated completion dates
- **Delay Warning**: Displays a warning when the block will cause a delay
- **Customer Notification**: Automatically notifies customers about the delay
- **Form Validation**: Ensures reason is provided before allowing block action

## Usage

```tsx
import { BlockProductionModal } from "@/components/production/BlockProductionModal";

function ProductionDashboard() {
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const handleBlock = () => {
    // Callback after successful block
    console.log("Production item blocked successfully");
  };

  return (
    <>
      <button onClick={() => {
        setSelectedItem("production-queue-id");
        setIsBlockModalOpen(true);
      }}>
        Block Production
      </button>

      <BlockProductionModal
        isOpen={isBlockModalOpen}
        onOpenChange={setIsBlockModalOpen}
        productionQueueId={selectedItem || ""}
        currentEstimatedCompletion={new Date("2024-12-31")}
        onBlock={handleBlock}
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
| `productionQueueId` | `string` | Yes | ID of the production queue item to block |
| `currentEstimatedCompletion` | `Date \| null` | No | Current estimated completion date (for impact calculation) |
| `onBlock` | `() => void` | No | Callback function called after successful block |

## Behavior

### Blocking Process

1. User opens the modal for a production item
2. User enters a required reason for blocking
3. User optionally enters estimated resolution time in hours
4. Modal calculates and displays the impact on completion date
5. User clicks "Bloquear Produção" button
6. System calls `blockProduction` service function
7. Production status is updated to "on_hold"
8. Customer receives notification about the delay
9. Modal closes and form resets

### Resolution Time Input

The resolution time input accepts decimal values in hours:
- `0.5` = 30 minutes
- `12` = 12 hours
- `24` = 1 day
- `48` = 2 days

The system automatically formats these durations in a human-readable format when storing the reason.

### Impact Calculation

When a resolution time is provided:
1. The modal adds the hours to the current estimated completion date
2. Displays both the current and new estimated dates
3. Calculates the delay in days
4. Shows a warning if the delay is greater than 0 days

### Form Validation

- **Reason**: Required field, must not be empty
- **Resolution Time**: Optional, must be a positive number if provided
- **Block Button**: Disabled until reason is provided

## Integration

### Backend Service

The component integrates with:
- `blockProduction(id, reason)` from `@/services/admin/production-service`
- `calculateEstimatedCompletion(productionQueueId)` from `@/services/admin/stage-service`

### Query Invalidation

After successful block, the component invalidates:
- `["production-queue"]` - Refreshes production queue list
- `["production-stages", productionQueueId]` - Refreshes stage history

## Styling

The component uses:
- Destructive variant for the block button (red)
- Alert component with destructive variant for warnings
- Muted background for the impact section
- Responsive layout with max-width of 2xl

## Accessibility

- Proper ARIA labels for all form inputs
- Required field indicators with asterisks
- Descriptive helper text for each input
- Keyboard navigation support
- Focus management

## Error Handling

- Displays toast notification on successful block
- Shows error toast if blocking fails
- Prevents submission while request is pending
- Validates input before submission

## Testing

The component includes comprehensive tests covering:
- Rendering all required elements
- Form validation
- Resolution time calculation
- Impact visualization
- Successful block flow
- Error handling
- Modal state management

Run tests with:
```bash
npm test -- BlockProductionModal.test.tsx
```

## Related Components

- `StageTransitionModal` - For completing production stages
- `AssignmentModal` - For assigning production items to team members
- `UnblockProductionModal` - For unblocking production items (Task 4.3.3)

## Notes

- The reason provided is shared with the customer, so it should be clear and professional
- Resolution time is optional but helps with planning and customer expectations
- The component automatically formats durations in Portuguese (pt-BR)
- Blocking sets production status to "on_hold" and triggers customer notification
