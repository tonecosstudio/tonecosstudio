-- ============================================
-- SOLUÇÃO: RESTAURAR ADMIN
-- ============================================
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- IMPORTANTE: Este script assume que o usuário que fez login é:
-- ID: 19554ce7-161b-4f3b-ba17-e165ad56b3c0
-- Se for outro usuário, substitua o UUID abaixo

-- PASSO 1: Verificar o usuário atual
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE id = '19554ce7-161b-4f3b-ba17-e165ad56b3c0';

-- PASSO 2: Verificar se já tem role de admin
SELECT 
  ur.id,
  ur.user_id,
  ur.role,
  u.email
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE ur.user_id = '19554ce7-161b-4f3b-ba17-e165ad56b3c0';

-- PASSO 3: Inserir role de admin (se não existir)
INSERT INTO public.user_roles (user_id, role)
VALUES ('19554ce7-161b-4f3b-ba17-e165ad56b3c0', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- PASSO 4: Verificar se foi inserido corretamente
SELECT 
  ur.id,
  ur.user_id,
  ur.role,
  u.email,
  'Admin restaurado com sucesso!' as status
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE ur.user_id = '19554ce7-161b-4f3b-ba17-e165ad56b3c0';

-- PASSO 5: Testar a função has_role
SELECT 
  public.has_role('19554ce7-161b-4f3b-ba17-e165ad56b3c0'::uuid, 'admin'::app_role) as is_admin,
  CASE 
    WHEN public.has_role('19554ce7-161b-4f3b-ba17-e165ad56b3c0'::uuid, 'admin'::app_role) THEN 'Usuário é admin ✓'
    ELSE 'Usuário NÃO é admin ✗'
  END as resultado;

-- PASSO 6: Listar todos os admins
SELECT 
  '=== TODOS OS ADMINS ===' as info;

SELECT 
  ur.user_id,
  u.email,
  ur.role,
  u.last_sign_in_at
FROM public.user_roles ur
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY u.email;
