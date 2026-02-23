-- Verificar usuários e seus roles
SELECT 
    u.id as user_id,
    u.email,
    u.created_at,
    ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 20;
