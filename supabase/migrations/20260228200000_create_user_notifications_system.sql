-- =====================================================
-- SISTEMA DE NOTIFICAÃƒâ€¡Ãƒâ€¢ES PARA USUÃƒÂRIOS - FASE 5
-- =====================================================
-- Criado em: 2026-02-28
-- DescriÃƒÂ§ÃƒÂ£o: Sistema completo de notificaÃƒÂ§ÃƒÂµes em tempo real para usuÃƒÂ¡rios finais
-- =====================================================

-- Criar enum para tipos de notificaÃƒÂ§ÃƒÂ£o de usuÃƒÂ¡rio
DO $$ 
BEGIN
  CREATE TYPE user_notification_type AS ENUM (
    'order_status',
    'payment_confirmed',
    'payment_pending',
    'shipping_update',
    'delivery_completed',
    'subscription_renewal',
    'subscription_expiring',
    'new_collection',
    'group_message',
    'group_invitation',
    'support_response',
    'wishlist_available',
    'price_drop',
    'system_announcement'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar tabela de notificaÃƒÂ§ÃƒÂµes de usuÃƒÂ¡rio
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- DestinatÃƒÂ¡rio
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo e prioridade
  type user_notification_type NOT NULL,
  priority notification_priority DEFAULT 'medium',
  
  -- ConteÃƒÂºdo
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT, -- Nome do ÃƒÂ­cone Lucide
  
  -- Dados relacionados
  related_id UUID, -- ID do recurso relacionado (order, payment, etc)
  related_type TEXT, -- Tipo do recurso (orders, payments, etc)
  action_url TEXT, -- URL para aÃƒÂ§ÃƒÂ£o (ex: /pedidos/123)
  action_label TEXT, -- Label do botÃƒÂ£o de aÃƒÂ§ÃƒÂ£o (ex: "Ver Pedido")
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NotificaÃƒÂ§ÃƒÂµes podem expirar
  
  -- ÃƒÂndices
  CONSTRAINT valid_user_notification_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

-- Adicionar coluna priority se nÃƒÂ£o existir (para migrations antigas)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE user_notifications ADD COLUMN priority notification_priority DEFAULT 'medium';
  END IF;
END $$;

-- Criar ÃƒÂ­ndices para performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_priority ON user_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_related ON user_notifications(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;

-- Criar tabela de configuraÃƒÂ§ÃƒÂµes de notificaÃƒÂ§ÃƒÂ£o por usuÃƒÂ¡rio
CREATE TABLE IF NOT EXISTS user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- ConfiguraÃƒÂ§ÃƒÂµes por tipo
  order_status_enabled BOOLEAN DEFAULT TRUE,
  payment_confirmed_enabled BOOLEAN DEFAULT TRUE,
  payment_pending_enabled BOOLEAN DEFAULT TRUE,
  shipping_update_enabled BOOLEAN DEFAULT TRUE,
  delivery_completed_enabled BOOLEAN DEFAULT TRUE,
  subscription_renewal_enabled BOOLEAN DEFAULT TRUE,
  subscription_expiring_enabled BOOLEAN DEFAULT TRUE,
  new_collection_enabled BOOLEAN DEFAULT TRUE,
  group_message_enabled BOOLEAN DEFAULT TRUE,
  group_invitation_enabled BOOLEAN DEFAULT TRUE,
  support_response_enabled BOOLEAN DEFAULT TRUE,
  wishlist_available_enabled BOOLEAN DEFAULT TRUE,
  price_drop_enabled BOOLEAN DEFAULT TRUE,
  system_announcement_enabled BOOLEAN DEFAULT TRUE,
  
  -- ConfiguraÃƒÂ§ÃƒÂµes de som
  sound_enabled BOOLEAN DEFAULT TRUE,
  sound_volume INTEGER DEFAULT 50 CHECK (sound_volume BETWEEN 0 AND 100),
  
  -- ConfiguraÃƒÂ§ÃƒÂµes de email
  email_enabled BOOLEAN DEFAULT TRUE,
  email_frequency TEXT DEFAULT 'instant', -- instant, daily, weekly
  
  -- ConfiguraÃƒÂ§ÃƒÂµes de push (futuro)
  push_enabled BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar ÃƒÂ­ndice
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user ON user_notification_settings(user_id);

-- Habilitar RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- PolÃƒÂ­ticas RLS para user_notifications
DROP POLICY IF EXISTS "UsuÃƒÂ¡rios podem ver suas notificaÃƒÂ§ÃƒÂµes" ON user_notifications;
CREATE POLICY "UsuÃƒÂ¡rios podem ver suas notificaÃƒÂ§ÃƒÂµes"
  ON user_notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Sistema pode criar notificaÃƒÂ§ÃƒÂµes" ON user_notifications;
CREATE POLICY "Sistema pode criar notificaÃƒÂ§ÃƒÂµes"
  ON user_notifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "UsuÃƒÂ¡rios podem atualizar suas notificaÃƒÂ§ÃƒÂµes" ON user_notifications;
CREATE POLICY "UsuÃƒÂ¡rios podem atualizar suas notificaÃƒÂ§ÃƒÂµes"
  ON user_notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "UsuÃƒÂ¡rios podem deletar suas notificaÃƒÂ§ÃƒÂµes" ON user_notifications;
CREATE POLICY "UsuÃƒÂ¡rios podem deletar suas notificaÃƒÂ§ÃƒÂµes"
  ON user_notifications FOR DELETE
  USING (user_id = auth.uid());

-- PolÃƒÂ­ticas RLS para user_notification_settings
DROP POLICY IF EXISTS "UsuÃƒÂ¡rios podem ver suas configuraÃƒÂ§ÃƒÂµes" ON user_notification_settings;
CREATE POLICY "UsuÃƒÂ¡rios podem ver suas configuraÃƒÂ§ÃƒÂµes"
  ON user_notification_settings FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "UsuÃƒÂ¡rios podem criar suas configuraÃƒÂ§ÃƒÂµes" ON user_notification_settings;
CREATE POLICY "UsuÃƒÂ¡rios podem criar suas configuraÃƒÂ§ÃƒÂµes"
  ON user_notification_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "UsuÃƒÂ¡rios podem atualizar suas configuraÃƒÂ§ÃƒÂµes" ON user_notification_settings;
CREATE POLICY "UsuÃƒÂ¡rios podem atualizar suas configuraÃƒÂ§ÃƒÂµes"
  ON user_notification_settings FOR UPDATE
  USING (user_id = auth.uid());

-- FunÃƒÂ§ÃƒÂ£o para criar notificaÃƒÂ§ÃƒÂ£o de usuÃƒÂ¡rio
CREATE OR REPLACE FUNCTION create_user_notification(
  p_user_id UUID,
  p_type user_notification_type,
  p_title TEXT,
  p_message TEXT,
  p_priority notification_priority DEFAULT 'medium',
  p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
  v_settings RECORD;
BEGIN
  -- Verificar se o usuÃƒÂ¡rio tem esse tipo de notificaÃƒÂ§ÃƒÂ£o habilitado
  SELECT * INTO v_settings
  FROM user_notification_settings
  WHERE user_id = p_user_id;
  
  -- Se nÃƒÂ£o tem configuraÃƒÂ§ÃƒÂµes, criar com padrÃƒÂµes
  IF NOT FOUND THEN
    INSERT INTO user_notification_settings (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_settings;
  END IF;
  
  -- Verificar se o tipo estÃƒÂ¡ habilitado
  IF (
    (p_type = 'order_status' AND v_settings.order_status_enabled) OR
    (p_type = 'payment_confirmed' AND v_settings.payment_confirmed_enabled) OR
    (p_type = 'payment_pending' AND v_settings.payment_pending_enabled) OR
    (p_type = 'shipping_update' AND v_settings.shipping_update_enabled) OR
    (p_type = 'delivery_completed' AND v_settings.delivery_completed_enabled) OR
    (p_type = 'subscription_renewal' AND v_settings.subscription_renewal_enabled) OR
    (p_type = 'subscription_expiring' AND v_settings.subscription_expiring_enabled) OR
    (p_type = 'new_collection' AND v_settings.new_collection_enabled) OR
    (p_type = 'group_message' AND v_settings.group_message_enabled) OR
    (p_type = 'group_invitation' AND v_settings.group_invitation_enabled) OR
    (p_type = 'support_response' AND v_settings.support_response_enabled) OR
    (p_type = 'wishlist_available' AND v_settings.wishlist_available_enabled) OR
    (p_type = 'price_drop' AND v_settings.price_drop_enabled) OR
    (p_type = 'system_announcement' AND v_settings.system_announcement_enabled)
  ) THEN
    INSERT INTO user_notifications (
      user_id,
      type,
      title,
      message,
      priority,
      related_id,
      related_type,
      action_url,
      action_label,
      icon,
      metadata
    ) VALUES (
      p_user_id,
      p_type,
      p_title,
      p_message,
      p_priority,
      p_related_id,
      p_related_type,
      p_action_url,
      p_action_label,
      p_icon,
      p_metadata
    )
    RETURNING id INTO v_notification_id;
  END IF;

  RETURN v_notification_id;
END;
$$;

-- FunÃƒÂ§ÃƒÂ£o para marcar notificaÃƒÂ§ÃƒÂ£o como lida
CREATE OR REPLACE FUNCTION mark_user_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- FunÃƒÂ§ÃƒÂ£o para marcar todas as notificaÃƒÂ§ÃƒÂµes como lidas
CREATE OR REPLACE FUNCTION mark_all_user_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- FunÃƒÂ§ÃƒÂ£o para deletar notificaÃƒÂ§ÃƒÂ£o
CREATE OR REPLACE FUNCTION delete_user_notification(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_notifications
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- FunÃƒÂ§ÃƒÂ£o para limpar notificaÃƒÂ§ÃƒÂµes antigas
CREATE OR REPLACE FUNCTION cleanup_old_user_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM user_notifications
  WHERE (
    -- NotificaÃƒÂ§ÃƒÂµes lidas com mais de 30 dias
    (is_read = TRUE AND read_at < NOW() - INTERVAL '30 days') OR
    -- NotificaÃƒÂ§ÃƒÂµes expiradas
    (expires_at IS NOT NULL AND expires_at < NOW()) OR
    -- NotificaÃƒÂ§ÃƒÂµes nÃƒÂ£o lidas com mais de 90 dias
    (is_read = FALSE AND created_at < NOW() - INTERVAL '90 days')
  );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Habilitar realtime para user_notifications
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
  END IF;
END $$;

-- ComentÃƒÂ¡rios
COMMENT ON TABLE user_notifications IS 'NotificaÃƒÂ§ÃƒÂµes em tempo real para usuÃƒÂ¡rios finais';
COMMENT ON TABLE user_notification_settings IS 'ConfiguraÃƒÂ§ÃƒÂµes de notificaÃƒÂ§ÃƒÂ£o por usuÃƒÂ¡rio';
COMMENT ON FUNCTION create_user_notification IS 'Cria notificaÃƒÂ§ÃƒÂ£o para um usuÃƒÂ¡rio especÃƒÂ­fico';
COMMENT ON FUNCTION mark_user_notification_read IS 'Marca notificaÃƒÂ§ÃƒÂ£o como lida';
COMMENT ON FUNCTION mark_all_user_notifications_read IS 'Marca todas as notificaÃƒÂ§ÃƒÂµes como lidas';
COMMENT ON FUNCTION delete_user_notification IS 'Deleta uma notificaÃƒÂ§ÃƒÂ£o';
COMMENT ON FUNCTION cleanup_old_user_notifications IS 'Remove notificaÃƒÂ§ÃƒÂµes antigas';

-- Criar configuraÃƒÂ§ÃƒÂµes padrÃƒÂ£o para usuÃƒÂ¡rios existentes
INSERT INTO user_notification_settings (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Exemplos de notificaÃƒÂ§ÃƒÂµes para teste (comentado)
-- SELECT create_user_notification(
--   'user-uuid-here',
--   'order_status',
--   'Pedido Confirmado',
--   'Seu pedido #12345 foi confirmado e estÃƒÂ¡ sendo preparado.',
--   'medium',
--   'order-uuid',
--   'orders',
--   '/pedidos/order-uuid',
--   'Ver Pedido',
--   'Package'
-- );
