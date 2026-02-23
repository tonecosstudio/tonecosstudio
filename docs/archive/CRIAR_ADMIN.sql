-- VERIFICAR E CRIAR ROLE ADMIN
-- Execute no SQL Editor do Supabase Dashboard

-- 1. Verificar seu user_id (substitua pelo seu email se necessário)
SELECT 
    u.id as user_id,
    u.email,
    u.created_at,
    ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 20;

-- 2. Após identificar seu user_id, execute isto substituindo SEU_USER_ID:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('SEU_USER_ID', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Verificar se foi criado corretamente:
-- SELECT * FROM public.user_roles WHERE role = 'admin';
