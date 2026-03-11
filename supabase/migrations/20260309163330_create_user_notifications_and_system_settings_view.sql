-- =====================================================
-- Migration: Create user_notifications, system_settings_grouped view, and RPC
-- Description: Notificações para usuários, view agrupada de configurações e RPC
-- =====================================================

-- =====================================================
-- USER_NOTIFICATIONS (Notificações para usuários)
-- =====================================================
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX idx_user_notifications_user_unread ON user_notifications(user_id, is_read) WHERE is_read = false;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Usuários veem apenas suas próprias notificações
CREATE POLICY "user_notifications_select_own"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias notificações (marcar como lida)
CREATE POLICY "user_notifications_update_own"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Apenas admins podem criar notificações
CREATE POLICY "user_notifications_insert_admin"
  ON user_notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Apenas admins podem deletar
CREATE POLICY "user_notifications_delete_admin"
  ON user_notifications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- RPC FUNCTION: mark_all_user_notifications_read
-- =====================================================

CREATE OR REPLACE FUNCTION mark_all_user_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_notifications
  SET is_read = true
  WHERE user_id = auth.uid()
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================================================
-- VIEW: system_settings_grouped
-- =====================================================

CREATE OR REPLACE VIEW system_settings_grouped AS
SELECT
  jsonb_object_agg(key, value) AS settings
FROM system_settings;

-- Permitir acesso público à view
GRANT SELECT ON system_settings_grouped TO anon, authenticated;

-- =====================================================
-- RPC FUNCTION: get_system_settings
-- =====================================================

-- Drop existing function if it has wrong signature
DROP FUNCTION IF EXISTS get_system_settings();

CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings JSON;
BEGIN
  SELECT json_object_agg(key, value)
  INTO v_settings
  FROM system_settings;
  
  RETURN COALESCE(v_settings, '{}'::json);
END;
$$;

-- Permitir acesso público à função
GRANT EXECUTE ON FUNCTION get_system_settings() TO anon, authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE user_notifications IS 'Notificações para usuários do sistema';
COMMENT ON COLUMN user_notifications.type IS 'Tipo da notificação (payment_info_request, payment_approved, etc)';
COMMENT ON COLUMN user_notifications.is_read IS 'Indica se a notificação foi lida';

COMMENT ON VIEW system_settings_grouped IS 'View que agrupa todas as configurações do sistema em um único objeto JSON';
COMMENT ON FUNCTION get_system_settings IS 'Retorna todas as configurações do sistema como JSON';
COMMENT ON FUNCTION mark_all_user_notifications_read IS 'Marca todas as notificações do usuário como lidas';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
