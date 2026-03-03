-- Verificar políticas atuais de collections
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'collections'
ORDER BY policyname;

-- Verificar políticas de subscription_collections
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'subscription_collections'
ORDER BY policyname;

-- ============================================
-- FIX: Remover políticas antigas e criar novas
-- ============================================

-- Remover políticas antigas de collections
DROP POLICY IF EXISTS "Coleções ativas são públicas" ON collections;
DROP POLICY IF EXISTS "Admins podem ver todas as coleções" ON collections;
DROP POLICY IF EXISTS "Users can view active collections" ON collections;
DROP POLICY IF EXISTS "Users can view collections from their subscriptions" ON collections;
DROP POLICY IF EXISTS "Admins can view all collections" ON collections;

-- Criar políticas novas e corretas
CREATE POLICY "collections_select_active"
  ON collections FOR SELECT
  USING (is_active = true);

CREATE POLICY "collections_select_from_subscriptions"
  ON collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM subscription_collections sc
      JOIN subscriptions s ON s.id = sc.subscription_id
      WHERE sc.collection_id = collections.id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "collections_select_admin"
  ON collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Verificar políticas após aplicação
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'collections'
ORDER BY policyname;
