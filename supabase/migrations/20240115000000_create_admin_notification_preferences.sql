-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create admin_notification_preferences table for email digest subscriptions
CREATE TABLE IF NOT EXISTS admin_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_digest_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one preference record per user
  UNIQUE(user_id)
);

-- CREATE INDEX IF NOT EXISTS for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_notification_preferences_user_id ON admin_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notification_preferences_email_digest ON admin_notification_preferences(email_digest_enabled) WHERE email_digest_enabled = true;

-- Add RLS policies
ALTER TABLE admin_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON admin_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON admin_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON admin_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_admin_notification_preferences_updated_at
  BEFORE UPDATE ON admin_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE admin_notification_preferences IS 'Stores admin notification preferences for email digests and alerts';
