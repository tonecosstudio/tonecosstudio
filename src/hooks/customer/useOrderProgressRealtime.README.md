# useOrderProgressRealtime Hook

## Overview

Custom React hook that manages real-time updates for customer order progress view using Supabase Realtime subscriptions.

## Purpose

This hook enables customers to see live updates of their order's production progress without manually refreshing the page. It subscribes to database changes and automatically updates the UI with toast notifications for important events.

## Features

- ✅ Subscribe to `production_queue` table changes for user's orders
- ✅ Subscribe to `character_choices` table changes
- ✅ Automatically update UI when changes are detected
- ✅ Show toast notifications for stage changes
- ✅ Show toast notifications for character choice approvals/rejections
- ✅ Handle connection errors and reconnection gracefully
- ✅ Clean up subscriptions on unmount
- ✅ All notifications in Portuguese (pt-BR)

## Usage

```typescript
import { useOrderProgressRealtime } from "@/hooks/customer/useOrderProgressRealtime";

function CustomerOrderProgressPage() {
  const { orderId, orderType } = useParams();

  // Subscribe to real-time updates
  useOrderProgressRealtime({
    orderId: orderId || "",
    orderType: orderType as "subscription_delivery" | "standalone_purchase",
    enabled: !!orderId && !!orderType,
    enableToast: true,
  });

  // ... rest of component
}
```

## Parameters

### `UseOrderProgressRealtimeOptions`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `orderId` | `string` | Yes | - | The order ID to subscribe to |
| `orderType` | `"subscription_delivery" \| "standalone_purchase"` | Yes | - | The type of order |
| `enabled` | `boolean` | No | `true` | Whether to enable subscriptions |
| `enableToast` | `boolean` | No | `true` | Whether to show toast notifications |

## Notifications

### Production Stage Changes

When the order moves to a new production stage, a toast notification is shown:

- **Title**: "Pedido Atualizado"
- **Description**: "Seu pedido avançou para: [Stage Name]"
- **Duration**: 5 seconds

**Special case - Shipped:**
- **Title**: "🎉 Pedido Enviado!"
- **Description**: "Seu pedido foi enviado. Código de rastreamento: [Tracking Code]"
- **Duration**: 8 seconds

### Character Choice Updates

#### Approved
- **Title**: "✅ Escolha Aprovada!"
- **Description**: "Sua escolha do personagem '[Character Name]' foi aprovada. A produção começará em breve!"
- **Duration**: 8 seconds

#### Rejected
- **Title**: "Escolha Rejeitada"
- **Description**: "Sua escolha foi rejeitada. Motivo: [Reason]. Por favor, escolha outro personagem."
- **Variant**: Destructive (red)
- **Duration**: 10 seconds

#### Locked
- **Title**: "Escolha Confirmada"
- **Description**: "Sua escolha foi confirmada e a produção foi iniciada!"
- **Duration**: 5 seconds

### Connection Errors

When a connection error occurs:
- **Title**: "Erro de Conexão"
- **Description**: "Não foi possível conectar às atualizações em tempo real. Tentando reconectar..."
- **Variant**: Destructive (red)
- **Duration**: 5 seconds

## Implementation Details

### Subscriptions

The hook creates two Supabase Realtime channels:

1. **Production Queue Channel** (`production-queue:{orderId}:{orderType}`)
   - Listens to `UPDATE` events on `production_queue` table
   - Filters by `order_id`
   - Tracks stage changes and shows notifications

2. **Character Choices Channel** (`character-choices:{orderId}:{orderType}`)
   - Listens to `UPDATE` and `INSERT` events on `character_choices` table
   - Filters by `order_id`
   - Tracks choice status changes and shows notifications

### Query Invalidation

When changes are detected, the hook invalidates the following query:
```typescript
["customer-order-progress", orderId, orderType]
```

This triggers a refetch of the order progress data, ensuring the UI stays in sync.

### Cleanup

The hook automatically cleans up subscriptions when:
- The component unmounts
- The `orderId` or `orderType` changes
- The `enabled` flag is set to `false`

### Error Handling

The hook handles the following connection states:
- `SUBSCRIBED` - Successfully connected
- `CHANNEL_ERROR` - Connection error (shows toast if enabled)
- `TIMED_OUT` - Connection timeout (logs warning, will retry)
- `CLOSED` - Channel closed (logs info)

## Requirements

**Validates Requirements:**
- 2.4.5 Progress Notifications

**Task:**
- 5.2.1 Implement Supabase Realtime subscription

## Testing

The hook includes comprehensive unit tests covering:
- Subscription setup
- Production queue updates
- Character choice updates
- Toast notifications
- Error handling
- Cleanup

Run tests:
```bash
npm test -- src/hooks/customer/useOrderProgressRealtime.test.ts
```

## Dependencies

- `@tanstack/react-query` - Query invalidation
- `@/integrations/supabase/client` - Supabase client
- `@/hooks/use-toast` - Toast notifications
- `react` - React hooks (useEffect, useRef)

## Notes

- The hook uses `useRef` to track previous stage and choice status to detect changes
- The hook uses `isMountedRef` to prevent state updates after unmount
- All console logs are prefixed with `[useOrderProgressRealtime]` for easy debugging
- The hook respects the `enableToast` flag for all notifications, including errors
- Stage names are displayed in Portuguese using the `STAGE_NAMES` mapping

## Related Components

- `CustomerOrderProgressPage` - Main page that uses this hook
- `CharacterChoiceCard` - Displays character choice status
- `ProgressTimeline` - Displays production stage timeline
- `EstimatedDatesCard` - Displays estimated dates

## Future Enhancements

Potential improvements for future releases:
- Add sound notifications (optional, user preference)
- Add browser notifications (with permission)
- Add notification history/log
- Add notification preferences (which events to show)
- Add retry logic for failed subscriptions
- Add connection status indicator in UI
