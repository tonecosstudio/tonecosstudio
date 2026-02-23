-- =====================================================
-- Migration: Create support_attachments table
-- Description: Table for storing file attachments in chat messages
-- =====================================================

CREATE TABLE IF NOT EXISTS support_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  thumbnail_path TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_attachments_message 
ON support_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_support_attachments_uploaded_by 
ON support_attachments(uploaded_by);

-- Add comments
COMMENT ON TABLE support_attachments IS 'Anexos de arquivos (imagens e PDFs) nas mensagens de suporte';
COMMENT ON COLUMN support_attachments.file_name IS 'Nome original do arquivo';
COMMENT ON COLUMN support_attachments.file_path IS 'Caminho do arquivo no Supabase Storage';
COMMENT ON COLUMN support_attachments.file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN support_attachments.file_type IS 'MIME type do arquivo';
COMMENT ON COLUMN support_attachments.thumbnail_path IS 'Caminho do thumbnail (apenas para imagens)';
