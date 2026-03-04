-- ============================================
-- VER EMAIL DO USUÁRIO QUE FEZ LOGIN
-- ============================================
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- Ver o email do usuário que acabou de fazer login
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN last_sign_in_at > NOW() - INTERVAL '5 minutes' THEN '🟢 Acabou de fazer login'
    WHEN last_sign_in_at > NOW() - INTERVAL '1 hour' THEN '🟡 Login recente (última hora)'
    WHEN last_sign_in_at > NOW() - INTERVAL '1 day' THEN '🟠 Login hoje'
    ELSE '🔴 Login antigo'
  END as status
FROM auth.users
WHERE id = '19554ce7-161b-4f3b-ba17-e165ad56b3c0';

-- Ver todos os usuários e seus status de admin
SELECT 
  u.id,
  u.email,
  u.last_sign_in_at,
  CASE 
    WHEN ur.role = 'admin' THEN '✅ É ADMIN'
    ELSE '❌ NÃO é admin'
  END as status_admin,
  ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
ORDER BY u.last_sign_in_at DESC NULLS LAST;

-- Ver apenas os admins
SELECT 
  '=== LISTA DE ADMINS ===' as info;

SELECT 
  u.email,
  u.id,
  u.last_sign_in_at,
  ur.role
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY u.email;
