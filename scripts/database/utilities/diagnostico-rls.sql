-- =====================================================
-- DIAGNÓSTICO: Verificar estado atual do RLS
-- =====================================================

-- 1. Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'chat_group_messages';

-- 2. Listar todas as políticas atuais
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd, policyname;

-- 3. Verificar se existem mensagens na tabela
SELECT COUNT(*) as total_messages
FROM chat_group_messages;

-- 4. Verificar se o grupo existe
SELECT id, name, created_at
FROM chat_groups
WHERE id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 5. Verificar membros do grupo
SELECT 
  cgm.id,
  cgm.user_id,
  cgm.group_id,
  cgm.joined_at,
  cgm.last_viewed_at
FROM chat_group_members cgm
WHERE cgm.group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23';

-- 6. Testar query diretamente (como service role, sem RLS)
SELECT created_at
FROM chat_group_messages
WHERE group_id = '95b093fe-083d-4b64-9a67-8d3b281dcd23'
ORDER BY created_at DESC
LIMIT 1;

-- 7. Verificar função has_role
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'has_role';
