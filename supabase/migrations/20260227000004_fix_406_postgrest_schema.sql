-- =====================================================
-- Migration: Fix 406 - Expor Tabela no PostgREST
-- Date: 2026-02-27
-- Problem: Erro 406 persiste mesmo com RLS desabilitado
-- Solution: Garantir que tabela estÃƒÂ¡ no schema correto e exposta
-- =====================================================

-- =====================================================
-- STEP 1: Verificar e corrigir schema da tabela
-- =====================================================

-- Garantir que a tabela estÃƒÂ¡ no schema public
-- (jÃƒÂ¡ deveria estar, mas vamos confirmar)

-- =====================================================
-- STEP 2: Garantir que a tabela estÃƒÂ¡ acessÃƒÂ­vel via API
-- =====================================================

-- Revogar permissÃƒÂµes antigas
REVOKE ALL ON chat_group_members FROM anon;
REVOKE ALL ON chat_group_members FROM authenticated;

-- Conceder permissÃƒÂµes explÃƒÂ­citas
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_group_members TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- STEP 3: Recriar a tabela se necessÃƒÂ¡rio
-- =====================================================

-- Verificar se hÃƒÂ¡ problemas com a estrutura
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_group_members'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE 'Ã¢Å“â€¦ Tabela chat_group_members existe no schema public';
  ELSE
    RAISE WARNING 'Ã¢ÂÅ’ Tabela chat_group_members NÃƒÆ’O existe!';
  END IF;
END $$;

-- =====================================================
-- STEP 4: Notificar PostgREST para recarregar
-- =====================================================

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- =====================================================
-- STEP 5: VerificaÃƒÂ§ÃƒÂ£o completa
-- =====================================================

-- Verificar permissÃƒÂµes
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'chat_group_members'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- Verificar RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'chat_group_members';
