-- =====================================================
-- Migration: Update support_messages table
-- Description: Add missing fields for advanced chat system
-- =====================================================

-- Add is_internal field (if not exists)
ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

-- Add read tracking fields
ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS read_by_admin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS read_by_customer BOOLEAN NOT NULL DEFAULT false;

-- Add edited_at field
ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add sender_type field (if not exists)
ALTER TABLE support_messages 
ADD COLUMN IF NOT EXISTS sender_type TEXT NOT NULL DEFAULT 'customer' 
CHECK (sender_type IN ('admin', 'customer', 'system'));

-- Create indexes for unread messages (partial indexes for performance)
CREATE INDEX IF NOT EXISTS idx_support_messages_unread_admin 
ON support_messages(conversation_id) 
WHERE is_internal = false AND read_by_admin = false;

CREATE INDEX IF NOT EXISTS idx_support_messages_unread_customer 
ON support_messages(conversation_id) 
WHERE is_internal = false AND read_by_customer = false;

-- Add comments
COMMENT ON COLUMN support_messages.is_internal IS 'Notas internas visíveis apenas para admins';
COMMENT ON COLUMN support_messages.read_by_admin IS 'Indica se a mensagem foi lida por um admin';
COMMENT ON COLUMN support_messages.read_by_customer IS 'Indica se a mensagem foi lida pelo cliente';
COMMENT ON COLUMN support_messages.edited_at IS 'Data/hora da última edição (apenas para notas internas)';
COMMENT ON COLUMN support_messages.sender_type IS 'Tipo do remetente: admin | customer | system (mensagens automáticas)';
