-- Criar notificação de teste para o usuário existente
-- Data: 2026-02-28

-- Verificar usuários
SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at
LIMIT 5;

-- Criar notificação para o primeiro usuário
SELECT create_user_notification(
  (SELECT id FROM auth.users WHERE email = 'tonecos loja@gmail.com'),
  'system_announcement'::user_notification_type,
  'Sistema de Notificações Ativado! 🎉',
  'O novo sistema de notificações está funcionando perfeitamente. Você receberá atualizações em tempo real sobre pedidos, pagamentos e muito mais!',
  'high'::notification_priority,
  NULL,
  NULL,
  '/notificacoes',
  'Ver Notificações',
  'Megaphone',
  '{}'::jsonb
) AS notification_id;

-- Verificar notificação criada
SELECT 
  n.id,
  u.email,
  n.title,
  n.message,
  n.type,
  n.priority,
  n.is_read,
  n.created_at
FROM user_notifications n
JOIN auth.users u ON n.user_id = u.id
WHERE u.email = 'tonecos loja@gmail.com'
ORDER BY n.created_at DESC
LIMIT 5;
