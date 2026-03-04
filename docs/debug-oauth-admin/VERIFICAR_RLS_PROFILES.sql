-- ============================================
-- VERIFICAR POLÍTICAS RLS DA TABELA PROFILES
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles';

-- 2. Verificar políticas existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 3. Testar se o usuário consegue ler seu próprio profile
SELECT 
  id,
  email,
  created_at
FROM profiles
WHERE id = '19554ce7-161b-4f3b-ba17-e165ad56b3c0';

-- 4. Se não houver políticas ou estiverem bloqueando, criar políticas básicas
-- IMPORTANTE: Execute apenas se necessário

-- Permitir usuários lerem seus próprios profiles
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Permitir usuários atualizarem seus próprios profiles
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Permitir inserção de profiles (para o hook funcionar)
DROP POLICY IF EXISTS "users_insert_own_profile" ON profiles;
CREATE POLICY "users_insert_own_profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Admins podem ver todos os profiles
DROP POLICY IF EXISTS "admins_all_profiles" ON profiles;
CREATE POLICY "admins_all_profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 5. Verificar novamente as políticas
SELECT 
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
