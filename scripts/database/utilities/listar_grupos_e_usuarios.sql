-- Listar grupos e usuários para popular dados de teste
-- Execute no SQL Editor do Supabase

-- 1. Grupos existentes
SELECT 
  id,
  name,
  type
FROM chat_groups
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- 2. Usuários disponíveis
SELECT 
  id,
  email
FROM auth.users
ORDER BY created_at DESC;
