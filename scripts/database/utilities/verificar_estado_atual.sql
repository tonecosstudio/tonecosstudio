-- Verificar estado atual das tabelas e políticas
-- Execute no SQL Editor do Supabase

-- 1. Verificar se RLS está habilitado
SELECT 
  tablename, 
  rowsecurity as rls_habilitado
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments')
ORDER BY tablename;

-- 2. Listar todas as políticas atuais
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operacao
FROM pg_policies
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments')
ORDER BY tablename, policyname;

-- 3. Verificar se a tabela chat_group_members está acessível
SELECT COUNT(*) as total_membros FROM chat_group_members;

-- 4. Testar query específica que está falhando
SELECT id FROM chat_group_members 
WHERE group_id = 'f1ef523c-fe08-4191-a303-2feb80bacadc' 
AND user_id = '8cdbe271-76da-4f74-ac93-7d92f57ed244'
LIMIT 1;
