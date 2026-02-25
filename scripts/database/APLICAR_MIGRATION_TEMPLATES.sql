-- Execute este SQL no Supabase Studio (SQL Editor)
-- URL: http://127.0.0.1:54323/project/default/sql

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_templates_created_by ON message_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_message_templates_created_at ON message_templates(created_at DESC);

-- RLS Policies
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage templates" ON message_templates;
CREATE POLICY "Admins can manage templates"
  ON message_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_group_id ON scheduled_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_for ON scheduled_messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_created_by ON scheduled_messages(created_by);

-- RLS Policies
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage scheduled messages" ON scheduled_messages;
CREATE POLICY "Admins can manage scheduled messages"
  ON scheduled_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
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
-- 3. FUNCTION TO PROCESS SCHEDULED MESSAGES
-- =====================================================

CREATE OR REPLACE FUNCTION process_scheduled_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  scheduled_msg RECORD;
  member_record RECORD;
  message_id UUID;
BEGIN
  -- Find messages that should be sent now
  FOR scheduled_msg IN
    SELECT *
    FROM scheduled_messages
    WHERE status = 'pending'
    AND scheduled_for <= now()
    ORDER BY scheduled_for ASC
    LIMIT 100
  LOOP
    BEGIN
      -- Insert message to group
      INSERT INTO chat_group_messages (
        group_id,
        sender_id,
        message,
        created_at
      )
      VALUES (
        scheduled_msg.group_id,
        scheduled_msg.created_by,
        scheduled_msg.message,
        now()
      )
      RETURNING id INTO message_id;

      -- Send to all group members
      FOR member_record IN
        SELECT user_id
        FROM chat_group_members
        WHERE group_id = scheduled_msg.group_id
        AND is_active = true
      LOOP
        INSERT INTO chat_messages (
          sender_id,
          receiver_id,
          message,
          is_broadcast,
          broadcast_group_id,
          created_at
        )
        VALUES (
          scheduled_msg.created_by,
          member_record.user_id,
          scheduled_msg.message,
          true,
          scheduled_msg.group_id,
          now()
        );
      END LOOP;

      -- Update scheduled message status
      UPDATE scheduled_messages
      SET
        status = 'sent',
        sent_at = now()
      WHERE id = scheduled_msg.id;

    EXCEPTION WHEN OTHERS THEN
      -- Log error
      UPDATE scheduled_messages
      SET
        status = 'failed',
        error_message = SQLERRM
      WHERE id = scheduled_msg.id;
    END;
  END LOOP;
END;
$$;

-- =====================================================
-- 4. GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON message_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON scheduled_messages TO authenticated;
GRANT EXECUTE ON FUNCTION process_scheduled_messages TO service_role;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se as tabelas foram criadas
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
