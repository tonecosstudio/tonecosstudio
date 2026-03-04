-- ============================================
-- SISTEMA DE WISHLIST, NOTIFICAÃƒâ€¡Ãƒâ€¢ES E CUPONS
-- ============================================

-- ============================================
-- 1. WISHLIST (Lista de Desejos)
-- ============================================

CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  notes TEXT,
  priority INTEGER DEFAULT 0, -- 0=normal, 1=alta, 2=urgente
  notify_when_available BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_model_id ON wishlist(model_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_priority ON wishlist(user_id, priority DESC);

-- RLS para wishlist
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_wishlist" ON wishlist;
CREATE POLICY "users_manage_own_wishlist"
  ON wishlist FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admins_view_all_wishlists" ON wishlist;
CREATE POLICY "admins_view_all_wishlists"
  ON wishlist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- ============================================
-- 2. NOTIFICAÃƒâ€¡Ãƒâ€¢ES
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN (
    'order_update',      -- AtualizaÃƒÂ§ÃƒÂ£o de pedido
    'quote_response',    -- Resposta de orÃƒÂ§amento
    'new_model',         -- Novo modelo adicionado
    'wishlist_available',-- Item da wishlist disponÃƒÂ­vel
    'badge_earned',      -- Badge conquistado
    'level_up',          -- Subiu de nÃƒÂ­vel
    'system',            -- NotificaÃƒÂ§ÃƒÂ£o do sistema
    'promotion'          -- PromoÃƒÂ§ÃƒÂ£o/Marketing
  )),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL para onde a notificaÃƒÂ§ÃƒÂ£o leva
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Dados extras em JSON
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ -- NotificaÃƒÂ§ÃƒÂµes podem expirar
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- RLS para notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_notifications" ON notifications;
CREATE POLICY "users_view_own_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;
CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_own_notifications" ON notifications;
CREATE POLICY "users_delete_own_notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admins_manage_notifications" ON notifications;
CREATE POLICY "admins_manage_notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- FunÃƒÂ§ÃƒÂ£o para marcar notificaÃƒÂ§ÃƒÂ£o como lida
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true, read_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FunÃƒÂ§ÃƒÂ£o para marcar todas como lidas
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. CUPONS
-- ============================================

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Tipo de desconto
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  
  -- Valor mÃƒÂ­nimo do pedido
  min_order_value DECIMAL(10,2) DEFAULT 0,
  
  -- Limites de uso
  max_uses INTEGER, -- NULL = ilimitado
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  
  -- RestriÃƒÂ§ÃƒÂµes
  applicable_to TEXT, -- 'all', 'category', 'franchise', 'model'
  applicable_ids TEXT[], -- IDs especÃƒÂ­ficos se aplicÃƒÂ¡vel
  
  -- Validade
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, valid_from, valid_until);

-- Tabela de uso de cupons
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  
  discount_applied DECIMAL(10,2) NOT NULL,
  order_value DECIMAL(10,2) NOT NULL,
  
  used_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(coupon_id, quote_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_used_at ON coupon_usage(used_at DESC);

-- RLS para coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- UsuÃƒÂ¡rios podem ver cupons ativos
DROP POLICY IF EXISTS "users_view_active_coupons" ON coupons;
CREATE POLICY "users_view_active_coupons"
  ON coupons FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND valid_from <= now() 
    AND (valid_until IS NULL OR valid_until >= now())
  );

-- Admins podem gerenciar todos os cupons
DROP POLICY IF EXISTS "admins_manage_coupons" ON coupons;
CREATE POLICY "admins_manage_coupons"
  ON coupons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS para coupon_usage
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_coupon_usage" ON coupon_usage;
CREATE POLICY "users_view_own_coupon_usage"
  ON coupon_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "system_insert_coupon_usage" ON coupon_usage;
CREATE POLICY "system_insert_coupon_usage"
  ON coupon_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admins_view_all_coupon_usage" ON coupon_usage;
CREATE POLICY "admins_view_all_coupon_usage"
  ON coupon_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- FunÃƒÂ§ÃƒÂ£o para validar cupom
CREATE OR REPLACE FUNCTION validate_coupon(
  coupon_code TEXT,
  user_id_param UUID,
  order_value_param DECIMAL
)
RETURNS TABLE (
  valid BOOLEAN,
  message TEXT,
  discount_amount DECIMAL,
  coupon_id UUID
) AS $$
DECLARE
  coupon_record RECORD;
  usage_count INTEGER;
  user_usage_count INTEGER;
BEGIN
  -- Buscar cupom
  SELECT * INTO coupon_record
  FROM coupons
  WHERE code = coupon_code
  AND is_active = true
  AND valid_from <= now()
  AND (valid_until IS NULL OR valid_until >= now());
  
  -- Cupom nÃƒÂ£o encontrado ou invÃƒÂ¡lido
  IF coupon_record IS NULL THEN
    RETURN QUERY SELECT false, 'Cupom invÃƒÂ¡lido ou expirado'::TEXT, 0::DECIMAL, NULL::UUID;
    RETURN;
  END IF;
  
  -- Verificar valor mÃƒÂ­nimo
  IF order_value_param < coupon_record.min_order_value THEN
    RETURN QUERY SELECT 
      false, 
      'Valor mÃƒÂ­nimo do pedido: R$ ' || coupon_record.min_order_value::TEXT,
      0::DECIMAL,
      NULL::UUID;
    RETURN;
  END IF;
  
  -- Verificar limite total de usos
  IF coupon_record.max_uses IS NOT NULL AND coupon_record.current_uses >= coupon_record.max_uses THEN
    RETURN QUERY SELECT false, 'Cupom esgotado'::TEXT, 0::DECIMAL, NULL::UUID;
    RETURN;
  END IF;
  
  -- Verificar limite por usuÃƒÂ¡rio
  SELECT COUNT(*) INTO user_usage_count
  FROM coupon_usage
  WHERE coupon_id = coupon_record.id
  AND user_id = user_id_param;
  
  IF user_usage_count >= coupon_record.max_uses_per_user THEN
    RETURN QUERY SELECT false, 'VocÃƒÂª jÃƒÂ¡ usou este cupom'::TEXT, 0::DECIMAL, NULL::UUID;
    RETURN;
  END IF;
  
  -- Calcular desconto
  DECLARE
    discount DECIMAL;
  BEGIN
    IF coupon_record.discount_type = 'percentage' THEN
      discount := order_value_param * (coupon_record.discount_value / 100);
    ELSE
      discount := coupon_record.discount_value;
    END IF;
    
    -- Desconto nÃƒÂ£o pode ser maior que o valor do pedido
    IF discount > order_value_param THEN
      discount := order_value_param;
    END IF;
    
    RETURN QUERY SELECT true, 'Cupom vÃƒÂ¡lido'::TEXT, discount, coupon_record.id;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar contador de usos
CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coupons 
  SET current_uses = current_uses + 1
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_coupon_usage ON coupon_usage;
CREATE TRIGGER trigger_increment_coupon_usage
  AFTER INSERT ON coupon_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_coupon_usage();

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_coupons_updated_at ON coupons;
CREATE TRIGGER trigger_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================
-- CONCLUÃƒÂDO!
-- ============================================
