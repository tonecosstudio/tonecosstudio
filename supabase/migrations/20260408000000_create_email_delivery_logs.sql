-- Migration: Email Delivery Logs System
-- Creates table for tracking all email deliveries across the platform

-- Create email_delivery_logs table
CREATE TABLE IF NOT EXISTS email_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN (
    'welcome',
    'choice_reminder',
    'character_revelation',
    'production_started',
    'shipping_notification',
    'balance_reminder',
    'cancellation_notice',
    'payment_confirmation',
    'other'
  )),
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked')),
  provider TEXT CHECK (provider IN ('sendgrid', 'ses', 'smtp')),
  provider_message_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_user 
  ON email_delivery_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_email 
  ON email_delivery_logs(recipient_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_type 
  ON email_delivery_logs(email_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_status 
  ON email_delivery_logs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_provider_message 
  ON email_delivery_logs(provider_message_id) 
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_sent_at 
  ON email_delivery_logs(sent_at DESC) 
  WHERE sent_at IS NOT NULL;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_email_delivery_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_delivery_logs_updated_at
  BEFORE UPDATE ON email_delivery_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_delivery_logs_updated_at();

-- Add comment for documentation
COMMENT ON TABLE email_delivery_logs IS 'Tracks all email deliveries sent by the platform for analytics and debugging';
COMMENT ON COLUMN email_delivery_logs.email_type IS 'Type of email sent (welcome, reminder, revelation, etc.)';
COMMENT ON COLUMN email_delivery_logs.status IS 'Current delivery status (pending, sent, failed, bounced, opened, clicked)';
COMMENT ON COLUMN email_delivery_logs.provider_message_id IS 'Message ID from email provider for webhook tracking';
COMMENT ON COLUMN email_delivery_logs.metadata IS 'Additional data like delivery_id, subscription_id, etc.';

-- Grant necessary permissions
GRANT SELECT ON email_delivery_logs TO authenticated;
GRANT ALL ON email_delivery_logs TO service_role;

-- Enable RLS
ALTER TABLE email_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own email logs
CREATE POLICY "Users can view their own email logs"
  ON email_delivery_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role has full access"
  ON email_delivery_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
