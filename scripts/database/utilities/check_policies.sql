-- Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments')
ORDER BY tablename, policyname;
