-- Migration: Create chat_group_attachments table
-- Feature: chat-groups-system
-- Task: 1.4 Create migration for chat_group_attachments table
-- Requirements: 9.1, 9.2

-- Create chat_group_attachments table
CREATE TABLE IF NOT EXISTS chat_group_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_group_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  thumbnail_path TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
-- Index for message attachments lookup
CREATE INDEX IF NOT EXISTS idx_chat_group_attachments_message ON chat_group_attachments(message_id);

-- Index for uploaded_by queries
CREATE INDEX IF NOT EXISTS idx_chat_group_attachments_uploaded_by ON chat_group_attachments(uploaded_by);

-- Add comments for documentation
COMMENT ON TABLE chat_group_attachments IS 'Stores file attachments for group broadcast messages. Reuses existing attachment system infrastructure';
COMMENT ON COLUMN chat_group_attachments.file_name IS 'Original file name';
COMMENT ON COLUMN chat_group_attachments.file_path IS 'File path in Supabase Storage';
COMMENT ON COLUMN chat_group_attachments.file_size IS 'File size in bytes';
COMMENT ON COLUMN chat_group_attachments.file_type IS 'MIME type of the file';
COMMENT ON COLUMN chat_group_attachments.thumbnail_path IS 'Thumbnail path (for images only)';
COMMENT ON COLUMN chat_group_attachments.uploaded_by IS 'Admin user who uploaded the attachment';
COMMENT ON COLUMN chat_group_attachments.message_id IS 'Group message to which this attachment belongs';
