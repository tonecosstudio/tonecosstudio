-- Adicionar o usuário admin ao grupo que está dando erro 406
INSERT INTO chat_group_members (group_id, user_id, role)
VALUES (
  '4061faba-c2f2-49ef-afeb-bcac9f9346a2',
  '8cdbe271-76da-4f74-ac93-7d92f57ed244',
  'admin'
)
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Verificar se foi adicionado
SELECT 
  g.name as grupo,
  u.email as usuario,
  gm.role
FROM chat_group_members gm
JOIN chat_groups g ON g.id = gm.group_id
JOIN auth.users u ON u.id = gm.user_id
WHERE gm.group_id = '4061faba-c2f2-49ef-afeb-bcac9f9346a2';
