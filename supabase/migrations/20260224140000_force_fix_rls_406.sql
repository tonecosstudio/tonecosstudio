-- Force Fix RLS 406 Error
-- Remover TODAS as políticas e recriar do zero

-- =====================================================
-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES
-- =====================================================

DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'chat_group_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON chat_group_members', pol.policyname);
    END LOOP;
END $$;

-- =====================================================
-- 2. CRIAR POLÍTICAS PERMISSIVAS
-- =====================================================

CREATE POLICY "chat_group_members_select"
  ON chat_group_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "chat_group_members_insert"
  ON chat_group_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "chat_group_members_update"
  ON chat_group_members FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "chat_group_members_delete"
  ON chat_group_members FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- 3. VERIFICAÇÃO
-- =====================================================

SELECT 
  tablename,
  policyname,
  cmd as operacao
FROM pg_policies
WHERE tablename = 'chat_group_members'
ORDER BY policyname;

SELECT '✅ Fix 406 aplicado - políticas permissivas ativas' as resultado;
