-- Execute este SQL no Supabase Studio para corrigir as políticas RLS
-- URL: http://127.0.0.1:54323/project/default/sql (LOCAL)
-- OU na URL de produção se estiver usando produção

-- =====================================================
-- FIX: Políticas RLS para message_templates
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage templates" ON message_templates;
DROP POLICY IF EXISTS "Users can view own templates" ON message_templates;

-- Política 1: Usuários autenticados podem ver todos os templates
CREATE POLICY "Authenticated users can view templates"
  ON message_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Política 2: Usuários autenticados podem criar templates
CREATE POLICY "Authenticated users can create templates"
  ON message_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Política 3: Usuários podem atualizar seus próprios templates
CREATE POLICY "Users can update own templates"
  ON message_templates
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Política 4: Usuários podem deletar seus próprios templates
CREATE POLICY "Users can delete own templates"
  ON message_templates
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Política 5: Admins podem fazer tudo
CREATE POLICY "Admins have full access to templates"
  ON message_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- =====================================================
-- FIX: Políticas RLS para scheduled_messages
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Admins can manage scheduled messages" ON scheduled_messages;
DROP POLICY IF EXISTS "Users can view scheduled messages" ON scheduled_messages;

-- Política 1: Usuários autenticados podem ver mensagens agendadas
CREATE POLICY "Authenticated users can view scheduled messages"
  ON scheduled_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Política 2: Usuários autenticados podem criar mensagens agendadas
CREATE POLICY "Authenticated users can create scheduled messages"
  ON scheduled_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Política 3: Usuários podem atualizar suas próprias mensagens agendadas
CREATE POLICY "Users can update own scheduled messages"
  ON scheduled_messages
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Política 4: Admins podem fazer tudo
CREATE POLICY "Admins have full access to scheduled messages"
  ON scheduled_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('message_templates', 'scheduled_messages')
ORDER BY tablename, policyname;

-- Resultado esperado: 9 políticas (5 para message_templates, 4 para scheduled_messages)
