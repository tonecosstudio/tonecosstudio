-- Migration: Add rich message fields to chat_group_messages
-- Feature: chat-groups-system
-- Adds support for action buttons and clickable links in messages

-- Add new columns for rich messages
ALTER TABLE chat_group_messages
ADD COLUMN IF NOT EXISTS action_button_text TEXT,
ADD COLUMN IF NOT EXISTS action_button_url TEXT,
ADD COLUMN IF NOT EXISTS link_url TEXT,
ADD COLUMN IF NOT EXISTS link_text TEXT;

-- Add comments
COMMENT ON COLUMN chat_group_messages.action_button_text IS 'Text for action button (e.g., "Comprar Agora")';
COMMENT ON COLUMN chat_group_messages.action_button_url IS 'URL for action button';
COMMENT ON COLUMN chat_group_messages.link_url IS 'Highlighted link URL in message';
COMMENT ON COLUMN chat_group_messages.link_text IS 'Text for highlighted link';

-- Add check constraints for URL format (basic validation)
ALTER TABLE chat_group_messages
ADD CONSTRAINT action_button_url_format CHECK (
  action_button_url IS NULL OR 
  action_button_url ~ '^https?://'
);

ALTER TABLE chat_group_messages
ADD CONSTRAINT link_url_format CHECK (
  link_url IS NULL OR 
  link_url ~ '^https?://'
);

-- Add constraint: if button text exists, URL must exist too
ALTER TABLE chat_group_messages
ADD CONSTRAINT action_button_complete CHECK (
  (action_button_text IS NULL AND action_button_url IS NULL) OR
  (action_button_text IS NOT NULL AND action_button_url IS NOT NULL)
);

-- Add constraint: if link text exists, URL must exist too
ALTER TABLE chat_group_messages
ADD CONSTRAINT link_complete CHECK (
  (link_text IS NULL AND link_url IS NULL) OR
  (link_text IS NOT NULL AND link_url IS NOT NULL)
);
