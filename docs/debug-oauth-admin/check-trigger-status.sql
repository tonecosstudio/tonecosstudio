-- Execute este SQL para verificar o status do trigger

-- 1. Verificar se o trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_profile_sync';

-- 2. Verificar se a função existe
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_user_profile';

-- 3. Verificar permissões na tabela profiles
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'profiles'
AND table_schema = 'public';

-- 4. Verificar se RLS está habilitado
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'profiles'
AND schemaname = 'public';

-- 5. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles';
