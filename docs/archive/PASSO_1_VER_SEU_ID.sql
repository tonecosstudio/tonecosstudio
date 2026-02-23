-- PASSO 1: VER SEU USER ID
-- Execute APENAS este SQL primeiro
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Copie o ID (primeira coluna) da linha com seu email
-- Depois me mostre o resultado!
