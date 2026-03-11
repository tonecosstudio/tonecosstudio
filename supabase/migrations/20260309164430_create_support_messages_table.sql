-- =====================================================
-- Migration: Create support_messages Table
-- Description: Tabela para mensagens de conversas de suporte
-- =====================================================

-- =====================================================
-- SUPPORT_MESSAGES (Mensagens de suporte)
-- =====================================================
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES support_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT DEFAULT 'customer' NOT NULL CHECK (sender_type IN ('admin', 'customer', 'system')),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false NOT NULL,
  read_by_admin BOOLEAN DEFAULT false NOT NULL,
  read_by_customer BOOLEAN DEFAULT false NOT NULL,
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_support_messages_conversation_id ON support_messages(conversation_id);
CREATE INDEX idx_support_messages_sender_id ON support_messages(sender_id);
CREATE INDEX idx_support_messages_sender_type ON support_messages(sender_type);
CREATE INDEX idx_support_messages_is_internal ON support_messages(is_internal);
CREATE INDEX idx_support_messages_read_by_admin ON support_messages(read_by_admin) WHERE read_by_admin = false;
CREATE INDEX idx_support_messages_read_by_customer ON support_messages(read_by_customer) WHERE read_by_customer = false;
CREATE INDEX idx_support_messages_created_at ON support_messages(created_at DESC);
CREATE INDEX idx_support_messages_deleted_at ON support_messages(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Usuários veem mensagens de suas próprias conversas (exceto internas)
CREATE POLICY "support_messages_select_own"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE id = support_messages.conversation_id
        AND user_id = auth.uid()
    )
    AND is_internal = false
    AND deleted_at IS NULL
  );

-- Admins veem todas as mensagens (incluindo internas)
CREATE POLICY "support_messages_select_admin"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    AND deleted_at IS NULL
  );

-- Usuários podem inserir mensagens em suas próprias conversas
CREATE POLICY "support_messages_insert_own"
  ON support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE id = support_messages.conversation_id
        AND user_id = auth.uid()
    )
    AND sender_id = auth.uid()
    AND sender_type = 'customer'
    AND is_internal = false
  );

-- Admins podem inserir qualquer mensagem
CREATE POLICY "support_messages_insert_admin"
  ON support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Usuários podem atualizar read_by_customer de suas mensagens
CREATE POLICY "support_messages_update_own"
  ON support_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE id = support_messages.conversation_id
        AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE id = support_messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- Admins podem atualizar qualquer mensagem
CREATE POLICY "support_messages_update_admin"
  ON support_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Apenas admins podem deletar (soft delete)
CREATE POLICY "support_messages_delete_admin"
  ON support_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TRIGGER
-- =====================================================

CREATE TRIGGER set_updated_at_support_messages
  BEFORE UPDATE ON support_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar last_message_at na conversa
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE support_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON support_messages
  FOR EACH ROW
  WHEN (NEW.is_internal = false)
  EXECUTE FUNCTION update_conversation_last_message();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE support_messages IS 'Mensagens de conversas de suporte';
COMMENT ON COLUMN support_messages.sender_type IS 'Tipo do remetente: admin, customer, system';
COMMENT ON COLUMN support_messages.is_internal IS 'Mensagem interna (visível apenas para admins)';
COMMENT ON COLUMN support_messages.read_by_admin IS 'Indica se foi lida por um admin';
COMMENT ON COLUMN support_messages.read_by_customer IS 'Indica se foi lida pelo cliente';
COMMENT ON COLUMN support_messages.read_at IS 'Timestamp de leitura';
COMMENT ON COLUMN support_messages.deleted_at IS 'Timestamp de soft delete';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
