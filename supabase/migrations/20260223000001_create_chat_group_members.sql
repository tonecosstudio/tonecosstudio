-- Migration: Create chat_group_members table
-- Feature: chat-groups-system
-- Task: 1.2 Create migration for chat_group_members table
-- Requirements: 2.1, 12.1

-- Create chat_group_members table
CREATE TABLE IF NOT EXISTS chat_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- View tracking for unread counter
  -- NULL means user has never viewed the group
  last_viewed_at TIMESTAMPTZ,
  
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate memberships
  CONSTRAINT chat_group_members_unique UNIQUE (group_id, user_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_chat_group_members_group ON chat_group_members(group_id);
CREATE INDEX idx_chat_group_members_user ON chat_group_members(user_id);
CREATE INDEX idx_chat_group_members_last_viewed ON chat_group_members(group_id, last_viewed_at);

-- Add comment for documentation
COMMENT ON TABLE chat_group_members IS 'Stores group membership and view tracking for unread counter calculation';
COMMENT ON COLUMN chat_group_members.last_viewed_at IS 'Timestamp of last group view by member, used to calculate unread count';
COMMENT ON COLUMN chat_group_members.joined_at IS 'Timestamp when member joined the group';
