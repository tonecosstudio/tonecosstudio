-- Habilitar Realtime para tabelas de suporte
-- Migration: 20260222000001_enable_realtime_support_tables.sql

-- Habilitar Realtime para support_messages
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- Habilitar Realtime para support_attachments
ALTER PUBLICATION supabase_realtime ADD TABLE support_attachments;

-- Habilitar Realtime para support_conversations (se ainda não estiver)
ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;
