# Alert Notification System

This directory contains the alert notification system for the production management dashboard. The system provides real-time notifications for critical production alerts through multiple channels.

## Features

### 1. Browser Notifications
- Real-time desktop notifications for critical alerts
- Requires user permission (requested on first use)
- Notifications persist until user interaction
- Clicking notification focuses the production dashboard

### 2. Sound Notifications
- Optional audio alerts for new critical items
- Different sounds for different severity levels:
  - **Critical**: High-pitched urgent sound (1000 Hz, double beep)
  - **Warning**: Medium-pitched warning sound (800 Hz)
  - **Info**: Low-pitched info sound (600 Hz)
- User can enable/disable in preferences

### 3. Email Digest
- Daily summary of all alerts sent to subscribed admins
- Includes counts for all alert types
- Production statistics (total items, scheduled today)
- Sent via Supabase Edge Function
- Users can subscribe/unsubscribe via preferences

## Alert Types

The system monitors four types of urgent alerts:

1. **Critical Deadline** (< 24h) - Red badge
2. **Pending Choices** - Yellow badge
3. **Blocked Items** - Blue badge
4. **Overdue Items** - Orange badge

## Usage

### In Components

```typescript
import {
  requestNotificationPermission,
  canShowNotifications,
  notifyCriticalDeadline,
  playAlertSound,
  getNotificationPreferences,
  saveNotificationPreferences,
} from "@/services/notifications/alert-notification-service";

// Request permission
const granted = await requestNotificationPermission();

// Check if notifications are enabled
if (canShowNotifications()) {
  notifyCriticalDeadline(5); // 5 items with critical deadline
}

// Play sound
playAlertSound("critical");

// Get/save preferences
const prefs = getNotificationPreferences();
saveNotificationPreferences({
  browserNotifications: true,
  soundNotifications: false,
  emailDigest: true,
});
```

### Automatic Monitoring

The `UrgentAlertsBar` component automatically monitors production metrics and triggers notifications when alert counts increase:

```typescript
import { checkAndNotifyAlerts } from "@/services/notifications/alert-notification-service";

// In useEffect when metrics change
useEffect(() => {
  if (metrics && previousMetrics) {
    const preferences = getNotificationPreferences();
    checkAndNotifyAlerts(metrics, previousMetrics, preferences);
  }
}, [metrics]);
```

## User Preferences

Users can configure their notification preferences through the `NotificationPreferences` component:

- **Browser Notifications**: Enable/disable desktop notifications
- **Sound Notifications**: Enable/disable audio alerts
- **Email Digest**: Subscribe/unsubscribe from daily email summaries

Preferences are stored in localStorage and persist across sessions.

## Email Digest

The email digest is sent daily via a Supabase Edge Function (`send-alert-digest`). To set up:

1. Deploy the Edge Function:
   ```bash
   supabase functions deploy send-alert-digest
   ```

2. Set up a cron job to call the function daily:
   ```sql
   -- Using pg_cron extension
   SELECT cron.schedule(
     'send-daily-alert-digest',
     '0 8 * * *', -- 8 AM daily
     $$
     SELECT net.http_post(
       url := 'https://your-project.supabase.co/functions/v1/send-alert-digest',
       headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
       body := '{"type": "daily"}'::jsonb
     );
     $$
   );
   ```

3. Configure environment variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key
   - `SITE_URL`: Your application URL (for email links)

## Database Schema

The system uses the `admin_notification_preferences` table to store email digest subscriptions:

```sql
CREATE TABLE admin_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  email_digest_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Testing

Run tests with:

```bash
npm test -- src/services/notifications/alert-notification-service.test.ts
npm test -- src/components/production/NotificationPreferences.test.tsx
```

## Browser Compatibility

- **Browser Notifications**: Supported in all modern browsers (Chrome, Firefox, Safari, Edge)
- **Sound Notifications**: Uses Web Audio API (supported in all modern browsers)
- **Notification Permission**: Must be requested after user interaction (button click)

## Security Considerations

- Notification permission is requested explicitly by user action
- Email addresses are stored securely in the database
- Service role key is used only in Edge Functions (server-side)
- RLS policies ensure users can only manage their own preferences

## Future Enhancements

- Push notifications for mobile devices
- Customizable notification sounds
- Notification history/log
- Snooze functionality for alerts
- Integration with Slack/Teams for team notifications
