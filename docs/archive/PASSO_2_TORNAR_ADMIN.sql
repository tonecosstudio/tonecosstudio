-- PASSO 2: TORNAR washingtonmsdj@gmail.com ADMIN
-- Execute este SQL agora
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

INSERT INTO public.user_roles (user_id, role)
VALUES ('8cdbe271-76da-4f74-ac93-7d92f57ed244', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar se funcionou
SELECT 
  ur.user_id,
  u.email,
  ur.role
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'washingtonmsdj@gmail.com';

-- Resultado esperado:
-- user_id                              | email                    | role
-- -------------------------------------|--------------------------|-------
-- 8cdbe271-76da-4f74-ac93-7d92f57ed244 | washingtonmsdj@gmail.com | admin
