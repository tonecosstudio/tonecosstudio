-- Verificar grupos com membros
SELECT 
  g.id,
  g.name,
  COUNT(gm.id) as total_membros
FROM chat_groups g
LEFT JOIN chat_group_members gm ON g.id = gm.group_id
WHERE g.deleted_at IS NULL
GROUP BY g.id, g.name
ORDER BY g.created_at DESC;
