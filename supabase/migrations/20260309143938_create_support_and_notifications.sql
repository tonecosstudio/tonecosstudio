-- =====================================================
-- Migration: Create Support and Notifications
-- Description: Sistema de suporte ao cliente e notificações
-- =====================================================

-- =====================================================
-- SUPPORT_CONVERSATIONS (Conversas de suporte)
-- =====================================================
CREATE TABLE support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_support_conversations_user_id ON support_conversations(user_id);
CREATE INDEX idx_support_conversations_status ON support_conversations(status);

-- =====================================================
-- CHAT_GROUPS (Grupos de chat)
-- =====================================================
CREATE TABLE chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- ADMIN_NOTIFICATIONS (Notificações para admins)
-- =====================================================
CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Support Conversations: Usuários veem suas próprias
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_conversations_select_own"
  ON support_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "support_conversations_select_admin"
  ON support_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "support_conversations_insert_own"
  ON support_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "support_conversations_modify_admin"
  ON support_conversations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Chat Groups: Todos podem ver
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_groups_select_all"
  ON chat_groups FOR SELECT
  USING (true);

CREATE POLICY "chat_groups_modify_admin"
  ON chat_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Admin Notifications: Apenas admins
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_notifications_select_admin"
  ON admin_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "admin_notifications_modify_admin"
  ON admin_notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER set_updated_at_support_conversations
  BEFORE UPDATE ON support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_chat_groups
  BEFORE UPDATE ON chat_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_admin_notifications
  BEFORE UPDATE ON admin_notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE support_conversations IS 'Conversas de suporte entre usuários e admins';
COMMENT ON TABLE chat_groups IS 'Grupos de chat para comunicação';
COMMENT ON TABLE admin_notifications IS 'Notificações para administradores do sistema';
