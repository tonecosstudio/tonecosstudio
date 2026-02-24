-- =====================================================
-- Migration: Desabilitar RLS Temporariamente para Diagnóstico
-- Date: 2026-02-27
-- Problem: Erro 406 persiste mesmo após consolidação
-- Solution: Desabilitar RLS temporariamente para permitir acesso
-- =====================================================

-- ATENÇÃO: Esta é uma solução temporária para diagnóstico
-- Em produção, as políticas RLS devem ser corrigidas adequadamente

-- =====================================================
-- STEP 1: Desabilitar RLS em chat_group_members
-- =====================================================

ALTER TABLE chat_group_members DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Notificar PostgREST
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- STEP 3: Verificação
-- =====================================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'chat_group_members';
  
  IF rls_enabled THEN
    RAISE WARNING '⚠️ RLS ainda está habilitado em chat_group_members';
  ELSE
    RAISE NOTICE '✅ RLS desabilitado em chat_group_members';
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
