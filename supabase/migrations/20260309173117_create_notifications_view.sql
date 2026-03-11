-- =====================================================
-- Migration: Create Notifications View
-- Description: Cria view 'notifications' como alias para 'user_notifications'
--              para compatibilidade com código frontend
-- =====================================================

-- =====================================================
-- CRIAR VIEW NOTIFICATIONS
-- =====================================================

-- View que aponta para user_notifications
CREATE OR REPLACE VIEW notifications AS
SELECT 
  id,
  user_id,
  title,
  message,
  type,
  is_read,
  created_at
FROM user_notifications;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Permitir acesso à view
GRANT SELECT ON notifications TO authenticated;
GRANT SELECT ON notifications TO anon;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON VIEW notifications IS 'View de compatibilidade que aponta para user_notifications';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
