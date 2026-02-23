-- =====================================================
-- FIX TEMPORÁRIO: Política permissiva para diagnóstico
-- =====================================================
-- Esta é uma política TEMPORÁRIA para identificar o problema
-- ATENÇÃO: Permite leitura para todos os usuários autenticados
-- =====================================================

-- Desabilitar RLS temporariamente para testar
ALTER TABLE chat_group_messages DISABLE ROW LEVEL SECURITY;

-- Verificar se funciona sem RLS
SELECT 'RLS desabilitado - teste a aplicação agora' as status;

-- Se funcionar, o problema é com as políticas RLS
-- Se não funcionar, o problema é com autenticação ou headers
