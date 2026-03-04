-- ============================================
-- VERIFICAR E RESTAURAR ADMIN
-- ============================================
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- 1. Verificar todos os usuários cadastrados
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at;

-- 2. Verificar roles existentes na tabela user_roles
SELECT 
  ur.id,
  ur.user_id,
  ur.role,
  u.email
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
ORDER BY ur.role;

-- 3. Verificar se a função has_role está funcionando
-- (Substitua o UUID pelo ID do usuário que deveria ser admin)
SELECT public.has_role('19554ce7-161b-4f3b-ba17-e165ad56b3c0'::uuid, 'admin'::app_role) as is_admin;

-- ============================================
-- RESTAURAR ADMIN (execute apenas se necessário)
-- ============================================

-- 4. Inserir role de admin para o usuário atual
-- IMPORTANTE: Substitua o UUID pelo ID correto do usuário admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('19554ce7-161b-4f3b-ba17-e165ad56b3c0', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Verificar se foi inserido corretamente
SELECT 
  ur.id,
  ur.user_id,
  ur.role,
  u.email
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE ur.user_id = '19554ce7-161b-4f3b-ba17-e165ad56b3c0';
