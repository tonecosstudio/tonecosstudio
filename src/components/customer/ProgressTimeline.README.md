# ProgressTimeline Component

Customer-facing visual timeline component that displays production progress for orders.

## Overview

The `ProgressTimeline` component provides a clear, visual representation of an order's production progress through various stages. It shows completed stages with checkmarks, highlights the current stage with animation, and displays estimated dates for future stages.

## Features

- ✅ **Horizontal Timeline (Desktop/Tablet)**: Displays all stages in a horizontal layout with a progress bar
- 📱 **Vertical Timeline (Mobile)**: Responsive vertical layout for mobile devices
- ✨ **Animated Current Stage**: Highlights the current stage with a pulsing animation
- 📅 **Date Display**: Shows completion dates for completed stages and estimated dates for future stages
- 🎨 **Visual Indicators**: Uses emojis and icons to represent each production stage
- ♿ **Accessible**: Includes proper ARIA labels and semantic HTML
- 🌍 **Localized**: All dates formatted in Portuguese (pt-BR)

## Usage

```tsx
import { ProgressTimeline } from "@/components/customer/ProgressTimeline";

function OrderProgressPage() {
  const stages = [
    {
      name: "awaiting_choice",
      displayName: "Aguardando Escolha",
      status: "completed",
      completedAt: "2024-01-15T10:00:00Z",
      order: 1,
    },
    {
      name: "design",
      displayName: "Design",
      status: "completed",
      completedAt: "2024-01-20T14:30:00Z",
      order: 2,
    },
    {
      name: "production",
      displayName: "Produção",
      status: "current",
      completedAt: null,
      order: 3,
    },
    {
      name: "quality_check",
      displayName: "Controle de Qualidade",
      status: "upcoming",
      completedAt: null,
      estimatedDate: "2024-02-05T10:00:00Z",
      order: 4,
    },
    {
      name: "packaging",
      displayName: "Embalagem",
      status: "upcoming",
      completedAt: null,
      estimatedDate: "2024-02-08T10:00:00Z",
      order: 5,
    },
    {
      name: "shipped",
      displayName: "Enviado",
      status: "upcoming",
      completedAt: null,
      estimatedDate: "2024-02-10T10:00:00Z",
      order: 6,
    },
  ];

  return (
    <ProgressTimeline
      stages={stages}
    />
  );
}
```

## Props

### `ProgressTimelineProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `stages` | `StageInfo[]` | Yes | Array of stage information objects |
| `className` | `string` | No | Additional CSS classes to apply to the root element |

### `StageInfo`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `ProductionStage` | Yes | Stage identifier |
| `displayName` | `string` | Yes | Human-readable stage name |
| `status` | `"completed" \| "current" \| "upcoming"` | Yes | Current status of the stage |
| `completedAt` | `string \| null` | Yes | ISO date string when stage was completed |
| `estimatedDate` | `string \| null` | No | ISO date string for estimated completion (future stages) |
| `order` | `number` | Yes | Order of the stage (1-6) |

### `ProductionStage`

```typescript
type ProductionStage =
  | "awaiting_choice"
  | "design"
  | "production"
  | "quality_check"
  | "packaging"
  | "shipped";
```

## Stage Configuration

Each stage has a predefined configuration:

| Stage | Label (Portuguese) | Emoji | Order |
|-------|-------------------|-------|-------|
| `awaiting_choice` | Aguardando Escolha | ⏳ | 1 |
| `design` | Design | 🎨 | 2 |
| `production` | Produção | 🔨 | 3 |
| `quality_check` | Controle de Qualidade | ✅ | 4 |
| `packaging` | Embalagem | 📦 | 5 |
| `shipped` | Enviado | 🚚 | 6 |

## Visual States

### Completed Stage
- ✅ Green checkmark icon
- Primary color background
- Completion date badge (dd/MM/yyyy format)

### Current Stage
- 🔵 Blue background with pulsing animation
- "Em Progresso" badge with clock icon
- Ring effect for emphasis

### Upcoming Stage
- ⚪ Gray background
- Stage emoji displayed
- Estimated date badge (if available)

## Responsive Behavior

### Desktop/Tablet (≥768px)
- Horizontal timeline layout
- All stages displayed in a single row
- Progress bar connecting stages
- Compact date badges

### Mobile (<768px)
- Vertical timeline layout
- Stages stacked vertically
- Vertical connecting line
- Expanded date information

## Accessibility

- **ARIA Labels**: All emoji icons have proper `aria-label` attributes
- **Semantic HTML**: Uses semantic elements for better screen reader support
- **Color Contrast**: Meets WCAG AA standards for text contrast
- **Keyboard Navigation**: Fully navigable with keyboard (no interactive elements)

## Styling

The component uses Tailwind CSS for styling and follows the application's design system:

- **Colors**: Uses theme colors (primary, secondary, muted)
- **Spacing**: Consistent spacing using Tailwind's spacing scale
- **Typography**: Follows the application's typography scale
- **Animations**: Smooth transitions and pulse animation for current stage

## Integration with CustomerOrderProgressPage

The component is designed to be used within the `CustomerOrderProgressPage`:

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Package className="h-5 w-5" />
      Progresso de Produção
    </CardTitle>
    <CardDescription>
      Estágio atual: {STAGE_CONFIG[orderProgress.currentStage].label}
    </CardDescription>
  </CardHeader>
  <CardContent>
    <ProgressTimeline
      stages={orderProgress.stages}
      currentStage={orderProgress.currentStage}
    />
  </CardContent>
</Card>
```

## Testing

The component includes comprehensive tests covering:

- ✅ Stage display and ordering
- ✅ Completion status indicators
- ✅ Date formatting and display
- ✅ Progress calculation
- ✅ Accessibility features
- ✅ Mobile responsiveness
- ✅ Edge cases (empty stages, missing dates, etc.)

Run tests with:

```bash
npm test src/components/customer/ProgressTimeline.test.tsx
```

## Requirements Mapping

This component satisfies the following requirements:

- **Requirement 2.4.1**: Visual Progress Timeline
  - AC1: Show all production stages with current stage highlighted ✅
  - AC2: Completed stages show checkmark and completion date ✅
  - AC3: Current stage shows progress indicator ✅
  - AC4: Future stages show as inactive/grayed out ✅
  - AC5: Timeline is responsive and works on mobile devices ✅

## Related Components

- `CustomerOrderProgressPage`: Main page that uses this component
- `ProductionStageTracker`: Admin-facing version with stage management controls
- `CharacterChoiceStatus`: Companion component for character selection

## Future Enhancements

Potential improvements for future versions:

1. **Interactive Tooltips**: Show detailed stage information on hover
2. **Stage Photos**: Display production photos for completed stages
3. **Estimated Time**: Show estimated time remaining for current stage
4. **Stage Notes**: Display customer-visible notes from production team
5. **Animation Options**: Configurable animation styles and speeds
6. **Theme Customization**: Support for custom colors and styling

## Support

For questions or issues with this component, please contact the development team or refer to the main project documentation.
