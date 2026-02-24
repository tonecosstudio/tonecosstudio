-- Recarregar cache do PostgREST
-- Execute no SQL Editor do Supabase

-- Notificar o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';

-- Verificar que as tabelas estão visíveis
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'chat_group%'
ORDER BY tablename;
