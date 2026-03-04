# Notification Preferences Component

## Overview

The `NotificationPreferences` component allows customers to manage their notification preferences for the Production Management System. Customers can opt-out of non-critical notifications while critical notifications (character choice reminders, payment updates, order confirmations, and production delays) remain mandatory.

## Features

- **Toggle Preferences**: Enable/disable individual notification types
- **Visual Feedback**: Clear indication of enabled/disabled states with icons
- **Reset to Defaults**: One-click reset to default preferences
- **Real-time Updates**: Immediate persistence to database
- **Info Banner**: Explains which notifications are critical and cannot be disabled
- **Responsive Design**: Works on desktop and mobile devices

## Usage

```tsx
import { NotificationPreferences } from '@/components/customer/NotificationPreferences';

function SettingsPage() {
  return (
    <div>
      <NotificationPreferences 
        onUpdate={(preferences) => {
          console.log('Preferences updated:', preferences);
        }}
      />
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onUpdate` | `(preferences: NotificationPreferences) => void` | No | Callback function called when preferences are updated |

## Notification Types

### Critical Notifications (Cannot Opt-Out)

These notifications contain essential information and cannot be disabled:

1. **Character Choice Reminders** - Deadline reminders for character selection
2. **Character Choice Approved/Rejected** - Status updates on character choices
3. **Payment Notifications** - Payment-related updates
4. **Order Status Changes** - Order confirmed or cancelled
5. **Production Delays** - Notifications about production delays

### Non-Critical Notifications (Can Opt-Out)

Customers can disable these notifications:

1. **Production Stage Updates** - Updates when order moves through production stages (design, production, quality check, packaging)
2. **Shipping Notifications** - Notification when item is shipped with tracking
3. **Delivery Confirmations** - Confirmation when item is delivered
4. **Marketing Emails** - Promotional emails and new collection announcements

## Database Schema

Preferences are stored in the `profiles` table:

```sql
ALTER TABLE public.profiles
ADD COLUMN notification_preferences jsonb DEFAULT '{
  "production_stage_updates": true,
  "item_shipped": true,
  "item_delivered": true,
  "marketing_emails": true
}'::jsonb;
```

## Database Function

The `should_send_notification` function checks if a notification should be sent:

```sql
SELECT should_send_notification(
  'user-uuid',
  'stage_update'
);
```

Returns `true` if notification should be sent, `false` otherwise.

## Service Layer

### Fetch Preferences

```typescript
import { fetchNotificationPreferences } from '@/services/customer/notification-preferences-service';

const preferences = await fetchNotificationPreferences();
```

### Update Preferences

```typescript
import { updateNotificationPreferences } from '@/services/customer/notification-preferences-service';

const updated = await updateNotificationPreferences({
  production_stage_updates: false,
});
```

### Check if Notification Should Be Sent

```typescript
import { shouldSendNotification } from '@/services/customer/notification-preferences-service';

const shouldSend = await shouldSendNotification(userId, 'stage_update');
```

### Reset to Defaults

```typescript
import { resetNotificationPreferences } from '@/services/customer/notification-preferences-service';

const defaults = await resetNotificationPreferences();
```

## Integration with Notification Service

The production notification service automatically checks preferences before sending non-critical notifications:

```typescript
// In production-notification-service.ts
async sendStageUpdate(productionQueueId: string, stage: string): Promise<void> {
  // ... fetch production queue details ...

  // Check if user has opted in for stage updates
  const { data: shouldSend } = await supabase.rpc('should_send_notification', {
    user_id: queueItem.customer_id,
    notification_type: 'stage_update',
  });

  if (!shouldSend) {
    console.log(`User ${queueItem.customer_id} has opted out of stage updates`);
    return;
  }

  // ... send notification ...
}
```

## Styling

The component uses Tailwind CSS for styling and includes:

- Toggle switches with smooth animations
- Color-coded states (blue for enabled, gray for disabled)
- Hover effects for better UX
- Responsive layout
- Accessible focus states

## Accessibility

- **ARIA Labels**: All toggles have descriptive labels
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper role and aria-checked attributes
- **Focus Indicators**: Clear focus states for keyboard users

## Testing

Run tests with:

```bash
npm test NotificationPreferences.test.tsx
```

Test coverage includes:
- Loading states
- Preference toggling
- Reset functionality
- Error handling
- Success messages
- Callback invocation

## Related Files

- **Component**: `src/components/customer/NotificationPreferences.tsx`
- **Tests**: `src/components/customer/NotificationPreferences.test.tsx`
- **Service**: `src/services/customer/notification-preferences-service.ts`
- **Types**: `src/types/notification-preferences.ts`
- **Migration**: `supabase/migrations/20260429000008_add_notification_preferences.sql`

## Requirements

Implements requirements from:
- **Section 2.4.5**: Progress Notifications - AC5: Customers can opt-out of non-critical notifications
- **Section 2.5.3**: Notification System Integration - AC2: Notifications respect user preferences

## Future Enhancements

Potential improvements:
1. Email frequency settings (immediate, daily digest, weekly digest)
2. SMS notification preferences
3. In-app notification preferences
4. Notification history view
5. Quiet hours settings
6. Per-order notification preferences
