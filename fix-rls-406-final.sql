-- =====================================================
-- FIX FINAL: Chat Group Messages RLS - Erro 406
-- =====================================================
-- Corrige o erro 406 (Not Acceptable) ao consultar chat_group_messages
-- Problema: Políticas RLS muito restritivas ou com erros de lógica
-- Solução: Políticas simplificadas e mais permissivas para leitura
-- =====================================================

-- Drop todas as políticas existentes
DROP POLICY IF EXISTS "Admins can read all group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Members can read their group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can send group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can update their messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can delete their messages" ON chat_group_messages;

-- =====================================================
-- SELECT Policies (READ) - SIMPLIFICADAS
-- =====================================================

-- Policy 1: Usuários autenticados podem ler mensagens dos grupos que são membros
CREATE POLICY "authenticated_users_read_group_messages"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    -- Admins podem ler tudo
    has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Membros podem ler mensagens dos seus grupos
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = chat_group_messages.group_id
      AND chat_group_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- INSERT Policies (CREATE)
-- =====================================================

-- Apenas admins podem criar mensagens
CREATE POLICY "admins_insert_group_messages"
  ON chat_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  );

-- =====================================================
-- UPDATE Policies (EDIT)
-- =====================================================

-- Admins podem atualizar suas próprias mensagens
CREATE POLICY "admins_update_own_messages"
  ON chat_group_messages FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  );

-- =====================================================
-- DELETE Policies (REMOVE)
-- =====================================================

-- Admins podem deletar suas próprias mensagens
CREATE POLICY "admins_delete_own_messages"
  ON chat_group_messages FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
  );

-- =====================================================
-- Verificação
-- =====================================================

-- Listar todas as políticas aplicadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd, policyname;
