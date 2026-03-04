-- =====================================================
-- MIGRATION: Create payment_info_requests table
-- Date: 2026-03-02
-- Description: Sistema de solicitaÃƒÂ§ÃƒÂ£o de informaÃƒÂ§ÃƒÂµes para pagamentos manuais
-- =====================================================

-- =====================================================
-- 1. CREATE PAYMENT_INFO_REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_info_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES manual_payments(id) ON DELETE CASCADE,
  requested_by_admin_id UUID REFERENCES auth.users(id),
  requested_by_admin_name TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'cancelled')),
  response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

CREATE INDEX idx_payment_info_requests_payment ON payment_info_requests(payment_id);
CREATE INDEX idx_payment_info_requests_status ON payment_info_requests(status);
CREATE INDEX idx_payment_info_requests_created ON payment_info_requests(created_at DESC);

-- =====================================================
-- 3. CREATE NOTIFICATIONS TABLE (se nÃƒÂ£o existir)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  related_type TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. CREATE INDEXES FOR NOTIFICATIONS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_user_notifications_related ON user_notifications(related_id, related_type);

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE payment_info_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE RLS POLICIES
-- =====================================================

CREATE POLICY "Admins can view all payment info requests"
  ON payment_info_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create payment info requests"
  ON payment_info_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 7. CREATE TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_payment_info_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_info_requests_updated_at
  BEFORE UPDATE ON payment_info_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_info_requests_updated_at();

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON payment_info_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_notifications TO authenticated;
GRANT ALL ON payment_info_requests TO service_role;
GRANT ALL ON user_notifications TO service_role;

-- =====================================================
-- 9. ADD COMMENTS
-- =====================================================

COMMENT ON TABLE payment_info_requests IS 'SolicitaÃƒÂ§ÃƒÂµes de informaÃƒÂ§ÃƒÂµes adicionais para pagamentos manuais';
COMMENT ON TABLE user_notifications IS 'NotificaÃƒÂ§ÃƒÂµes para usuÃƒÂ¡rios do sistema';
COMMENT ON COLUMN payment_info_requests.payment_id IS 'ID do pagamento manual relacionado';
COMMENT ON COLUMN payment_info_requests.message IS 'Mensagem solicitando informaÃƒÂ§ÃƒÂµes especÃƒÂ­ficas';
COMMENT ON COLUMN payment_info_requests.status IS 'Status: pending, responded, cancelled';
COMMENT ON COLUMN user_notifications.type IS 'Tipo de notificaÃƒÂ§ÃƒÂ£o (payment_info_request, order_update, etc)';
COMMENT ON COLUMN user_notifications.related_id IS 'ID do objeto relacionado (payment_id, order_id, etc)';
COMMENT ON COLUMN user_notifications.related_type IS 'Tipo do objeto relacionado (manual_payment, order, etc)';
