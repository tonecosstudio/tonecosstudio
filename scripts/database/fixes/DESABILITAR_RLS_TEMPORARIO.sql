-- SOLUÇÃO TEMPORÁRIA: Desabilitar RLS completamente
-- Use isso apenas para desenvolvimento/debug
-- Em produção, você deve ter políticas RLS adequadas

-- =====================================================
-- DESABILITAR RLS EM TODAS AS TABELAS DE CHAT
-- =====================================================

ALTER TABLE chat_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_attachments DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- REMOVER TODAS AS POLÍTICAS
-- =====================================================

-- chat_groups
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_groups') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON chat_groups';
    END LOOP;
END $$;

-- chat_group_members
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_group_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON chat_group_members';
    END LOOP;
END $$;

-- chat_group_messages
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_group_messages') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON chat_group_messages';
    END LOOP;
END $$;

-- chat_group_attachments
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_group_attachments') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON chat_group_attachments';
    END LOOP;
END $$;

-- =====================================================
-- VERIFICAR RESULTADO
-- =====================================================

SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments');

SELECT 
  'Políticas restantes:' as status,
  COUNT(*) as total
FROM pg_policies 
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments');

SELECT '✅ RLS desabilitado! O erro 406 deve desaparecer.' as resultado;
