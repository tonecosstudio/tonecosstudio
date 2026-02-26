-- =====================================================
-- SOLUÇÃO FINAL - Criar Notificação de Teste
-- =====================================================
-- Data: 2026-02-26
-- =====================================================

-- PASSO 1: Verificar usuários existentes
SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- PASSO 2: Criar notificação usando o ID diretamente
-- IMPORTANTE: Copie o ID do usuário da query acima e cole abaixo

-- Opção A: Se você viu o ID na query acima, use assim:
-- SELECT create_user_notification(
--   'COLE_O_ID_AQUI'::uuid,
--   'system_announcement'::user_notification_type,
--   'Sistema de Notificações Ativado! 🎉',
--   'O novo sistema está funcionando!',
--   'high'::notification_priority,
--   NULL, NULL, '/notificacoes', 'Ver Notificações', 'Megaphone', '{}'::jsonb
-- );

-- Opção B: Criar para TODOS os usuários de uma vez
DO $$
DECLARE
  user_record RECORD;
  notification_id UUID;
  total_created INTEGER := 0;
BEGIN
  -- Loop por todos os usuários
  FOR user_record IN 
    SELECT id, email FROM auth.users 
  LOOP
    -- Criar notificação
    notification_id := create_user_notification(
      user_record.id,
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
    );
    
    total_created := total_created + 1;
    RAISE NOTICE 'Notificação criada para: % (ID: %)', user_record.email, notification_id;
  END LOOP;
  
  RAISE NOTICE 'Total de notificações criadas: %', total_created;
END $$;

-- PASSO 3: Verificar notificações criadas
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
ORDER BY n.created_at DESC
LIMIT 10;

-- PASSO 4: Estatísticas
SELECT 
  COUNT(*) as total_notificacoes,
  COUNT(*) FILTER (WHERE is_read = FALSE) as nao_lidas,
  COUNT(*) FILTER (WHERE is_read = TRUE) as lidas,
  COUNT(DISTINCT user_id) as usuarios_com_notificacoes
FROM user_notifications;
