-- Verificar se o usuário atual tem role admin
-- Substitua SEU_USER_ID pelo seu ID do auth.users

SELECT 
    u.id as user_id,
    u.email,
    ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'admin'
ORDER BY u.created_at DESC
LIMIT 10;

-- Se você não tiver role admin, execute:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('SEU_USER_ID', 'admin');
