-- Execute este SQL no Supabase Studio
-- URL: http://127.0.0.1:54323/project/default/sql
-- Copie e cole todo este conteúdo e clique em "Run"

-- =====================================================
-- 1. MESSAGE TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT message_templates_name_check CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  CONSTRAINT message_templates_content_check CHECK (char_length(content) >= 1 AND char_length(content) <= 5000)
);

CREATE INDEX IF NOT EXISTS idx_message_templates_created_by ON message_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_message_templates_created_at ON message_templates(created_at DESC);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage templates" ON message_templates;
CREATE POLICY "Admins can manage templates"
  ON message_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "Users can view own templates" ON message_templates;
CREATE POLICY "Users can view own templates"
  ON message_templates
  FOR SELECT
  USING (created_by = auth.uid());

-- =====================================================
-- 2. SCHEDULED MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  
  CONSTRAINT scheduled_messages_message_check CHECK (char_length(message) >= 1 AND char_length(message) <= 5000),
  CONSTRAINT scheduled_messages_scheduled_for_check CHECK (scheduled_for > created_at)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_group_id ON scheduled_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_for ON scheduled_messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_created_by ON scheduled_messages(created_by);

ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage scheduled messages" ON scheduled_messages;
CREATE POLICY "Admins can manage scheduled messages"
  ON scheduled_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

DROP POLICY IF EXISTS "Users can view scheduled messages" ON scheduled_messages;
CREATE POLICY "Users can view scheduled messages"
  ON scheduled_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = scheduled_messages.group_id
      AND chat_group_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON message_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON scheduled_messages TO authenticated;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

SELECT 
  'message_templates' as table_name,
  COUNT(*) as exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'message_templates'
UNION ALL
SELECT 
  'scheduled_messages' as table_name,
  COUNT(*) as exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'scheduled_messages';

-- Resultado esperado:
-- message_templates    | 1
-- scheduled_messages   | 1
