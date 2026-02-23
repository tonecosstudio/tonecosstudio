-- Verificar usuários e criar admin se necessário
-- Execute no SQL Editor do Supabase Dashboard

-- 1. Verificar usuários existentes
SELECT 
    u.id as user_id,
    u.email,
    u.created_at,
    ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 20;

-- 2. Se você não tem role admin, execute isso substituindo SEU_USER_ID pelo seu ID:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('SEU_USER_ID', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
