-- =====================================================
-- FIX: Permissões PostgREST para chat_group_messages
-- =====================================================
-- O erro 406 pode ser causado por falta de permissões
-- para os roles anon e authenticated acessarem a tabela
-- =====================================================

-- Garantir que a tabela está no schema público
ALTER TABLE IF EXISTS chat_group_messages SET SCHEMA public;

-- Conceder permissões de SELECT para roles do Supabase
GRANT SELECT ON public.chat_group_messages TO anon;
GRANT SELECT ON public.chat_group_messages TO authenticated;
GRANT SELECT ON public.chat_group_messages TO service_role;

-- Conceder permissões de INSERT/UPDATE/DELETE apenas para authenticated
GRANT INSERT, UPDATE, DELETE ON public.chat_group_messages TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chat_group_messages TO service_role;

-- Conceder permissões de USAGE na sequência (se houver)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Reabilitar RLS (já que desabilitamos antes)
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

-- Criar política permissiva temporária para todos os usuários autenticados
DROP POLICY IF EXISTS "temp_allow_all_authenticated" ON chat_group_messages;
CREATE POLICY "temp_allow_all_authenticated"
  ON chat_group_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verificar permissões aplicadas
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_name = 'chat_group_messages'
ORDER BY grantee, privilege_type;
