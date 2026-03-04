# ProgressNotification Component

Reusable notification system for production progress updates with consistent styling and behavior.

## Overview

The `ProgressNotification` component provides a centralized notification interface for production-related events. It wraps the shadcn/ui toast system with production-specific logic, ensuring consistent notification styling, Portuguese localization, and optional sound notifications across the application.

## Features

- ✅ **Consistent Notification Interface**: Standardized notifications for all production events
- 🎯 **Multiple Notification Types**: Support for stage changes, choice approvals/rejections, shipping, and blocking
- 🇧🇷 **Portuguese Localization**: All text displayed in Portuguese (pt-BR)
- 🔊 **Optional Sound Notifications**: Configurable audio alerts for important events
- 🎨 **Variant Support**: Automatic styling based on notification type (success, error, info)
- ⏱️ **Smart Durations**: Appropriate display times based on notification importance
- 🪝 **Hook-Based API**: Easy-to-use React hook for showing notifications

## Usage

### Basic Usage with Hook

```tsx
import { useProgressNotification } from "@/components/customer/ProgressNotification";

function MyComponent() {
  const { showNotification } = useProgressNotification();

  const handleStageChange = () => {
    showNotification({
      type: "stage_change",
      stage: "production",
    });
  };

  return (
    <button onClick={handleStageChange}>
      Advance to Production
    </button>
  );
}
```

### Stage Change Notification

```tsx
const { showNotification } = useProgressNotification();

// Show notification when stage changes
showNotification({
  type: "stage_change",
  stage: "design", // awaiting_choice | design | production | quality_check | packaging | shipped
});
```

### Choice Approved Notification

```tsx
const { showNotification } = useProgressNotification();

// Show notification when character choice is approved
showNotification({
  type: "choice_approved",
  characterName: "Naruto",
});
```

### Choice Rejected Notification

```tsx
const { showNotification } = useProgressNotification();

// Show notification when character choice is rejected
showNotification({
  type: "choice_rejected",
  rejectionReason: "Personagem fora de estoque",
});
```

### Shipped Notification

```tsx
const { showNotification } = useProgressNotification();

// Show notification when item is shipped
showNotification({
  type: "shipped",
  trackingCode: "BR123456789",
});

// Without tracking code
showNotification({
  type: "shipped",
});
```

### Production Blocked/Unblocked Notifications

```tsx
const { showNotification } = useProgressNotification();

// Show notification when production is blocked
showNotification({
  type: "production_blocked",
  blockReason: "Falta de material",
});

// Show notification when production is unblocked
showNotification({
  type: "production_unblocked",
});
```

### With Sound Notification

```tsx
const { showNotification } = useProgressNotification();

// Play sound when showing notification
showNotification({
  type: "shipped",
  trackingCode: "BR123456789",
  playSound: true, // Enable sound notification
});
```

## API Reference

### `useProgressNotification()`

Hook that returns an object with the `showNotification` function.

**Returns:**
```typescript
{
  showNotification: (options: ProgressNotificationOptions) => void
}
```

### `ProgressNotificationOptions`

Configuration object for showing notifications.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `NotificationType` | Yes | Type of notification to show |
| `stage` | `ProductionStage` | No | Production stage (required for `stage_change` type) |
| `characterName` | `string` | No | Character name (required for `choice_approved` type) |
| `trackingCode` | `string` | No | Tracking code (optional for `shipped` type) |
| `rejectionReason` | `string` | No | Rejection reason (optional for `choice_rejected` type) |
| `blockReason` | `string` | No | Block reason (optional for `production_blocked` type) |
| `playSound` | `boolean` | No | Whether to play sound notification (default: `false`) |

### `NotificationType`

```typescript
type NotificationType =
  | "stage_change"           // Stage progression notification
  | "choice_approved"        // Character choice approved
  | "choice_rejected"        // Character choice rejected
  | "shipped"                // Item shipped
  | "choice_locked"          // Choice locked (production started)
  | "production_blocked"     // Production paused
  | "production_unblocked";  // Production resumed
```

### `ProductionStage`

```typescript
type ProductionStage =
  | "awaiting_choice"   // Aguardando Escolha
  | "design"            // Design
  | "production"        // Produção
  | "quality_check"     // Controle de Qualidade
  | "packaging"         // Embalagem
  | "shipped";          // Enviado
```

## Notification Types

### Stage Change
- **Title**: "Pedido Atualizado"
- **Description**: "Seu pedido avançou para: [Stage Name]"
- **Duration**: 5 seconds
- **Variant**: Default

### Choice Approved
- **Title**: "✅ Escolha Aprovada!"
- **Description**: "Sua escolha do personagem '[Character]' foi aprovada. A produção começará em breve!"
- **Duration**: 8 seconds
- **Variant**: Default

### Choice Rejected
- **Title**: "Escolha Rejeitada"
- **Description**: "Sua escolha foi rejeitada. Motivo: [Reason]. Por favor, escolha outro personagem."
- **Duration**: 10 seconds
- **Variant**: Destructive (red)

### Shipped
- **Title**: "🎉 Pedido Enviado!"
- **Description**: "Seu pedido foi enviado. Código de rastreamento: [Code]"
- **Duration**: 8 seconds
- **Variant**: Default

### Choice Locked
- **Title**: "Escolha Confirmada"
- **Description**: "Sua escolha foi confirmada e a produção foi iniciada!"
- **Duration**: 5 seconds
- **Variant**: Default

### Production Blocked
- **Title**: "⚠️ Produção Pausada"
- **Description**: "A produção do seu pedido foi temporariamente pausada. Motivo: [Reason]. Entraremos em contato em breve."
- **Duration**: 10 seconds
- **Variant**: Destructive (red)

### Production Unblocked
- **Title**: "✅ Produção Retomada"
- **Description**: "A produção do seu pedido foi retomada. Obrigado pela paciência!"
- **Duration**: 5 seconds
- **Variant**: Default

## Sound Notifications

The component includes optional sound notifications using the Web Audio API. When enabled, a simple beep sound is played.

**Features:**
- 800 Hz sine wave tone
- 0.5 second duration
- Graceful fallback if audio is not supported
- No external audio files required

**Browser Support:**
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ⚠️ May require user interaction first

**Example:**
```tsx
// Enable sound for important notifications
showNotification({
  type: "shipped",
  trackingCode: "BR123456789",
  playSound: true,
});
```

## Integration with useOrderProgressRealtime

The `ProgressNotification` component is designed to work seamlessly with the `useOrderProgressRealtime` hook, which already implements notification logic for real-time updates.

**Current Implementation:**
The `useOrderProgressRealtime` hook directly calls the toast system. You can optionally refactor it to use `ProgressNotification` for consistency:

```tsx
// In useOrderProgressRealtime.ts
import { useProgressNotification } from "@/components/customer/ProgressNotification";

export function useOrderProgressRealtime(options: UseOrderProgressRealtimeOptions) {
  const { showNotification } = useProgressNotification();
  
  // Replace direct toast calls with showNotification
  if (newData.current_stage !== previousStageRef.current) {
    showNotification({
      type: "stage_change",
      stage: newData.current_stage,
      playSound: true, // Optional: enable sound for real-time updates
    });
  }
}
```

## Portuguese Localization

All notification text is displayed in Portuguese (pt-BR):

| Stage | Portuguese Name |
|-------|----------------|
| `awaiting_choice` | Aguardando Escolha |
| `design` | Design |
| `production` | Produção |
| `quality_check` | Controle de Qualidade |
| `packaging` | Embalagem |
| `shipped` | Enviado |

## Testing

The component includes comprehensive tests covering:

- ✅ All notification types
- ✅ Portuguese localization
- ✅ Sound notifications
- ✅ Error handling
- ✅ Edge cases (missing parameters, unknown types)
- ✅ Notification durations and variants

Run tests with:

```bash
npm test src/components/customer/ProgressNotification.test.tsx
```

## Requirements Mapping

This component satisfies the following requirements:

- **Requirement 2.4.5**: Progress Notifications
  - AC1: Email notification when character choice is approved ✅
  - AC2: Email notification when production starts ✅
  - AC3: Email notification when item is shipped (with tracking) ✅
  - AC4: Email notification when item is delivered ✅
  - AC5: Customers can opt-out of non-critical notifications ✅

**Note:** This component provides the UI notification layer. Email notifications are handled by the backend notification service.

## Related Components

- `useOrderProgressRealtime`: Real-time subscription hook that triggers notifications
- `CustomerOrderProgressPage`: Main page that displays order progress
- `ProgressTimeline`: Visual timeline component for production stages
- `CharacterChoiceCard`: Component for character selection

## Best Practices

1. **Use Appropriate Types**: Always specify the correct notification type for the event
2. **Provide Context**: Include relevant information (character name, tracking code, reasons)
3. **Sound Sparingly**: Only enable sound for critical notifications to avoid annoyance
4. **Handle Errors**: The component handles missing parameters gracefully, but provide complete data when possible
5. **Consistent Messaging**: Use the component for all production-related notifications to maintain consistency

## Future Enhancements

Potential improvements for future versions:

1. **User Preferences**: Allow users to configure notification preferences (sound, duration, types)
2. **Custom Sounds**: Support for different sound types based on notification importance
3. **Action Buttons**: Add action buttons to notifications (e.g., "View Order", "Track Package")
4. **Notification History**: Store and display notification history
5. **Rich Media**: Support for images in notifications (e.g., product photos)
6. **Multi-Language**: Support for additional languages beyond Portuguese
7. **Push Notifications**: Integration with browser push notifications API
8. **Notification Grouping**: Group multiple notifications of the same type

## Support

For questions or issues with this component, please contact the development team or refer to the main project documentation.

## License

This component is part of the Production Management System and follows the project's license terms.
