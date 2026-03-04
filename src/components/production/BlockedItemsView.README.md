# BlockedItemsView Component

## Overview

The `BlockedItemsView` component provides a dedicated view for all blocked production items, helping admins quickly identify and resolve blocking issues. It displays items sorted by duration (longest blocked first) and provides quick access to unblock functionality.

## Features

- **Display All Blocked Items**: Shows all production items with status "on_hold"
- **Block Reason and Duration**: Displays the reason for blocking and how long the item has been blocked
- **Unblock Button**: Quick access to unblock items via the UnblockProductionModal
- **Sort by Duration**: Items are automatically sorted by longest blocked first
- **Color-Coded Duration**: Visual indicators for items blocked for extended periods
  - Red: > 48 hours
  - Orange: > 24 hours
  - Default: < 24 hours
- **Real-Time Updates**: Automatically refetches data every 30 seconds
- **Empty State**: Positive feedback when no items are blocked

## Usage

```tsx
import { BlockedItemsView } from "@/components/production/BlockedItemsView";

function ProductionDashboard() {
  return (
    <div>
      <h1>Blocked Items</h1>
      <BlockedItemsView />
    </div>
  );
}
```

## Component Structure

### Main Component

The component fetches blocked items and displays them in a table format:

```tsx
<BlockedItemsView />
```

### Data Flow

1. **Fetch Blocked Items**: Queries production queue for items with status "on_hold"
2. **Fetch Stage Details**: For each blocked item, fetches block reason and blocked_at timestamp
3. **Calculate Duration**: Computes how long each item has been blocked
4. **Sort by Duration**: Orders items by longest blocked first (descending)
5. **Display**: Renders items in a table with all relevant information

### Table Columns

- **Cliente**: Customer name and email
- **Coleção**: Collection name
- **Personagem**: Character name (or "-" if not selected)
- **Estágio**: Current production stage
- **Prioridade**: Priority badge (Critical, High, Normal, Low)
- **Motivo do Bloqueio**: Reason for blocking (truncated with tooltip)
- **Bloqueado em**: Timestamp when item was blocked
- **Duração**: How long the item has been blocked (color-coded)
- **Responsável**: Assigned team member (or "-" if unassigned)
- **Ações**: Unblock button

## Integration

### Dependencies

- `@tanstack/react-query`: For data fetching and caching
- `@/services/admin/production-service`: For fetching production queue
- `@/integrations/supabase/client`: For fetching stage details
- `./UnblockProductionModal`: For unblocking functionality
- `date-fns`: For date formatting

### Related Components

- **UnblockProductionModal**: Modal for unblocking items
- **BlockProductionModal**: Modal for blocking items
- **ProductionListView**: General list view for all production items
- **UrgentAlertsBar**: Shows count of blocked items

## States

### Loading State

Displays a skeleton table while data is being fetched:

```tsx
<BlockedItemsViewSkeleton />
```

### Empty State

Shows a positive message when no items are blocked:

```tsx
<div className="text-center py-12 border rounded-lg bg-green-50">
  <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
  <h3>Nenhum Item Bloqueado</h3>
  <p>Ótimo! Não há itens de produção bloqueados no momento.</p>
</div>
```

### Data State

Displays blocked items in a table with unblock buttons.

## Formatting Functions

### formatStageName

Converts stage keys to Portuguese labels:

```typescript
const stageLabels = {
  awaiting_choice: "Aguardando Escolha",
  design: "Design",
  production: "Produção",
  quality_check: "Controle de Qualidade",
  packaging: "Embalagem",
  shipped: "Enviado",
};
```

### formatDuration

Formats duration in a human-readable format:

- < 1 hour: "X minutos"
- < 24 hours: "X horas"
- >= 24 hours: "X dias e Y horas" or "X dias"

### formatDate

Formats dates in Brazilian Portuguese format:

```typescript
format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
```

## Priority Colors

```typescript
const colors = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  normal: "bg-blue-500 text-white",
  low: "bg-gray-500 text-white",
};
```

## Duration Color Coding

```typescript
// Red border for > 48 hours
item.blockedDurationHours > 48 ? "border-red-500 text-red-700" :
// Orange border for > 24 hours
item.blockedDurationHours > 24 ? "border-orange-500 text-orange-700" :
// Default styling
""
```

## Unblock Flow

1. User clicks "Desbloquear" button
2. `handleUnblockClick` sets selected item ID and opens modal
3. `UnblockProductionModal` is displayed
4. User completes unblock process in modal
5. `handleUnblockSuccess` refetches data to update the list
6. Item is removed from blocked items view

## Performance Considerations

- **Auto-Refetch**: Data is refetched every 30 seconds to keep the view current
- **Efficient Queries**: Uses indexed queries on production_status and stage_name
- **Pagination**: Fetches up to 1000 items (should be sufficient for blocked items)
- **Optimistic Updates**: Modal triggers refetch on success

## Accessibility

- Semantic HTML table structure
- Descriptive button labels
- Color is not the only indicator (text labels accompany colors)
- Keyboard navigation support through standard table and button elements

## Testing

The component includes comprehensive tests covering:

- Loading state rendering
- Empty state display
- Blocked items display
- Item details rendering
- Unblock button functionality
- Duration color coding
- Handling of null values (character, assignee)
- Sorting by duration

Run tests with:

```bash
npm test BlockedItemsView.test.tsx
```

## Future Enhancements

Potential improvements for future iterations:

1. **Bulk Unblock**: Allow selecting multiple items to unblock at once
2. **Filter by Duration**: Filter items by how long they've been blocked
3. **Export**: Export blocked items list to CSV
4. **Notifications**: Alert admins when items are blocked for too long
5. **History**: Show history of previous blocks and unblocks
6. **Analytics**: Track average block duration and common block reasons

## Related Documentation

- [Production Management System Requirements](/.kiro/specs/production-management-system/requirements.md)
- [Production Management System Design](/.kiro/specs/production-management-system/design.md)
- [UnblockProductionModal README](./UnblockProductionModal.README.md)
- [BlockProductionModal README](./BlockProductionModal.README.md)
