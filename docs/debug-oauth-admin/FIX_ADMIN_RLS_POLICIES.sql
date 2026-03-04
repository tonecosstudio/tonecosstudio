-- ============================================
-- FIX: Políticas RLS para Admin Ver Todos os Dados
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- PROBLEMA: Admin não consegue ver todos os usuários/pedidos
-- CAUSA: Políticas RLS podem estar bloqueando visualização
-- SOLUÇÃO: Adicionar políticas que permitem admin ver tudo

-- 1. Profiles - Admin pode ver todos
DROP POLICY IF EXISTS "admins_select_all_profiles" ON profiles;
CREATE POLICY "admins_select_all_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 2. Subscriptions - Admin pode ver todas
DROP POLICY IF EXISTS "admins_select_all_subscriptions" ON subscriptions;
CREATE POLICY "admins_select_all_subscriptions"
ON subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 3. Standalone Purchases - Admin pode ver todas
DROP POLICY IF EXISTS "admins_select_all_standalone" ON standalone_purchases;
CREATE POLICY "admins_select_all_standalone"
ON standalone_purchases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 4. Quotes - Admin pode ver todos
DROP POLICY IF EXISTS "admins_select_all_quotes" ON quotes;
CREATE POLICY "admins_select_all_quotes"
ON quotes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 5. User Roles - Admin pode ver todos
DROP POLICY IF EXISTS "admins_select_all_roles" ON user_roles;
CREATE POLICY "admins_select_all_roles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Verificar políticas criadas
SELECT 
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE policyname LIKE 'admins_select_all_%'
ORDER BY tablename, policyname;

-- Testar se admin consegue ver dados
SELECT 
  '=== TESTE: Admin consegue ver profiles? ===' as info;

SELECT COUNT(*) as total_profiles_visiveis FROM profiles;

SELECT 
  '=== TESTE: Admin consegue ver subscriptions? ===' as info;

SELECT COUNT(*) as total_subscriptions_visiveis FROM subscriptions;

SELECT 
  '=== TESTE: Admin consegue ver standalone_purchases? ===' as info;

SELECT COUNT(*) as total_standalone_visiveis FROM standalone_purchases;
