-- Testar se a função is_admin está funcionando

-- Ver se a função existe
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  provolatile as volatility
FROM pg_proc 
WHERE proname = 'is_admin';

-- Testar a função com o usuário atual
SELECT 
  auth.uid() as current_user_id,
  is_admin(auth.uid()) as is_admin_result;

-- Ver os metadados do usuário atual
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE id = auth.uid();

-- Testar query direta que a política usa
SELECT 
  id,
  name,
  type,
  is_admin(auth.uid()) as user_is_admin,
  deleted_at IS NULL as not_deleted,
  EXISTS (
    SELECT 1 FROM chat_group_members
    WHERE group_id = chat_groups.id
    AND user_id = auth.uid()
  ) as is_member
FROM chat_groups
WHERE id = '4061faba-c2f2-49ef-afeb-bcac9f9346a2';
