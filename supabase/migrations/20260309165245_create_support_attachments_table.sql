-- =====================================================
-- Migration: Create support_attachments Table
-- Description: Tabela para anexos de mensagens de suporte
-- =====================================================

-- =====================================================
-- SUPPORT_ATTACHMENTS (Anexos de mensagens)
-- =====================================================
CREATE TABLE support_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES support_messages(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  public_url TEXT,
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_support_attachments_message_id ON support_attachments(message_id);
CREATE INDEX idx_support_attachments_uploaded_by ON support_attachments(uploaded_by);
CREATE INDEX idx_support_attachments_created_at ON support_attachments(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE support_attachments ENABLE ROW LEVEL SECURITY;

-- Usuários veem anexos de suas próprias conversas
CREATE POLICY "support_attachments_select_own"
  ON support_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_messages sm
      JOIN support_conversations sc ON sm.conversation_id = sc.id
      WHERE sm.id = support_attachments.message_id
        AND sc.user_id = auth.uid()
    )
  );

-- Admins veem todos os anexos
CREATE POLICY "support_attachments_select_admin"
  ON support_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Usuários podem inserir anexos em suas próprias conversas
CREATE POLICY "support_attachments_insert_own"
  ON support_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_messages sm
      JOIN support_conversations sc ON sm.conversation_id = sc.id
      WHERE sm.id = support_attachments.message_id
        AND sc.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Admins podem inserir qualquer anexo
CREATE POLICY "support_attachments_insert_admin"
  ON support_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Apenas admins podem deletar anexos
CREATE POLICY "support_attachments_delete_admin"
  ON support_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE support_attachments IS 'Anexos de mensagens de suporte';
COMMENT ON COLUMN support_attachments.file_path IS 'Caminho do arquivo no storage';
COMMENT ON COLUMN support_attachments.file_type IS 'MIME type do arquivo';
COMMENT ON COLUMN support_attachments.file_size IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN support_attachments.public_url IS 'URL pública do arquivo';
COMMENT ON COLUMN support_attachments.thumbnail_path IS 'Caminho da thumbnail (para imagens)';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
