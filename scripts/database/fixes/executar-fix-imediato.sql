-- FIX IMEDIATO PARA ERRO 406 - CHAT GROUP MESSAGES
-- Executado via Supabase CLI

-- 1. Remover políticas conflitantes
DROP POLICY IF EXISTS "Members can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Members and admins can read group messages" ON chat_group_messages;
DROP POLICY IF EXISTS "authenticated_users_read_group_messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON chat_group_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON chat_group_messages;

-- 2. Criar função has_role se não existir
CREATE OR REPLACE FUNCTION has_role(user_id uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND raw_user_meta_data->>'role' = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar política simplificada para SELECT
CREATE POLICY "fix_406_select_policy" ON chat_group_messages
FOR SELECT TO authenticated
USING (
  -- Admins podem ler todas as mensagens
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
  OR
  -- Membros podem ler mensagens dos grupos que pertencem
  EXISTS (
    SELECT 1 FROM chat_group_members
    WHERE chat_group_members.group_id = chat_group_messages.group_id
    AND chat_group_members.user_id = auth.uid()
  )
);

-- 4. Criar política para INSERT (apenas admins)
CREATE POLICY "fix_406_insert_policy" ON chat_group_messages
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
  AND sender_id = auth.uid()
);

-- 5. Criar política para UPDATE (apenas admins, apenas suas mensagens)
CREATE POLICY "fix_406_update_policy" ON chat_group_messages
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
  AND sender_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
  AND sender_id = auth.uid()
);

-- 6. Criar política para DELETE (apenas admins, apenas suas mensagens)
CREATE POLICY "fix_406_delete_policy" ON chat_group_messages
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  )
  AND sender_id = auth.uid()
);

-- 7. Verificar se a política foi aplicada
SELECT 
  'Políticas aplicadas com sucesso!' as status,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'chat_group_messages';