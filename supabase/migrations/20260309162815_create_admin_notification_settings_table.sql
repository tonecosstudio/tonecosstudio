-- =====================================================
-- Migration: Create Admin Notification Settings Table
-- Description: Configurações de notificações para administradores
-- =====================================================

-- =====================================================
-- ADMIN_NOTIFICATION_SETTINGS (Configurações de notificações)
-- =====================================================
CREATE TABLE admin_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  browser_enabled BOOLEAN DEFAULT true NOT NULL,
  email_enabled BOOLEAN DEFAULT true NOT NULL,
  sound_enabled BOOLEAN DEFAULT true NOT NULL,
  sound_volume NUMERIC(3,2) DEFAULT 0.5 NOT NULL CHECK (sound_volume >= 0 AND sound_volume <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índice para busca por user_id
CREATE INDEX idx_admin_notification_settings_user_id ON admin_notification_settings(user_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE admin_notification_settings ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver e editar suas próprias configurações
CREATE POLICY "admin_notification_settings_select_own"
  ON admin_notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admin_notification_settings_insert_own"
  ON admin_notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_notification_settings_update_own"
  ON admin_notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins podem ver configurações de todos
CREATE POLICY "admin_notification_settings_select_admin"
  ON admin_notification_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TRIGGER
-- =====================================================

CREATE TRIGGER set_updated_at_admin_notification_settings
  BEFORE UPDATE ON admin_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- FUNCTION: Criar configurações padrão automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Criar configurações padrão para novos admins
  IF NEW.role IN ('admin', 'super_admin') THEN
    INSERT INTO admin_notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para criar configurações automaticamente quando um usuário vira admin
CREATE TRIGGER create_notification_settings_on_admin
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (NEW.role IN ('admin', 'super_admin'))
  EXECUTE FUNCTION create_default_notification_settings();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE admin_notification_settings IS 'Configurações de notificações para administradores';
COMMENT ON COLUMN admin_notification_settings.browser_enabled IS 'Notificações do navegador habilitadas';
COMMENT ON COLUMN admin_notification_settings.email_enabled IS 'Notificações por email habilitadas';
COMMENT ON COLUMN admin_notification_settings.sound_enabled IS 'Som de notificações habilitado';
COMMENT ON COLUMN admin_notification_settings.sound_volume IS 'Volume do som (0.0 a 1.0)';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
