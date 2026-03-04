-- Migration: Add notification preferences to profiles table
-- Task: 6.2.3 Create notification preferences
-- Description: Allow customers to opt-out of non-critical notifications

-- Add notification preference columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
  "production_stage_updates": true,
  "item_shipped": true,
  "item_delivered": true,
  "marketing_emails": true
}'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.profiles.notification_preferences IS 
'Customer notification preferences. Structure:
{
  "production_stage_updates": boolean,  -- Non-critical: Production stage updates
  "item_shipped": boolean,              -- Non-critical: Item shipped notifications
  "item_delivered": boolean,            -- Non-critical: Item delivered notifications
  "marketing_emails": boolean           -- Non-critical: General marketing emails
}

Critical notifications (cannot opt-out):
- Character choice deadline reminders
- Character choice approved/rejected
- Payment-related notifications
- Order status changes (confirmed, cancelled)
- Production delays
';

-- CREATE INDEX IF NOT EXISTS for faster queries on notification preferences
CREATE INDEX IF NOT EXISTS idx_profiles_notification_preferences 
ON public.profiles USING gin (notification_preferences);

-- Function to check if user has opted in for a specific notification type
CREATE OR REPLACE FUNCTION public.should_send_notification(
  user_id uuid,
  notification_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  preferences jsonb;
  is_enabled boolean;
BEGIN
  -- Critical notifications that cannot be opted out
  IF notification_type IN (
    'choice_reminder',
    'choice_approval',
    'choice_rejection',
    'payment_notification',
    'order_confirmed',
    'order_cancelled',
    'delay_notification'
  ) THEN
    RETURN true;
  END IF;

  -- Fetch user preferences
  SELECT notification_preferences INTO preferences
  FROM public.profiles
  WHERE id = user_id;

  -- If no preferences found, default to true (send notification)
  IF preferences IS NULL THEN
    RETURN true;
  END IF;

  -- Check specific preference based on notification type
  CASE notification_type
    WHEN 'stage_update' THEN
      is_enabled := COALESCE((preferences->>'production_stage_updates')::boolean, true);
    WHEN 'item_shipped' THEN
      is_enabled := COALESCE((preferences->>'item_shipped')::boolean, true);
    WHEN 'item_delivered' THEN
      is_enabled := COALESCE((preferences->>'item_delivered')::boolean, true);
    WHEN 'marketing' THEN
      is_enabled := COALESCE((preferences->>'marketing_emails')::boolean, true);
    ELSE
      -- Unknown notification type, default to true
      is_enabled := true;
  END CASE;

  RETURN is_enabled;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.should_send_notification(uuid, text) TO authenticated;

-- Add RLS policy for users to update their own notification preferences
-- (Users can already update their own profile via existing policy)

-- Backfill existing profiles with default preferences
UPDATE public.profiles
SET notification_preferences = '{
  "production_stage_updates": true,
  "item_shipped": true,
  "item_delivered": true,
  "marketing_emails": true
}'::jsonb
WHERE notification_preferences IS NULL;
