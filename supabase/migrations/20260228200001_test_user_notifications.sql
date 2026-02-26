-- =====================================================
-- TESTE DO SISTEMA DE NOTIFICAÇÕES
-- =====================================================
-- Criado em: 2026-02-28
-- Descrição: Script de teste para criar notificações de exemplo
-- =====================================================

-- Criar notificação para todos os usuários existentes
DO $$
DECLARE
  user_record RECORD;
  notification_id UUID;
BEGIN
  -- Verificar se há usuários
  IF NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
    RAISE NOTICE 'AVISO: Nenhum usuário encontrado. Notificações não foram criadas.';
    RAISE NOTICE 'Faça login na aplicação primeiro para criar um usuário.';
  ELSE
    -- Criar notificação de boas-vindas para cada usuário
    FOR user_record IN SELECT id, email FROM auth.users LOOP
      -- Notificação de sistema
      notification_id := create_user_notification(
        user_record.id,
        'system_announcement',
        'Sistema de Notificações Ativado! 🎉',
        'O novo sistema de notificações está funcionando perfeitamente. Você receberá atualizações em tempo real sobre pedidos, pagamentos e muito mais!',
        'high',
        NULL,
        NULL,
        '/notificacoes',
        'Ver Notificações',
        'Megaphone'
      );
      
      RAISE NOTICE 'Notificação criada para usuário: % (ID: %)', user_record.email, notification_id;
    END LOOP;
    
    RAISE NOTICE 'Processo concluído com sucesso!';
  END IF;
END $$;

-- Mostrar estatísticas
DO $$
DECLARE
  total_users INTEGER;
  total_notifications INTEGER;
  unread_notifications INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM auth.users;
  SELECT COUNT(*) INTO total_notifications FROM user_notifications;
  SELECT COUNT(*) INTO unread_notifications FROM user_notifications WHERE is_read = FALSE;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ESTATÍSTICAS DO SISTEMA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de usuários: %', total_users;
  RAISE NOTICE 'Total de notificações: %', total_notifications;
  RAISE NOTICE 'Notificações não lidas: %', unread_notifications;
  RAISE NOTICE '========================================';
END $$;
