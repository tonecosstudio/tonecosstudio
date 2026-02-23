-- Migration: Email Notifications System
-- Creates table for tracking email notifications and trigger for automatic sending

-- Create email_notifications table
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'grouped')),
  grouped_with UUID REFERENCES email_notifications(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_notifications_status 
  ON email_notifications(status, created_at);

CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient 
  ON email_notifications(recipient_user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_email_notifications_conversation 
  ON email_notifications(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_email_notifications_message 
  ON email_notifications(message_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_email_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_notifications_updated_at
  BEFORE UPDATE ON email_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_email_notifications_updated_at();

-- Create trigger function to notify new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_supabase_key TEXT;
  v_recipient_id UUID;
BEGIN
  -- Only trigger for admin messages to customers
  IF NEW.sender_type = 'admin' THEN
    -- Get recipient user_id from conversation
    SELECT user_id INTO v_recipient_id
    FROM support_conversations
    WHERE id = NEW.conversation_id;
    
    -- Get Supabase configuration from environment
    -- Note: These should be set as database settings
    v_supabase_url := current_setting('app.supabase_url', true);
    v_supabase_key := current_setting('app.supabase_anon_key', true);
    
    -- Only proceed if configuration exists
    IF v_supabase_url IS NOT NULL AND v_supabase_key IS NOT NULL THEN
      -- Call Edge Function asynchronously using pg_net extension
      -- This requires pg_net extension to be enabled
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_supabase_key
        ),
        body := jsonb_build_object(
          'conversationId', NEW.conversation_id,
          'messageId', NEW.id,
          'recipientUserId', v_recipient_id,
          'messageContent', NEW.message
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the message insert
    RAISE WARNING 'Failed to trigger email notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on support_messages
DROP TRIGGER IF EXISTS trigger_notify_new_message ON support_messages;

CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Add comment for documentation
COMMENT ON TABLE email_notifications IS 'Tracks email notifications sent for chat messages';
COMMENT ON FUNCTION notify_new_message() IS 'Triggers Edge Function to send email when admin sends message to customer';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON email_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON email_notifications TO service_role;
