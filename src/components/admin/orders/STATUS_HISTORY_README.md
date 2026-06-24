# Order Status History Implementation

## Overview

This implementation adds a complete audit trail for order status changes in the unified orders system. It tracks all status changes for both subscription deliveries and standalone purchases.

## Components

### 1. Database Migration
**File**: `supabase/migrations/20260424000000_create_order_status_history.sql`

Creates the `order_status_history` table with:
- Polymorphic relationship to orders (subscription_delivery or standalone_purchase)
- Automatic triggers to log status changes
- Admin user tracking
- Timestamps for all changes
- Initial data population for existing orders

### 2. Service Function
**File**: `src/services/admin/orders-service.ts`

Function: `fetchOrderStatusHistory(orderId, orderType)`
- Fetches all status changes for a specific order
- Returns data sorted by date (most recent first)
- Includes admin information and timestamps

### 3. React Component
**File**: `src/components/admin/orders/OrderStatusHistory.tsx`

Features:
- Timeline visualization of status changes
- Status badges showing old → new status
- Admin name and timestamp for each change
- Loading and error states
- Empty state handling

### 4. Integration
**File**: `src/components/admin/orders/OrderDetailPanel.tsx`

The status history is displayed in the order detail panel, showing the complete audit trail when viewing any order.

## Database Schema

```sql
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('subscription_delivery', 'standalone_purchase')),
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_admin_id UUID REFERENCES auth.users(id),
  changed_by_admin_name TEXT,
  change_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Automatic Logging

Status changes are automatically logged via database triggers:
- `trigger_log_subscription_delivery_status_change` - Logs changes to subscription_deliveries
- `trigger_log_standalone_purchase_status_change` - Logs changes to standalone_purchases

The triggers:
1. Detect when the status column changes
2. Capture the old and new status values
3. Record the admin user who made the change
4. Store the timestamp of the change

## Usage

The status history is automatically displayed in the OrderDetailPanel when viewing any order. No additional configuration is needed.

### Example Query

```typescript
import { fetchOrderStatusHistory } from '@/services/admin/orders/orders-service';

const history = await fetchOrderStatusHistory(
  'order-uuid-here',
  'subscription_delivery'
);
```

### Example Response

```typescript
[
  {
    id: 'history-uuid-1',
    orderId: 'order-uuid',
    orderType: 'subscription_delivery',
    oldStatus: 'confirmed',
    newStatus: 'shipped',
    changedBy: 'admin-uuid',
    changedByName: 'João Silva',
    changedAt: '2024-04-24T10:30:00Z',
    notes: undefined
  },
  {
    id: 'history-uuid-2',
    orderId: 'order-uuid',
    orderType: 'subscription_delivery',
    oldStatus: 'scheduled',
    newStatus: 'confirmed',
    changedBy: 'admin-uuid',
    changedByName: 'Maria Santos',
    changedAt: '2024-04-20T14:15:00Z',
    notes: undefined
  }
]
```

## Security

- Row Level Security (RLS) is enabled on the order_status_history table
- Only admins can view status history
- The system can insert records via triggers
- All changes are immutable (no updates or deletes allowed)

## Performance

Indexes are created for optimal query performance:
- `idx_order_status_history_order` - For fetching history by order
- `idx_order_status_history_admin` - For admin activity reports
- `idx_order_status_history_created` - For date range queries

## Migration Instructions

1. Apply the migration:
   ```bash
   supabase db push
   ```

2. Regenerate TypeScript types:
   ```bash
   npm run generate-types
   ```

3. The status history will automatically start tracking all future status changes

4. Historical data is populated for existing orders with their current status as the initial entry

## Requirements Validated

This implementation validates the following requirements:
- **5.4**: Display complete status change history with timestamps and responsible user
- **12.3**: Log all order modification actions
- **12.4**: Include admin ID and timestamp in audit logs

## Testing

To test the implementation:

1. View any order in the admin panel
2. Change the order status
3. Refresh the order details
4. Verify the status history shows the change with:
   - Old status → New status
   - Admin name
   - Timestamp
   - Visual timeline

## Future Enhancements

Potential improvements:
- Add change reason field (optional text input when changing status)
- Add filtering/search in status history
- Export status history to CSV
- Add notifications when status changes
- Add bulk status change history view
