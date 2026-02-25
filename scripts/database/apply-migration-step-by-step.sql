-- ============================================
-- MIGRATION: Sistema de Notificações Admin
-- Data: 2026-02-28
-- ============================================
-- 
-- INSTRUÇÕES:
-- 1. Copie e execute cada seção separadamente no Supabase SQL Editor
-- 2. Aguarde a confirmação de sucesso antes de prosseguir
-- 3. Se houver erro, leia a mensagem e corrija antes de continuar
--
-- ============================================

-- ============================================
-- PARTE 1: ENUMS
-- ============================================

-- Criar enum para tipos de notificação
CREATE TYPE notification_type AS ENUM (
  'new_quote',
  'quote_approved',
  'payment_received',
  'payment_failed',
  'new_subscription',
  'subscription_cancelled',
  'support_ticket',
  'low_stock',
  'system_error',
  'user_registered'
);

-- Criar enum para prioridades
CREATE TYPE notification_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- ============================================
-- PARTE 2: TABELA admin_notifications
-- ============================================

CREATE TABLE admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  priority notification_priority DEFAULT 'medium',
  title text NOT NULL,
  message text NOT NULL,
  icon text,
  related_id uuid,
  related_type text,
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX idx_admin_notifications_priority ON admin_notifications(priority);

-- ============================================
-- PARTE 3: TABELA admin_notification_settings
-- ============================================

CREATE TABLE admin_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipos de notificação
  new_quote_enabled boolean DEFAULT true,
  payment_received_enabled boolean DEFAULT true,
  support_ticket_enabled boolean DEFAULT true,
  subscription_canceled_enabled boolean DEFAULT true,
  low_stock_enabled boolean DEFAULT true,
  system_error_enabled boolean DEFAULT true,
  new_user_enabled boolean DEFAULT true,
  preorder_completed_enabled boolean DEFAULT true,
  production_ready_enabled boolean DEFAULT true,
  message_received_enabled boolean DEFAULT true,
  
  -- Configurações de som
  sound_enabled boolean DEFAULT true,
  sound_volume integer DEFAULT 50 CHECK (sound_volume >= 0 AND sound_volume <= 100),
  
  -- Configurações de email
  email_enabled boolean DEFAULT false,
  email_frequency text DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  
  -- Configurações de push
  push_enabled boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- ============================================
-- PARTE 4: TABELA admin_alerts
-- ============================================

CREATE TABLE admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  condition jsonb NOT NULL,
  notification_type notification_type NOT NULL,
  notification_priority notification_priority DEFAULT 'medium',
  enabled boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- PARTE 5: RLS POLICIES - admin_notifications
-- ============================================

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert notifications"
  ON admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update notifications"
  ON admin_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete notifications"
  ON admin_notifications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- PARTE 6: RLS POLICIES - admin_notification_settings
-- ============================================

ALTER TABLE admin_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON admin_notification_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings"
  ON admin_notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON admin_notification_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- PARTE 7: RLS POLICIES - admin_alerts
-- ============================================

ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all alerts"
  ON admin_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage alerts"
  ON admin_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- PARTE 8: FUNÇÃO create_admin_notification
-- ============================================

CREATE OR REPLACE FUNCTION create_admin_notification(
  p_type notification_type,
  p_title text,
  p_message text,
  p_priority notification_priority DEFAULT 'medium',
  p_icon text DEFAULT NULL,
  p_related_id uuid DEFAULT NULL,
  p_related_type text DEFAULT NULL,
  p_action_url text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO admin_notifications (
    type,
    priority,
    title,
    message,
    icon,
    related_id,
    related_type,
    action_url,
    metadata
  ) VALUES (
    p_type,
    p_priority,
    p_title,
    p_message,
    p_icon,
    p_related_id,
    p_related_type,
    p_action_url,
    p_metadata
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- ============================================
-- PARTE 9: FUNÇÃO mark_notification_read
-- ============================================

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_notifications
  SET 
    read = true,
    read_at = now(),
    updated_at = now()
  WHERE id = p_notification_id;
END;
$$;

-- ============================================
-- PARTE 10: FUNÇÃO mark_all_notifications_read
-- ============================================

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_notifications
  SET 
    read = true,
    read_at = now(),
    updated_at = now()
  WHERE read = false;
END;
$$;

-- ============================================
-- PARTE 11: FUNÇÃO cleanup_old_notifications
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM admin_notifications
  WHERE created_at < now() - (days_to_keep || ' days')::interval
  AND read = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- PARTE 12: TRIGGER para novos orçamentos
-- ============================================

CREATE OR REPLACE FUNCTION notify_new_quote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM create_admin_notification(
    'new_quote',
    'Novo Orçamento Recebido',
    'Um novo orçamento foi solicitado por ' || COALESCE(NEW.customer_name, 'cliente'),
    'medium',
    'FileText',
    NEW.id,
    'quote',
    '/admin/orcamentos'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_quote
  AFTER INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_quote();

-- ============================================
-- PARTE 13: TRIGGER para tickets de suporte
-- ============================================

CREATE OR REPLACE FUNCTION notify_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'open' THEN
    PERFORM create_admin_notification(
      'support_ticket',
      'Novo Ticket de Suporte',
      'Ticket #' || NEW.id || ': ' || COALESCE(NEW.subject, 'Sem assunto'),
      'high',
      'HeadphonesIcon',
      NEW.id,
      'support_ticket',
      '/admin/comunicacao?tab=support'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_support_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_support_ticket();

-- ============================================
-- PARTE 14: HABILITAR REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;

-- ============================================
-- FIM DA MIGRATION
-- ============================================

-- Verificar instalação
SELECT 'Migration aplicada com sucesso!' as status;
SELECT COUNT(*) as total_notifications FROM admin_notifications;
SELECT COUNT(*) as total_settings FROM admin_notification_settings;
SELECT COUNT(*) as total_alerts FROM admin_alerts;
