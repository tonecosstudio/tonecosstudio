# AssignmentModal Component

## Overview

The `AssignmentModal` component provides a user interface for assigning production items to team members. It supports both initial assignments and reassignments with optional reason tracking.

## Features

### Core Functionality
- **Team Member Selection**: Browse and select from available team members
- **Workload Display**: Shows current workload (number of assigned items) for each team member
- **Search/Filter**: Search team members by name or email
- **Reassignment Support**: Allows reassigning items with optional reason tracking
- **Real-time Updates**: Fetches current workload when modal opens

### Assignment Logic
When a production item is assigned:
1. **Database Update**: Updates `production_queue.assigned_to`, `assigned_to_name`, and `assigned_at`
2. **Assignment Logging**: Creates a record in `production_assignment_logs` table with:
   - Assigned user information
   - Admin who made the assignment
   - Timestamp
   - Reassignment flag and previous assignee (if applicable)
   - Reason for assignment/reassignment
3. **Notification**: Sends email notification to the assigned team member
4. **Error Handling**: Continues even if logging or notification fails

## Usage

```tsx
import { AssignmentModal } from '@/components/production/AssignmentModal';

function ProductionDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [currentAssignee, setCurrentAssignee] = useState<string | null>(null);

  const handleAssign = async (userId: string, reason?: string) => {
    await assignProduction(selectedItemId!, userId, reason);
    // Refresh production queue
  };

  return (
    <>
      <button onClick={() => {
        setSelectedItemId('prod-123');
        setCurrentAssignee('user-456'); // or null for new assignment
        setIsModalOpen(true);
      }}>
        Assign Item
      </button>

      <AssignmentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        productionItemId={selectedItemId!}
        currentAssignee={currentAssignee}
        onConfirm={handleAssign}
      />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | Yes | Controls modal visibility |
| `onOpenChange` | `(open: boolean) => void` | Yes | Callback when modal open state changes |
| `productionItemId` | `string` | Yes | ID of the production queue item being assigned |
| `currentAssignee` | `string \| null` | No | ID of currently assigned user (for reassignments) |
| `onConfirm` | `(userId: string, reason?: string) => Promise<void>` | Yes | Callback when assignment is confirmed |

## Reassignment Flow

When reassigning an item (currentAssignee is set and user selects a different team member):

1. **Reason Input**: A text input field appears asking for the reassignment reason
2. **Optional Field**: Reason is optional but recommended for audit trail
3. **Logging**: The reassignment is logged with:
   - `is_reassignment: true`
   - `previous_assignee`: ID of the previous assignee
   - `previous_assignee_name`: Name of the previous assignee
   - `reason`: User-provided reason or "Reatribuição"
4. **Notification**: The new assignee receives a "reassignment" notification

## Database Schema

### production_queue Table
```sql
assigned_to UUID REFERENCES auth.users(id)
assigned_to_name TEXT
assigned_at TIMESTAMPTZ
```

### production_assignment_logs Table
```sql
id UUID PRIMARY KEY
production_queue_id UUID REFERENCES production_queue(id)
assigned_to UUID REFERENCES auth.users(id)
assigned_to_name TEXT
assigned_by UUID REFERENCES auth.users(id)
is_reassignment BOOLEAN
previous_assignee UUID REFERENCES auth.users(id)
previous_assignee_name TEXT
reason TEXT
assigned_at TIMESTAMPTZ
```

## API Integration

The component uses the `assignProduction` function from `production-service.ts`:

```typescript
async function assignProduction(
  id: string,
  userId: string,
  reason?: string
): Promise<ProductionQueueItem>
```

This function:
1. Fetches current assignment info
2. Fetches user profile information
3. Updates production_queue table
4. Logs assignment in production_assignment_logs
5. Sends notification via ProductionNotificationService
6. Returns updated production queue item

## Notification

Assigned team members receive an email notification with:
- Customer name and order details
- Collection and character information
- Current production stage
- Priority level (with color-coded badge)
- Scheduled and estimated completion dates
- Link to access the production system

The notification template is different for initial assignments vs. reassignments.

## Error Handling

The component handles errors gracefully:
- **User Not Found**: Throws error and prevents assignment
- **Update Failure**: Throws error and shows error message
- **Logging Failure**: Logs error to console but continues (assignment succeeds)
- **Notification Failure**: Logs error to console but continues (assignment succeeds)

This ensures that critical operations (database update) succeed even if non-critical operations (logging, notifications) fail.

## Testing

Unit tests are available in `src/services/admin/__tests__/production-assignment.test.ts`:

```bash
npm test -- src/services/admin/__tests__/production-assignment.test.ts --run
```

Tests cover:
- Initial assignment
- Reassignment with reason
- Error handling (user not found, update failure)
- Graceful degradation (logging/notification failures)

## Accessibility

- Uses semantic HTML with proper ARIA labels
- Keyboard navigation supported
- Focus management when modal opens/closes
- Screen reader friendly with descriptive labels

## Future Enhancements

Potential improvements:
1. **Bulk Assignment**: Assign multiple items at once
2. **Smart Suggestions**: Suggest team members based on workload and expertise
3. **Assignment History**: Show assignment history in the modal
4. **Workload Visualization**: Add charts showing team workload distribution
5. **Assignment Rules**: Auto-assign based on predefined rules
