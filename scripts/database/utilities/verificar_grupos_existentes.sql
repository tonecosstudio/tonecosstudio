-- Verificar grupos existentes e usuários
-- Execute no SQL Editor do Supabase

-- 1. Listar grupos existentes
SELECT 
  id,
  name,
  type,
  created_at
FROM chat_groups
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 2. Listar usuários disponíveis (primeiros 10)
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as nome
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar se há membros cadastrados
SELECT COUNT(*) as total_membros FROM chat_group_members;

-- 4. Verificar se há mensagens
SELECT COUNT(*) as total_mensagens FROM chat_group_messages;
