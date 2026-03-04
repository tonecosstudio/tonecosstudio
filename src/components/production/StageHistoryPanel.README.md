# StageHistoryPanel Component

## Overview

The `StageHistoryPanel` component displays a detailed history of all production stages for an order. It provides a comprehensive view of the production timeline, including completion times, notes, photos, and duration analysis.

## Features

- **Complete Stage History**: Displays all production stages in chronological order
- **Completion Times**: Shows start and completion timestamps for each stage
- **Duration Tracking**: Calculates and displays time spent in each stage
- **Performance Analysis**: Highlights stages that took longer than average (50% above average)
- **Notes Display**: Shows notes added by team members at each stage
- **Photo Gallery**: Displays photos uploaded during each stage with clickable links
- **Status Indicators**: Visual badges for completed, in-progress, pending, and blocked stages
- **Team Assignment**: Shows which team member was assigned to each stage
- **Block Information**: Displays blocking reasons for stages that are on hold
- **Average Duration**: Calculates and displays the average duration across all completed stages

## Usage

```tsx
import { StageHistoryPanel } from "@/components/production/StageHistoryPanel";

function ProductionDetailPage() {
  return (
    <StageHistoryPanel productionQueueId="queue-123" />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productionQueueId` | `string` | Yes | The ID of the production queue item to display history for |

## Component Structure

### Stage Display

Each stage in the history shows:

1. **Stage Indicator**: Numbered circle with stage-specific color
2. **Stage Name**: Localized stage name (e.g., "Design", "Produção")
3. **Status Badge**: Current status (Completo, Em Progresso, Pendente, Bloqueado)
4. **Performance Badge**: "Acima da média" badge if stage took 50%+ longer than average
5. **Duration**: Time spent in the stage (formatted as minutes, hours, or days)
6. **Timestamps**: Start and completion dates/times
7. **Assignment**: Team member assigned to the stage
8. **Notes**: Text notes added during stage completion
9. **Photos**: Grid of photos with clickable links to full-size images
10. **Block Information**: Reason for blocking (if applicable)

### Performance Highlighting

The component automatically:
- Calculates the average duration across all completed stages
- Identifies stages that took 50% longer than average
- Highlights these stages with an orange "Acima da média" badge
- Displays the duration in orange text for visual emphasis

### Photo Gallery

Photos are displayed in a responsive grid:
- 2 columns on mobile
- 3 columns on tablet
- 4 columns on desktop
- Each photo is clickable and opens in a new tab
- Hover effect shows the photo is interactive

## Data Flow

1. Component fetches stage history using `getStageHistory()` from stage service
2. Data is cached and refreshed every 30 seconds via React Query
3. Stages are sorted by `stageOrder` to ensure correct chronological display
4. Average duration is calculated from completed stages with `actualDuration`
5. Each stage is compared against the average to determine if it's slow

## States

### Loading State
- Displays a spinner while fetching data
- Shows "Histórico de Estágios" title

### Error State
- Shows error message if data fetch fails
- Displays the error details for debugging

### Empty State
- Shows message when no stages are found
- Indicates the production queue might be invalid

### Success State
- Displays full stage history with all details
- Shows average duration in the header
- Renders each stage with complete information

## Styling

The component uses:
- **Card**: Main container with shadow and border
- **Badges**: Status indicators with semantic colors
- **Color Coding**: Stage-specific colors (gray, blue, purple, yellow, green, emerald)
- **Responsive Grid**: Photo gallery adapts to screen size
- **Separators**: Visual dividers between stages
- **Muted Backgrounds**: Subtle backgrounds for notes and timestamps

## Integration

### With Stage Service

The component integrates with the stage service:

```typescript
import { getStageHistory } from "@/services/admin/stage-service";

// Fetches all stages for a production queue item
const stages = await getStageHistory(productionQueueId);
```

### With React Query

Uses React Query for:
- Automatic caching
- Background refetching every 30 seconds
- Loading and error states
- Optimistic updates

## Performance Considerations

- **Efficient Rendering**: Uses `useMemo` for average duration calculation
- **Optimized Images**: Photos are loaded on-demand
- **Pagination**: Not needed as stages are limited (max 6 per order)
- **Caching**: React Query caches data to reduce API calls

## Accessibility

- Semantic HTML with proper heading hierarchy
- Alt text for all images
- Keyboard navigation for photo links
- Color contrast meets WCAG standards
- Screen reader friendly status badges

## Testing

The component has comprehensive unit tests covering:
- Loading, error, and empty states
- Stage display with all details
- Notes and photos rendering
- Duration calculation and formatting
- Performance highlighting (slow stages)
- Average duration calculation
- Status badges
- Team assignment display
- Blocked stage information
- Timestamp formatting
- Stage ordering

Run tests with:
```bash
npm test -- StageHistoryPanel.test.tsx
```

## Related Components

- **ProductionStageTracker**: Shows current stage progress with timeline
- **StageTransitionModal**: Modal for completing stages and moving to next
- **ProductionKanbanCard**: Card view of production items in Kanban board

## Future Enhancements

Potential improvements:
1. Export stage history to PDF
2. Filter stages by status
3. Compare duration against estimated time
4. Add stage comments/discussion thread
5. Photo lightbox with navigation
6. Stage duration chart/visualization
7. Team performance metrics per stage
