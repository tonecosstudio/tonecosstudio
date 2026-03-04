-- =====================================================
-- FIX NUCLEAR: Desabilitar RLS Temporariamente
-- =====================================================
-- ATENÃƒâ€¡ÃƒÆ’O: Isso ÃƒÂ© apenas para DIAGNÃƒâ€œSTICO
-- Vamos desabilitar RLS para confirmar que o problema ÃƒÂ© nas polÃƒÂ­ticas
-- =====================================================

-- 1. Desabilitar RLS completamente
ALTER TABLE chat_group_messages DISABLE ROW LEVEL SECURITY;

-- 2. Verificar status
SELECT 
  'Ã¢Å“â€¦ RLS DESABILITADO' as status,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'chat_group_messages';

-- 3. InstruÃƒÂ§ÃƒÂµes
SELECT 
  'Ã¢Å¡Â Ã¯Â¸Â ATENÃƒâ€¡ÃƒÆ’O: RLS DESABILITADO!' as aviso,
  'Isso ÃƒÂ© TEMPORÃƒÂRIO apenas para diagnÃƒÂ³stico' as detalhe_1,
  'Recarregue a pÃƒÂ¡gina e veja se o erro 406 desaparece' as detalhe_2,
  'Se desaparecer, o problema ÃƒÂ© nas polÃƒÂ­ticas RLS' as detalhe_3,
  'Se persistir, o problema ÃƒÂ© outra coisa' as detalhe_4;
