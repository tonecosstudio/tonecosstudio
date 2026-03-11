-- =====================================================
-- Migration: Add Missing Columns to admin_notifications and Create RPC
-- Description: Adiciona colunas faltantes e função RPC para criar notificações
-- =====================================================

-- =====================================================
-- ADICIONAR COLUNAS FALTANTES
-- =====================================================

ALTER TABLE admin_notifications
ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' NOT NULL,
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS related_id UUID,
ADD COLUMN IF NOT EXISTS related_type TEXT,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_admin_notifications_recipient ON admin_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON admin_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_related ON admin_notifications(related_id, related_type);

-- =====================================================
-- ATUALIZAR RLS POLICIES
-- =====================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "admin_notifications_select_admin" ON admin_notifications;
DROP POLICY IF EXISTS "admin_notifications_modify_admin" ON admin_notifications;

-- Usuários veem suas próprias notificações
CREATE POLICY "admin_notifications_select_own"
  ON admin_notifications FOR SELECT
  USING (
    recipient_user_id = auth.uid() OR
    (recipient_user_id IS NULL AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ))
  );

-- Usuários podem marcar suas próprias como lidas
CREATE POLICY "admin_notifications_update_own"
  ON admin_notifications FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- Apenas admins podem criar notificações
CREATE POLICY "admin_notifications_insert_admin"
  ON admin_notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Apenas admins podem deletar
CREATE POLICY "admin_notifications_delete_admin"
  ON admin_notifications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- RPC FUNCTION: create_admin_notification
-- =====================================================

CREATE OR REPLACE FUNCTION create_admin_notification(
  p_type TEXT DEFAULT 'info',
  p_title TEXT DEFAULT 'Notificação',
  p_message TEXT DEFAULT '',
  p_priority TEXT DEFAULT 'medium',
  p_icon TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_recipient_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_admin_user RECORD;
BEGIN
  -- Se recipient_user_id foi especificado, criar apenas para esse usuário
  IF p_recipient_user_id IS NOT NULL THEN
    INSERT INTO admin_notifications (
      type,
      title,
      message,
      priority,
      icon,
      action_url,
      related_id,
      related_type,
      metadata,
      recipient_user_id
    ) VALUES (
      p_type,
      p_title,
      p_message,
      p_priority,
      p_icon,
      p_action_url,
      p_related_id,
      p_related_type,
      p_metadata,
      p_recipient_user_id
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
  END IF;

  -- Caso contrário, criar para todos os admins
  FOR v_admin_user IN
    SELECT id
    FROM profiles
    WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO admin_notifications (
      type,
      title,
      message,
      priority,
      icon,
      action_url,
      related_id,
      related_type,
      metadata,
      recipient_user_id
    ) VALUES (
      p_type,
      p_title,
      p_message,
      p_priority,
      p_icon,
      p_action_url,
      p_related_id,
      p_related_type,
      p_metadata,
      v_admin_user.id
    )
    RETURNING id INTO v_notification_id;
  END LOOP;

  RETURN v_notification_id;
END;
$$;

-- =====================================================
-- RPC FUNCTION: mark_notification_read
-- =====================================================

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_notifications
  SET is_read = true,
      read_at = NOW(),
      updated_at = NOW()
  WHERE id = p_notification_id
    AND recipient_user_id = auth.uid();
END;
$$;

-- =====================================================
-- RPC FUNCTION: mark_all_notifications_read
-- =====================================================

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_notifications
  SET is_read = true,
      read_at = NOW(),
      updated_at = NOW()
  WHERE recipient_user_id = auth.uid()
    AND is_read = false;
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN admin_notifications.recipient_user_id IS 'ID do admin que receberá a notificação. NULL = todos os admins';
COMMENT ON COLUMN admin_notifications.priority IS 'Prioridade: low, medium, high, urgent';
COMMENT ON COLUMN admin_notifications.icon IS 'Nome do ícone a ser exibido';
COMMENT ON COLUMN admin_notifications.action_url IS 'URL para ação ao clicar na notificação';
COMMENT ON COLUMN admin_notifications.related_id IS 'ID do registro relacionado';
COMMENT ON COLUMN admin_notifications.related_type IS 'Tipo do registro relacionado (quote, payment, etc)';
COMMENT ON COLUMN admin_notifications.read_at IS 'Timestamp de quando foi lida';
COMMENT ON COLUMN admin_notifications.metadata IS 'Dados adicionais em formato JSON';

COMMENT ON FUNCTION create_admin_notification IS 'Cria notificação para admin(s) específico(s) ou todos';
COMMENT ON FUNCTION mark_notification_read IS 'Marca notificação como lida';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Marca todas as notificações do usuário como lidas';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
