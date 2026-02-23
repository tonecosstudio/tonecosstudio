-- Verificar se as políticas foram criadas corretamente
SELECT 
  policyname,
  cmd,
  roles::text
FROM pg_policies 
WHERE tablename = 'chat_group_messages'
ORDER BY cmd, policyname;
