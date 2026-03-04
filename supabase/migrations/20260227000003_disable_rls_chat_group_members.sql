-- =====================================================
-- Migration: Desabilitar RLS Temporariamente para DiagnÃƒÂ³stico
-- Date: 2026-02-27
-- Problem: Erro 406 persiste mesmo apÃƒÂ³s consolidaÃƒÂ§ÃƒÂ£o
-- Solution: Desabilitar RLS temporariamente para permitir acesso
-- =====================================================

-- ATENÃƒâ€¡ÃƒÆ’O: Esta ÃƒÂ© uma soluÃƒÂ§ÃƒÂ£o temporÃƒÂ¡ria para diagnÃƒÂ³stico
-- Em produÃƒÂ§ÃƒÂ£o, as polÃƒÂ­ticas RLS devem ser corrigidas adequadamente

-- =====================================================
-- STEP 1: Desabilitar RLS em chat_group_members
-- =====================================================

ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Notificar PostgREST
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- STEP 3: VerificaÃƒÂ§ÃƒÂ£o
-- =====================================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'chat_group_members';
  
  IF rls_enabled THEN
    RAISE WARNING 'Ã¢Å¡Â Ã¯Â¸Â RLS ainda estÃƒÂ¡ habilitado em chat_group_members';
  ELSE
    RAISE NOTICE 'Ã¢Å“â€¦ RLS desabilitado em chat_group_members';
  END IF;
END $$;

-- Listar status de RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename LIKE 'chat_group%'
ORDER BY tablename;
