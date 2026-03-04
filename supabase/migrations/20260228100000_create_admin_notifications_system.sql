-- =====================================================
-- SISTEMA DE NOTIFICAÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã¢â‚¬Â¢ES ADMIN - FASE 5
-- =====================================================
-- Criado em: 2026-02-28
-- DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: Sistema completo de notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em tempo real para admin
-- =====================================================

-- Limpar objetos existentes (se houver)
DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP TABLE IF EXISTS admin_notification_settings CASCADE;
DROP TABLE IF EXISTS admin_alerts CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS notification_priority CASCADE;

-- Criar enum para tipos de notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
CREATE TYPE notification_type AS ENUM (
  'new_quote',
  'payment_received',
  'support_ticket',
  'subscription_canceled',
  'low_stock',
  'system_error',
  'new_user',
  'preorder_completed',
  'production_ready',
  'message_received'
);

-- Criar enum para prioridade
CREATE TYPE notification_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Criar tabela de notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes admin
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo e prioridade
  type notification_type NOT NULL,
  priority notification_priority DEFAULT 'medium',
  
  -- ConteÃƒÆ’Ã‚Âºdo
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT, -- Nome do ÃƒÆ’Ã‚Â­cone Lucide
  
  -- Dados relacionados
  related_id UUID, -- ID do recurso relacionado (quote, payment, etc)
  related_type TEXT, -- Tipo do recurso (quotes, payments, etc)
  action_url TEXT, -- URL para aÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o (ex: /admin/orcamentos/123)
  
  -- DestinatÃƒÆ’Ã‚Â¡rios
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_role TEXT DEFAULT 'admin', -- admin, super_admin, etc
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NotificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes podem expirar
  
  -- ÃƒÆ’Ã‚Ândices
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

-- Criar ÃƒÆ’Ã‚Â­ndices para performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_recipient ON admin_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON admin_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_related ON admin_notifications(related_type, related_id);

-- Criar tabela de configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o por usuÃƒÆ’Ã‚Â¡rio
CREATE TABLE IF NOT EXISTS admin_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes por tipo
  new_quote_enabled BOOLEAN DEFAULT TRUE,
  payment_received_enabled BOOLEAN DEFAULT TRUE,
  support_ticket_enabled BOOLEAN DEFAULT TRUE,
  subscription_canceled_enabled BOOLEAN DEFAULT TRUE,
  low_stock_enabled BOOLEAN DEFAULT TRUE,
  system_error_enabled BOOLEAN DEFAULT TRUE,
  new_user_enabled BOOLEAN DEFAULT FALSE,
  preorder_completed_enabled BOOLEAN DEFAULT TRUE,
  production_ready_enabled BOOLEAN DEFAULT TRUE,
  message_received_enabled BOOLEAN DEFAULT TRUE,
  
  -- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de som
  sound_enabled BOOLEAN DEFAULT TRUE,
  sound_volume INTEGER DEFAULT 50 CHECK (sound_volume BETWEEN 0 AND 100),
  
  -- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de email
  email_enabled BOOLEAN DEFAULT TRUE,
  email_frequency TEXT DEFAULT 'instant', -- instant, hourly, daily
  
  -- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de push (futuro)
  push_enabled BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar ÃƒÆ’Ã‚Â­ndice
CREATE INDEX IF NOT EXISTS idx_admin_notification_settings_user ON admin_notification_settings(user_id);

-- Criar tabela de alertas configurÃƒÆ’Ã‚Â¡veis
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do alerta
  name TEXT NOT NULL,
  description TEXT,
  
  -- CondiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  metric TEXT NOT NULL, -- revenue, quotes_count, support_tickets, etc
  operator TEXT NOT NULL, -- gt, lt, eq, gte, lte
  threshold NUMERIC NOT NULL,
  
  -- AÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  notification_type notification_type NOT NULL,
  notification_priority notification_priority DEFAULT 'medium',
  notification_title TEXT NOT NULL,
  notification_message TEXT NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  
  -- DestinatÃƒÆ’Ã‚Â¡rios
  recipient_role TEXT DEFAULT 'admin',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar ÃƒÆ’Ã‚Â­ndice
CREATE INDEX IF NOT EXISTS idx_admin_alerts_active ON admin_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_metric ON admin_alerts(metric);

-- Habilitar RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

-- PolÃƒÆ’Ã‚Â­ticas RLS para admin_notifications
CREATE POLICY "Admins podem ver suas notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes"
  ON admin_notifications FOR SELECT
  USING (
    recipient_user_id = auth.uid() OR
    recipient_role IN (
      SELECT role::text FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Sistema pode criar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins podem atualizar suas notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes"
  ON admin_notifications FOR UPDATE
  USING (recipient_user_id = auth.uid());

-- PolÃƒÆ’Ã‚Â­ticas RLS para admin_notification_settings
CREATE POLICY "Admins podem ver suas configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes"
  ON admin_notification_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins podem criar suas configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes"
  ON admin_notification_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins podem atualizar suas configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes"
  ON admin_notification_settings FOR UPDATE
  USING (user_id = auth.uid());

-- PolÃƒÆ’Ã‚Â­ticas RLS para admin_alerts
CREATE POLICY "Admins podem ver alertas"
  ON admin_alerts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins podem criar alertas"
  ON admin_alerts FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins podem atualizar alertas"
  ON admin_alerts FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para criar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
DROP FUNCTION IF EXISTS create_admin_notification(notification_type, TEXT, TEXT, notification_priority, TEXT, UUID, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION create_admin_notification(
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_priority notification_priority DEFAULT 'medium',
  p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
  v_admin_user RECORD;
BEGIN
  -- Criar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para todos os admins
  FOR v_admin_user IN
    SELECT DISTINCT user_id
    FROM user_roles
    WHERE role = 'admin'::app_role
  LOOP
    -- Verificar se o admin tem esse tipo de notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o habilitado
    IF EXISTS (
      SELECT 1 FROM admin_notification_settings
      WHERE user_id = v_admin_user.user_id
      AND (
        (p_type = 'new_quote' AND new_quote_enabled) OR
        (p_type = 'payment_received' AND payment_received_enabled) OR
        (p_type = 'support_ticket' AND support_ticket_enabled) OR
        (p_type = 'subscription_canceled' AND subscription_canceled_enabled) OR
        (p_type = 'low_stock' AND low_stock_enabled) OR
        (p_type = 'system_error' AND system_error_enabled) OR
        (p_type = 'new_user' AND new_user_enabled) OR
        (p_type = 'preorder_completed' AND preorder_completed_enabled) OR
        (p_type = 'production_ready' AND production_ready_enabled) OR
        (p_type = 'message_received' AND message_received_enabled)
      )
    ) OR NOT EXISTS (
      SELECT 1 FROM admin_notification_settings WHERE user_id = v_admin_user.user_id
    ) THEN
      INSERT INTO admin_notifications (
        type,
        title,
        message,
        priority,
        related_id,
        related_type,
        action_url,
        icon,
        recipient_user_id,
        metadata
      ) VALUES (
        p_type,
        p_title,
        p_message,
        p_priority,
        p_related_id,
        p_related_type,
        p_action_url,
        p_icon,
        v_admin_user.user_id,
        p_metadata
      )
      RETURNING id INTO v_notification_id;
    END IF;
  END LOOP;

  RETURN v_notification_id;
END;
$$;

-- FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para marcar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o como lida
DROP FUNCTION IF EXISTS mark_notification_read(UUID);
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = p_notification_id AND recipient_user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para marcar todas as notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes como lidas
DROP FUNCTION IF EXISTS mark_all_notifications_read();
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE admin_notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE recipient_user_id = auth.uid() AND is_read = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para limpar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes antigas
DROP FUNCTION IF EXISTS cleanup_old_notifications();
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM admin_notifications
  WHERE (
    -- NotificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes lidas com mais de 30 dias
    (is_read = TRUE AND read_at < NOW() - INTERVAL '30 days') OR
    -- NotificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes expiradas
    (expires_at IS NOT NULL AND expires_at < NOW()) OR
    -- NotificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes nÃƒÆ’Ã‚Â£o lidas com mais de 90 dias
    (is_read = FALSE AND created_at < NOW() - INTERVAL '90 days')
  );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Trigger para criar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o quando novo orÃƒÆ’Ã‚Â§amento ÃƒÆ’Ã‚Â© criado
DROP FUNCTION IF EXISTS notify_new_quote() CASCADE;
CREATE OR REPLACE FUNCTION notify_new_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM create_admin_notification(
    'new_quote',
    'Novo OrÃƒÆ’Ã‚Â§amento',
    'Um novo orÃƒÆ’Ã‚Â§amento foi solicitado',
    'medium',
    NEW.id,
    'quotes',
    '/admin/orcamentos/' || NEW.id::text,
    'FileText',
    jsonb_build_object(
      'quote_id', NEW.id,
      'user_id', NEW.user_id,
      'total_amount', NEW.total_amount
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_quote
  AFTER INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_quote();

-- Trigger para criar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o quando pagamento ÃƒÆ’Ã‚Â© recebido
DROP FUNCTION IF EXISTS notify_payment_received() CASCADE;
CREATE OR REPLACE FUNCTION notify_payment_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    PERFORM create_admin_notification(
      'payment_received',
      'Pagamento Recebido',
      'Um pagamento foi confirmado',
      'high',
      NEW.id,
      'payments',
      '/admin/pagamentos/' || NEW.id::text,
      'DollarSign',
      jsonb_build_object(
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'user_id', NEW.user_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Nota: Adicionar trigger quando tabela de payments estiver disponÃƒÆ’Ã‚Â­vel
-- CREATE TRIGGER trigger_notify_payment_received
--   AFTER UPDATE ON payments
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_payment_received();

-- Trigger para criar notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o quando ticket de suporte ÃƒÆ’Ã‚Â© aberto
DROP FUNCTION IF EXISTS notify_support_ticket() CASCADE;
CREATE OR REPLACE FUNCTION notify_support_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'open' THEN
    PERFORM create_admin_notification(
      'support_ticket',
      'Novo Ticket de Suporte',
      'Um novo ticket de suporte foi aberto',
      'high',
      NEW.id,
      'support_conversations',
      '/admin/suporte/' || NEW.id::text,
      'HeadphonesIcon',
      jsonb_build_object(
        'conversation_id', NEW.id,
        'user_id', NEW.user_id,
        'subject', NEW.subject
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_support_ticket
  AFTER INSERT ON support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION notify_support_ticket();

-- Habilitar realtime para admin_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;

-- ComentÃƒÆ’Ã‚Â¡rios
COMMENT ON TABLE admin_notifications IS 'NotificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em tempo real para administradores';
COMMENT ON TABLE admin_notification_settings IS 'ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o por usuÃƒÆ’Ã‚Â¡rio admin';
COMMENT ON TABLE admin_alerts IS 'Alertas configurÃƒÆ’Ã‚Â¡veis baseados em mÃƒÆ’Ã‚Â©tricas';
COMMENT ON FUNCTION create_admin_notification IS 'Cria notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para todos os admins';
COMMENT ON FUNCTION mark_notification_read IS 'Marca notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o como lida';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Marca todas as notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes como lidas';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Remove notificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes antigas';

-- Inserir configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes padrÃƒÆ’Ã‚Â£o para admins existentes
INSERT INTO admin_notification_settings (user_id)
SELECT DISTINCT user_id
FROM user_roles
WHERE role = 'admin'::app_role
ON CONFLICT (user_id) DO NOTHING;
