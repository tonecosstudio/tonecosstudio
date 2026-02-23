-- Migration: Create RLS policies for chat_group_attachments
-- Feature: chat-groups-system
-- Task: 1.8 Create RLS policies for chat_group_attachments
-- Requirements: 9.4, 18.4

-- Enable Row Level Security on chat_group_attachments table
ALTER TABLE chat_group_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view attachments for messages in their groups
-- This policy allows members to view attachments only if they are members of the group
-- that contains the message the attachment is linked to
CREATE POLICY "Members can view group attachments"
ON chat_group_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_group_messages m
    JOIN chat_group_members mem ON mem.group_id = m.group_id
    WHERE m.id = chat_group_attachments.message_id
    AND mem.user_id = auth.uid()
  )
);

-- Policy: Only admins can insert attachments
-- This ensures only administrators can upload attachments to group messages
CREATE POLICY "Admins can insert attachments"
ON chat_group_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy: Only admins can delete attachments
-- This ensures only administrators can remove attachments from group messages
CREATE POLICY "Admins can delete attachments"
ON chat_group_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);
