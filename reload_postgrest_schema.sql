-- Reload PostgREST schema cache
-- This forces PostgREST to reload its schema cache
-- Run this in Supabase SQL Editor

NOTIFY pgrst, 'reload schema';

-- Also refresh the schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the tables are accessible
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_groups', 'chat_group_members', 'chat_group_messages', 'chat_group_attachments');
