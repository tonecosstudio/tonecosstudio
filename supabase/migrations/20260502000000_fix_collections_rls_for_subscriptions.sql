-- Migration: Fix collections RLS for subscriptions join
-- Purpose: Allow users to see collections referenced in their subscriptions
-- Date: 2026-05-02

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Coleções ativas são públicas" ON collections;
DROP POLICY IF EXISTS "Admins podem ver todas as coleções" ON collections;

-- Create new policies that allow proper joins
CREATE POLICY "Users can view active collections"
  ON collections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view collections from their subscriptions"
  ON collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.collection_id = collections.id
      AND subscriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all collections"
  ON collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Keep the admin management policy
-- (Already exists: "Apenas admins podem gerenciar coleções")

COMMENT ON POLICY "Users can view active collections" ON collections IS 
  'Permite que usuários autenticados vejam coleções ativas';

COMMENT ON POLICY "Users can view collections from their subscriptions" ON collections IS 
  'Permite que usuários vejam coleções referenciadas em suas assinaturas, mesmo que não estejam ativas';

COMMENT ON POLICY "Admins can view all collections" ON collections IS 
  'Permite que administradores vejam todas as coleções';
