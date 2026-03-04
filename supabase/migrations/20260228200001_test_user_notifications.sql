-- =====================================================
-- TESTE DO SISTEMA DE NOTIFICAÃƒâ€¡Ãƒâ€¢ES
-- =====================================================
-- Criado em: 2026-02-28
-- DescriÃƒÂ§ÃƒÂ£o: Script de teste para criar notificaÃƒÂ§ÃƒÂµes de exemplo
-- =====================================================

-- Criar notificaÃƒÂ§ÃƒÂ£o para todos os usuÃƒÂ¡rios existentes
DO $$
DECLARE
  user_record RECORD;
  notification_id UUID;
BEGIN
  -- Verificar se hÃƒÂ¡ usuÃƒÂ¡rios
  IF NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
    RAISE NOTICE 'AVISO: Nenhum usuÃƒÂ¡rio encontrado. NotificaÃƒÂ§ÃƒÂµes nÃƒÂ£o foram criadas.';
    RAISE NOTICE 'FaÃƒÂ§a login na aplicaÃƒÂ§ÃƒÂ£o primeiro para criar um usuÃƒÂ¡rio.';
  ELSE
    -- Criar notificaÃƒÂ§ÃƒÂ£o de boas-vindas para cada usuÃƒÂ¡rio
    FOR user_record IN SELECT id, email FROM auth.users LOOP
      -- NotificaÃƒÂ§ÃƒÂ£o de sistema
      notification_id := create_user_notification(
        user_record.id,
        'system_announcement',
        'Sistema de NotificaÃƒÂ§ÃƒÂµes Ativado! Ã°Å¸Å½â€°',
        'O novo sistema de notificaÃƒÂ§ÃƒÂµes estÃƒÂ¡ funcionando perfeitamente. VocÃƒÂª receberÃƒÂ¡ atualizaÃƒÂ§ÃƒÂµes em tempo real sobre pedidos, pagamentos e muito mais!',
        'high',
        NULL,
        NULL,
        '/notificacoes',
        'Ver NotificaÃƒÂ§ÃƒÂµes',
        'Megaphone'
      );
      
      RAISE NOTICE 'NotificaÃƒÂ§ÃƒÂ£o criada para usuÃƒÂ¡rio: % (ID: %)', user_record.email, notification_id;
    END LOOP;
    
    RAISE NOTICE 'Processo concluÃƒÂ­do com sucesso!';
  END IF;
END $$;

-- Mostrar estatÃƒÂ­sticas
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
  RAISE NOTICE 'ESTATÃƒÂSTICAS DO SISTEMA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de usuÃƒÂ¡rios: %', total_users;
  RAISE NOTICE 'Total de notificaÃƒÂ§ÃƒÂµes: %', total_notifications;
  RAISE NOTICE 'NotificaÃƒÂ§ÃƒÂµes nÃƒÂ£o lidas: %', unread_notifications;
  RAISE NOTICE '========================================';
END $$;
