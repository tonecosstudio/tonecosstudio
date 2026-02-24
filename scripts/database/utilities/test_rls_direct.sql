-- Test RLS policies directly
-- Run this in Supabase SQL Editor

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments');

-- Check current policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments')
ORDER BY tablename, policyname;

-- Test query as authenticated user (replace with actual user ID)
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "8cdbe271-76da-4f74-ac93-7d92f57ed244"}';

SELECT id FROM chat_group_members 
WHERE group_id = 'f1ef523c-fe08-4191-a303-2feb80bacadc' 
LIMIT 5;
