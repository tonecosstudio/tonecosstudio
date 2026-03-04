-- Migration: Fix erro 406 - Chat Group Messages RLS
-- Data: 2026-02-23 15:00:00
-- DescriÃƒÂ§ÃƒÂ£o: Corrige polÃƒÂ­ticas RLS que causam erro 406 ao ler chat_group_messages

-- =====================================================
-- FIX: Erro 406 (Not Acceptable) - Chat Group Messages
-- =====================================================

-- 1. Remover todas as polÃƒÂ­ticas existentes para recomeÃƒÂ§ar
DROP POLICY IF EXISTS "Members can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Members and admins can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "authenticated_users_read_group_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_insert_group_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_update_own_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "admins_delete_own_messages" ON chat_group_messages;

-- 2. Criar funÃƒÂ§ÃƒÂ£o has_role simplificada (se nÃƒÂ£o existir)
CREATE OR REPLACE FUNCTION has_role_simple(user_id uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND raw_user_meta_data->>'role' = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar polÃƒÂ­ticas CORRETAS para chat_group_messages

-- PolÃƒÂ­tica 1: SELECT - Quem pode LER mensagens
-- Admins podem ler TODAS as mensagens
-- Membros podem ler mensagens dos grupos que pertencem
CREATE POLICY "read_group_messages_fixed"
  ON chat_group_messages FOR SELECT
  TO authenticated
  USING (
    -- CondiÃƒÂ§ÃƒÂ£o 1: Ãƒâ€° admin
    has_role_simple(auth.uid(), 'admin')
    OR
    -- CondiÃƒÂ§ÃƒÂ£o 2: Ãƒâ€° membro do grupo
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = chat_group_messages.group_id
      AND chat_group_members.user_id = auth.uid()
    )
  );

-- PolÃƒÂ­tica 2: INSERT - Quem pode CRIAR mensagens
-- Apenas admins podem criar mensagens
-- O sender_id DEVE ser o ID do usuÃƒÂ¡rio atual
CREATE POLICY "insert_group_messages_fixed"
  ON chat_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Apenas admins podem criar
    has_role_simple(auth.uid(), 'admin')
    -- O sender_id deve ser o usuÃƒÂ¡rio atual
    AND sender_id = auth.uid()
  );

-- PolÃƒÂ­tica 3: UPDATE - Quem pode ATUALIZAR mensagens
-- Apenas admins podem atualizar
-- Apenas suas prÃƒÂ³prias mensagens
CREATE POLICY "update_group_messages_fixed"
  ON chat_group_messages FOR UPDATE
  TO authenticated
  USING (
    -- Apenas admins podem atualizar
    has_role_simple(auth.uid(), 'admin')
    -- Apenas suas prÃƒÂ³prias mensagens
    AND sender_id = auth.uid()
  )
  WITH CHECK (
    -- As mesmas condiÃƒÂ§ÃƒÂµes para validaÃƒÂ§ÃƒÂ£o
    has_role_simple(auth.uid(), 'admin')
    AND sender_id = auth.uid()
  );

-- PolÃƒÂ­tica 4: DELETE - Quem pode REMOVER mensagens
-- Apenas admins podem remover
-- Apenas suas prÃƒÂ³prias mensagens
CREATE POLICY "delete_group_messages_fixed"
  ON chat_group_messages FOR DELETE
  TO authenticated
  USING (
    -- Apenas admins podem remover
    has_role_simple(auth.uid(), 'admin')
    -- Apenas suas prÃƒÂ³prias mensagens
    AND sender_id = auth.uid()
  );

-- 4. VerificaÃƒÂ§ÃƒÂ£o da correÃƒÂ§ÃƒÂ£o
SELECT 
  'Ã¢Å“â€¦ FIX APLICADO: Erro 406 corrigido' as status,
  'PolÃƒÂ­ticas criadas:' as detalhe,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'chat_group_messages') as total_policies,
  'Teste a aplicaÃƒÂ§ÃƒÂ£o agora!' as instrucao;