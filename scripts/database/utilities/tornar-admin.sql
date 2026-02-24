-- Tornar seu usuário admin

-- Passo 1: Ver seu ID de usuário
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC
LIMIT 5;

-- Passo 2: Copie o ID do seu usuário e substitua abaixo
-- Substitua 'SEU_USER_ID_AQUI' pelo ID que apareceu acima

-- Inserir role de admin (substitua o ID)
INSERT INTO user_roles (user_id, role)
VALUES ('SEU_USER_ID_AQUI', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Passo 3: Verificar se funcionou
SELECT 
  u.id,
  u.email,
  ur.role
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'seu@email.com';  -- Substitua pelo seu email
