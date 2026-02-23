-- =====================================================
-- FIX NUCLEAR: Desabilitar RLS Temporariamente
-- =====================================================
-- ATENÇÃO: Isso é apenas para DIAGNÓSTICO
-- Vamos desabilitar RLS para confirmar que o problema é nas políticas
-- =====================================================

-- 1. Desabilitar RLS completamente
ALTER TABLE chat_group_messages DISABLE ROW LEVEL SECURITY;

-- 2. Verificar status
SELECT 
  '✅ RLS DESABILITADO' as status,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'chat_group_messages';

-- 3. Instruções
SELECT 
  '⚠️ ATENÇÃO: RLS DESABILITADO!' as aviso,
  'Isso é TEMPORÁRIO apenas para diagnóstico' as detalhe_1,
  'Recarregue a página e veja se o erro 406 desaparece' as detalhe_2,
  'Se desaparecer, o problema é nas políticas RLS' as detalhe_3,
  'Se persistir, o problema é outra coisa' as detalhe_4;
