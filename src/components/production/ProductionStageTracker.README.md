# ProductionStageTracker Component

## Overview

The `ProductionStageTracker` component displays a visual horizontal timeline of production stages for an order. It shows the current stage, completed stages with checkmarks, time spent in each stage, and provides a "Next Stage" button to advance production.

## Features

- ✅ **Horizontal Timeline**: Displays all 6 production stages in a visual timeline
- ✅ **Current Stage Highlighting**: Highlights the current stage with a blue ring and "Em Progresso" badge
- ✅ **Completed Stages**: Shows checkmarks for completed stages with completion dates
- ✅ **Time Tracking**: Displays time spent in each stage (actual or elapsed time)
- ✅ **Next Stage Button**: Allows admins to advance to the next stage with one click
- ✅ **Blocked Stage Handling**: Shows blocked stages with red highlighting and block reason
- ✅ **Real-time Updates**: Automatically refreshes every 30 seconds
- ✅ **Completion Message**: Shows a success message when all stages are completed
- ✅ **Responsive Design**: Works on desktop and mobile devices

## Production Stages

The component tracks 6 sequential production stages:

1. **Aguardando Escolha** (Awaiting Choice) - Customer needs to choose a character
2. **Design** - Design phase for the collectible figure
3. **Produção** (Production) - Manufacturing the figure
4. **Controle de Qualidade** (Quality Check) - Quality assurance
5. **Embalagem** (Packaging) - Packaging the product
6. **Enviado** (Shipped) - Item has been shipped to customer

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productionQueueId` | `string` | Yes | The ID of the production queue item to track |
| `onStageComplete` | `(stage: ProductionStageRecord) => void` | No | Callback function called when a stage is completed |

## Usage

### Basic Usage

```tsx
import { ProductionStageTracker } from "@/components/production/ProductionStageTracker";

function OrderDetailPage({ productionQueueId }) {
  return (
    <div>
      <ProductionStageTracker productionQueueId={productionQueueId} />
    </div>
  );
}
```

### With Stage Complete Callback

```tsx
import { ProductionStageTracker } from "@/components/production/ProductionStageTracker";
import { toast } from "@/components/ui/use-toast";

function OrderDetailPage({ productionQueueId, customerId }) {
  const handleStageComplete = (stage) => {
    // Send notification to customer
    notifyCustomer(customerId, {
      title: "Production Update",
      message: `Your order has completed the ${stage.stageName} stage.`,
    });

    // Show success toast
    toast({
      title: "Stage Completed",
      description: `${stage.stageName} has been marked as complete.`,
    });
  };

  return (
    <div>
      <ProductionStageTracker 
        productionQueueId={productionQueueId}
        onStageComplete={handleStageComplete}
      />
    </div>
  );
}
```

### In Production Dashboard

```tsx
import { ProductionStageTracker } from "@/components/production/ProductionStageTracker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function ProductionDashboard() {
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <div>
      {/* Production queue list */}
      <ProductionList onItemClick={setSelectedItem} />

      {/* Stage tracker in modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Production Progress</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <ProductionStageTracker 
              productionQueueId={selectedItem.id}
              onStageComplete={() => {
                // Refresh production queue
                queryClient.invalidateQueries({ queryKey: ["production-queue"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

## Component Behavior

### Stage Progression

- Stages must be completed in sequential order (cannot skip stages)
- Clicking "Next Stage" button completes the current stage and moves to the next
- The button is disabled when:
  - A stage is blocked
  - The mutation is in progress
  - All stages are completed

### Time Display

- **Completed stages**: Shows actual duration (e.g., "2h", "6h", "1d 4h")
- **Current stage**: Shows elapsed time since stage started
- **Pending stages**: Shows "-" (no time yet)

Time is formatted as:
- Less than 1 hour: "45m"
- 1-23 hours: "6h"
- 24+ hours: "1d 4h" or "2d"

### Blocked Stages

When a stage is blocked:
- The stage circle shows a red ring
- A "Bloqueado" (Blocked) badge is displayed
- The block reason is shown in the current stage info section
- The "Next Stage" button is disabled

### Completion State

When all stages are completed:
- A success message is displayed
- The "Next Stage" button is hidden
- A green checkmark icon is shown
- The message indicates the item has been shipped

## Styling

The component uses Tailwind CSS classes and follows the shadcn/ui design system:

- **Primary color**: Used for progress bar and current stage
- **Gray**: Used for pending stages
- **Green**: Used for completion message
- **Red**: Used for blocked stages
- **Blue**: Used for current stage highlighting

## Dependencies

- `@tanstack/react-query` - Data fetching and caching
- `lucide-react` - Icons (Check, Clock, ChevronRight, Loader2)
- `@/components/ui/*` - shadcn/ui components (Button, Card, Badge)
- `@/services/admin/stage-service` - Stage management API

## API Integration

The component uses the following API functions from `stage-service.ts`:

- `getStageHistory(productionQueueId)` - Fetches all stages for a production item
- `completeStage(stageId, notes?, photos?)` - Marks a stage as complete

## Testing

The component includes comprehensive tests covering:

- ✅ Loading state
- ✅ Displaying all stages
- ✅ Highlighting current stage
- ✅ Showing checkmarks for completed stages
- ✅ Displaying time spent in each stage
- ✅ Next Stage button functionality
- ✅ Stage completion
- ✅ Assigned team member display
- ✅ Blocked stage handling
- ✅ Completion message
- ✅ Error handling
- ✅ Callback invocation

Run tests with:
```bash
npm test -- ProductionStageTracker.test.tsx
```

## Accessibility

- Uses semantic HTML elements
- Provides clear visual indicators for stage status
- Button has descriptive text
- Loading state is indicated with spinner
- Error messages are clearly displayed

## Performance

- Automatically refreshes every 30 seconds
- Uses React Query for efficient caching
- Optimistic UI updates on stage completion
- Minimal re-renders with proper memoization

## Future Enhancements

Potential improvements for future versions:

- [ ] Add photo upload when completing a stage
- [ ] Add notes textarea when completing a stage
- [ ] Show stage history with timestamps
- [ ] Add ability to go back to previous stage (with admin override)
- [ ] Add drag-and-drop to reorder stages
- [ ] Add stage duration comparison with average
- [ ] Add estimated completion date calculation
- [ ] Add team member assignment per stage
- [ ] Add stage-specific notifications
- [ ] Add stage completion confirmation dialog

## Related Components

- `ProductionKanbanBoard` - Kanban view of production queue
- `ProductionListView` - List view of production queue
- `ProductionMetricsBar` - Production metrics dashboard
- `StageTransitionModal` - Modal for stage transitions with notes/photos

## Support

For issues or questions, please refer to:
- Design document: `.kiro/specs/production-management-system/design.md`
- Requirements: `.kiro/specs/production-management-system/requirements.md`
- Tasks: `.kiro/specs/production-management-system/tasks.md`
