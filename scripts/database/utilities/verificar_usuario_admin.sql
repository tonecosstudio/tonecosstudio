-- Verificar como o usuário está configurado

-- Ver o usuário atual e seus metadados
SELECT 
  id,
  email,
  raw_user_meta_data,
  raw_user_meta_data->>'role' as role_from_metadata
FROM auth.users
WHERE id = auth.uid();

-- Ver todos os usuários e seus roles
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at;
