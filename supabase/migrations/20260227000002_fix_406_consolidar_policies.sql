-- =====================================================
-- Migration: Fix 406 - Consolidar PolÃƒÂ­ticas SELECT
-- Date: 2026-02-27
-- Problem: MÃƒÂºltiplas polÃƒÂ­ticas SELECT causam erro 406
-- Solution: Consolidar em uma ÃƒÂºnica polÃƒÂ­tica SELECT
-- =====================================================

-- =====================================================
-- STEP 1: Remover TODAS as polÃƒÂ­ticas SELECT existentes
-- =====================================================

-- chat_group_members - Remover polÃƒÂ­ticas SELECT
DROP POLICY IF EXISTS "select_members" ON chat_group_members;
DROP POLICY IF EXISTS "Members can view their own membership" ON chat_group_members;
DROP POLICY IF EXISTS "Admins can view all memberships" ON chat_group_members;
DROP POLICY IF EXISTS "authenticated_select_all" ON chat_group_members;
DROP POLICY IF EXISTS "chat_group_members_select" ON chat_group_members;
DROP POLICY IF EXISTS "members_select" ON chat_group_members;

-- =====================================================
-- STEP 2: Criar UMA ÃƒÅ¡NICA polÃƒÂ­tica SELECT consolidada
-- =====================================================

-- SELECT: Uma ÃƒÂºnica polÃƒÂ­tica que cobre todos os casos
CREATE POLICY "select_members_consolidated"
  ON chat_group_members FOR SELECT
  TO authenticated
  USING (
    -- Admin vÃƒÂª tudo
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
    OR
    -- UsuÃƒÂ¡rio vÃƒÂª apenas seus prÃƒÂ³prios memberships
    user_id = auth.uid()
  );

-- =====================================================
-- STEP 3: Notificar PostgREST
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- STEP 4: VerificaÃƒÂ§ÃƒÂ£o
-- =====================================================

DO $$
DECLARE
  select_policy_count INTEGER;
BEGIN
  -- Contar polÃƒÂ­ticas SELECT em chat_group_members
  SELECT COUNT(*) INTO select_policy_count
  FROM pg_policies
  WHERE tablename = 'chat_group_members'
  AND cmd = 'SELECT';
  
  IF select_policy_count = 1 THEN
    RAISE NOTICE 'Ã¢Å“â€¦ Sucesso: Apenas 1 polÃƒÂ­tica SELECT em chat_group_members';
  ELSE
    RAISE WARNING 'Ã¢Å¡Â Ã¯Â¸Â AtenÃƒÂ§ÃƒÂ£o: % polÃƒÂ­ticas SELECT em chat_group_members (deveria ser 1)', select_policy_count;
  END IF;
END $$;

-- Listar polÃƒÂ­ticas SELECT
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'chat_group_members'
AND cmd = 'SELECT'
ORDER BY policyname;
