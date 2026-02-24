-- Adicionar o usuário admin a todos os grupos existentes
INSERT INTO chat_group_members (group_id, user_id)
SELECT 
  g.id,
  '8cdbe271-76da-4f74-ac93-7d92f57ed244'::uuid
FROM chat_groups g
WHERE g.deleted_at IS NULL
ON CONFLICT (group_id, user_id) DO NOTHING;
