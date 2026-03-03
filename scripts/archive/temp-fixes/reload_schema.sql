-- Force PostgREST to reload schema cache
-- Execute este script no SQL Editor do Supabase

-- Método 1: Notificar o PostgREST para recarregar
NOTIFY pgrst, 'reload schema';

-- Método 2: Fazer uma pequena alteração na tabela para forçar reload
COMMENT ON TABLE production_queue IS 'Production queue table - updated to force schema reload';

-- Verificar se a tabela existe e tem RLS habilitado
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'production_queue'
  ) THEN
    RAISE NOTICE '✓ Tabela production_queue existe';
    
    -- Verificar RLS
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'production_queue'
      AND rowsecurity = true
    ) THEN
      RAISE NOTICE '✓ RLS está habilitado';
    ELSE
      RAISE NOTICE '✗ RLS NÃO está habilitado';
    END IF;
    
    -- Verificar políticas
    RAISE NOTICE 'Políticas RLS:';
    FOR r IN (
      SELECT polname 
      FROM pg_policy 
      WHERE polrelid = 'production_queue'::regclass
    ) LOOP
      RAISE NOTICE '  - %', r.polname;
    END LOOP;
    
  ELSE
    RAISE NOTICE '✗ Tabela production_queue NÃO existe';
  END IF;
END $$;

-- Listar todas as tabelas públicas para comparação
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policy WHERE polrelid = (schemaname || '.' || tablename)::regclass) as policy_count
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename LIKE '%production%'
ORDER BY tablename;
