-- Migration: Create chat_group_messages table
-- Feature: chat-groups-system
-- Task: 1.3 Create migration for chat_group_messages table
-- Requirements: 8.1, 8.2, 8.4

-- Create chat_group_messages table
CREATE TABLE IF NOT EXISTS chat_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  
  message TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- CHECK constraint for message length (1-5000 characters)
  CONSTRAINT chat_group_messages_length CHECK (char_length(message) >= 1 AND char_length(message) <= 5000)
);

-- Create indexes for efficient queries
-- Composite index for group messages ordered by creation time (DESC for most recent first)
CREATE INDEX idx_chat_group_messages_group_created ON chat_group_messages(group_id, created_at DESC);

-- Index for sender queries
CREATE INDEX idx_chat_group_messages_sender ON chat_group_messages(sender_id);

-- Add comments for documentation
COMMENT ON TABLE chat_group_messages IS 'Stores broadcast messages sent to groups. Messages are stored ONCE (not per-member) for scalability';
COMMENT ON COLUMN chat_group_messages.message IS 'Message content, limited to 1-5000 characters';
COMMENT ON COLUMN chat_group_messages.sender_id IS 'Admin user who sent the broadcast message';
COMMENT ON COLUMN chat_group_messages.group_id IS 'Group to which the message was broadcast';
