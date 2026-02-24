-- Configurar a Edge Function send-email para aceitar chamadas do cliente

-- IMPORTANTE: Execute este SQL no Supabase Dashboard
-- SQL Editor: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql

-- A Edge Function já usa SUPABASE_SERVICE_ROLE_KEY internamente,
-- então não precisa de autenticação do cliente.

-- Verificar se há políticas RLS que possam estar bloqueando
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('support_conversations', 'support_messages', 'profiles', 'email_notifications');

-- Se necessário, garantir que a função pode acessar os dados
-- (A função já usa service_role_key, então deve funcionar)
