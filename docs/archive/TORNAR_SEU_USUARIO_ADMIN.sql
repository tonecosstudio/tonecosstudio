-- TORNAR SEU USUÁRIO ADMIN
-- Execute este SQL no Supabase Dashboard
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- 1. Ver seu user_id atual
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. Copie o ID do seu usuário (primeira linha) e cole abaixo substituindo 'SEU_USER_ID'
-- Depois execute esta parte:

-- IMPORTANTE: Substitua 'SEU_USER_ID' pelo ID que apareceu acima!
INSERT INTO public.user_roles (user_id, role)
VALUES ('SEU_USER_ID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Verificar se funcionou
SELECT 
  ur.user_id,
  u.email,
  ur.role
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id;

-- Resultado esperado: Seu email com role 'admin'
