-- ============================================
-- APLICAR NO SUPABASE SQL EDITOR
-- ============================================
-- Sistema de Wishlist, Notificações e Cupons

-- Copie e cole TODO este arquivo no SQL Editor do Supabase

-- ============================================
-- SISTEMA DE WISHLIST, NOTIFICAÇÕES E CUPONS
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
-- 2. NOTIFICAÇÕES
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN (
    'order_update',      -- Atualização de pedido
    'quote_response',    -- Resposta de orçamento
    'new_model',         -- Novo modelo adicionado
    'wishlist_available',-- Item da wishlist disponível
    'badge_earned',      -- Badge conquistado
    'level_up',          -- Subiu de nível
    'system',            -- Notificação do sistema
    'promotion'          -- Promoção/Marketing
  )),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL para onde a notificação leva
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Dados extras em JSON
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ -- Notificações podem expirar
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

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications 
  SET is_read = true, read_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar todas como lidas
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
  
  -- Valor mínimo do pedido
  min_order_value DECIMAL(10,2) DEFAULT 0,
  
  -- Limites de uso
  max_uses INTEGER, -- NULL = ilimitado
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  
  -- Restrições
  applicable_to TEXT, -- 'all', 'category', 'franchise', 'model'
  applicable_ids TEXT[], -- IDs específicos se aplicável
  
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

-- Usuários podem ver cupons ativos
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

-- Função para validar cupom
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
  
  -- Cupom não encontrado ou inválido
  IF coupon_record IS NULL THEN
    RETURN QUERY SELECT false, 'Cupom inválido ou expirado'::TEXT, 0::DECIMAL, NULL::UUID;
    RETURN;
  END IF;
  
  -- Verificar valor mínimo
  IF order_value_param < coupon_record.min_order_value THEN
    RETURN QUERY SELECT 
      false, 
      'Valor mínimo do pedido: R$ ' || coupon_record.min_order_value::TEXT,
      0::DECIMAL,
      NULL::UUID;
    RETURN;
  END IF;
  
  -- Verificar limite total de usos
  IF coupon_record.max_uses IS NOT NULL AND coupon_record.current_uses >= coupon_record.max_uses THEN
    RETURN QUERY SELECT false, 'Cupom esgotado'::TEXT, 0::DECIMAL, NULL::UUID;
    RETURN;
  END IF;
  
  -- Verificar limite por usuário
  SELECT COUNT(*) INTO user_usage_count
  FROM coupon_usage
  WHERE coupon_id = coupon_record.id
  AND user_id = user_id_param;
  
  IF user_usage_count >= coupon_record.max_uses_per_user THEN
    RETURN QUERY SELECT false, 'Você já usou este cupom'::TEXT, 0::DECIMAL, NULL::UUID;
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
    
    -- Desconto não pode ser maior que o valor do pedido
    IF discount > order_value_param THEN
      discount := order_value_param;
    END IF;
    
    RETURN QUERY SELECT true, 'Cupom válido'::TEXT, discount, coupon_record.id;
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
-- CONCLUÍDO!
-- ============================================- -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 - -   S I S T E M A   D E   W I S H L I S T ,   N O T I F I C A � ! � " E S   E   C U P O N S 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 - -   1 .   W I S H L I S T   ( L i s t a   d e   D e s e j o s ) 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 
 
 C R E A T E   T A B L E   I F   N O T   E X I S T S   w i s h l i s t   ( 
 
     i d   U U I D   P R I M A R Y   K E Y   D E F A U L T   g e n _ r a n d o m _ u u i d ( ) , 
 
     u s e r _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   a u t h . u s e r s ( i d )   O N   D E L E T E   C A S C A D E , 
 
     m o d e l _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   m o d e l s ( i d )   O N   D E L E T E   C A S C A D E , 
 
     n o t e s   T E X T , 
 
     p r i o r i t y   I N T E G E R   D E F A U L T   0 ,   - -   0 = n o r m a l ,   1 = a l t a ,   2 = u r g e n t e 
 
     n o t i f y _ w h e n _ a v a i l a b l e   B O O L E A N   D E F A U L T   f a l s e , 
 
     a d d e d _ a t   T I M E S T A M P T Z   D E F A U L T   n o w ( ) , 
 
     U N I Q U E ( u s e r _ i d ,   m o d e l _ i d ) 
 
 ) ; 
 
 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ w i s h l i s t _ u s e r _ i d   O N   w i s h l i s t ( u s e r _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ w i s h l i s t _ m o d e l _ i d   O N   w i s h l i s t ( m o d e l _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ w i s h l i s t _ p r i o r i t y   O N   w i s h l i s t ( u s e r _ i d ,   p r i o r i t y   D E S C ) ; 
 
 
 
 - -   R L S   p a r a   w i s h l i s t 
 
 A L T E R   T A B L E   w i s h l i s t   E N A B L E   R O W   L E V E L   S E C U R I T Y ; 
 
 
 
 D R O P   P O L I C Y   I F   E X I S T S   " u s e r s _ m a n a g e _ o w n _ w i s h l i s t "   O N   w i s h l i s t ; 
 
 C R E A T E   P O L I C Y   " u s e r s _ m a n a g e _ o w n _ w i s h l i s t " 
 
     O N   w i s h l i s t   F O R   A L L 
 
     T O   a u t h e n t i c a t e d 
 
     U S I N G   ( u s e r _ i d   =   a u t h . u i d ( ) ) 
 
     W I T H   C H E C K   ( u s e r _ i d   =   a u t h . u i d ( ) ) ; 
 
 
 
 D R O P   P O L I C Y   I F   E X I S T S   " a d m i n s _ v i e w _ a l l _ w i s h l i s t s "   O N   w i s h l i s t ; 
 
 C R E A T E   P O L I C Y   " a d m i n s _ v i e w _ a l l _ w i s h l i s t s " 
 
     O N   w i s h l i s t   F O R   S E L E C T 
 
     T O   a u t h e n t i c a t e d 
 
     U S I N G   ( 
 
         E X I S T S   ( 
 
             S E L E C T   1   F R O M   u s e r _ r o l e s   
 
             W H E R E   u s e r _ r o l e s . u s e r _ i d   =   a u t h . u i d ( )   
 
             A N D   u s e r _ r o l e s . r o l e   =   ' a d m i n ' 
 
         ) 
 
     ) ; 
 
 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 - -   2 .   N O T I F I C A � ! � " E S 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 
 
 C R E A T E   T A B L E   I F   N O T   E X I S T S   n o t i f i c a t i o n s   ( 
 
     i d   U U I D   P R I M A R Y   K E Y   D E F A U L T   g e n _ r a n d o m _ u u i d ( ) , 
 
     u s e r _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   a u t h . u s e r s ( i d )   O N   D E L E T E   C A S C A D E , 
 
     
 
     t y p e   T E X T   N O T   N U L L   C H E C K   ( t y p e   I N   ( 
 
         ' o r d e r _ u p d a t e ' ,             - -   A t u a l i z a � � � � o   d e   p e d i d o 
 
         ' q u o t e _ r e s p o n s e ' ,         - -   R e s p o s t a   d e   o r � � a m e n t o 
 
         ' n e w _ m o d e l ' ,                   - -   N o v o   m o d e l o   a d i c i o n a d o 
 
         ' w i s h l i s t _ a v a i l a b l e ' , - -   I t e m   d a   w i s h l i s t   d i s p o n � � v e l 
 
         ' b a d g e _ e a r n e d ' ,             - -   B a d g e   c o n q u i s t a d o 
 
         ' l e v e l _ u p ' ,                     - -   S u b i u   d e   n � � v e l 
 
         ' s y s t e m ' ,                         - -   N o t i f i c a � � � � o   d o   s i s t e m a 
 
         ' p r o m o t i o n '                     - -   P r o m o � � � � o / M a r k e t i n g 
 
     ) ) , 
 
     
 
     t i t l e   T E X T   N O T   N U L L , 
 
     m e s s a g e   T E X T   N O T   N U L L , 
 
     l i n k   T E X T ,   - -   U R L   p a r a   o n d e   a   n o t i f i c a � � � � o   l e v a 
 
     
 
     i s _ r e a d   B O O L E A N   D E F A U L T   f a l s e , 
 
     r e a d _ a t   T I M E S T A M P T Z , 
 
     
 
     - -   D a d o s   e x t r a s   e m   J S O N 
 
     m e t a d a t a   J S O N B   D E F A U L T   ' { } ' , 
 
     
 
     c r e a t e d _ a t   T I M E S T A M P T Z   D E F A U L T   n o w ( ) , 
 
     e x p i r e s _ a t   T I M E S T A M P T Z   - -   N o t i f i c a � � � � e s   p o d e m   e x p i r a r 
 
 ) ; 
 
 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ n o t i f i c a t i o n s _ u s e r _ i d   O N   n o t i f i c a t i o n s ( u s e r _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ n o t i f i c a t i o n s _ u n r e a d   O N   n o t i f i c a t i o n s ( u s e r _ i d ,   i s _ r e a d )   W H E R E   i s _ r e a d   =   f a l s e ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ n o t i f i c a t i o n s _ c r e a t e d _ a t   O N   n o t i f i c a t i o n s ( c r e a t e d _ a t   D E S C ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ n o t i f i c a t i o n s _ t y p e   O N   n o t i f i c a t i o n s ( t y p e ) ; 
 
 
 
 - -   R L S   p a r a   n o t i f i c a t i o n s 
 
 A L T E R   T A B L E   n o t i f i c a t i o n s   E N A B L E   R O W   L E V E L   S E C U R I T Y ; 
 
 
 
 D R O P   P O L I C Y   I F   E X I S T S   " u s e r s _ v i e w _ o w n _ n o t i f i c a t i o n s "   O N   n o t i f i c a t i o n s ; 
 
 C R E A T E   P O L I C Y   " u s e r s _ v i e w _ o w n _ n o t i f i c a t i o n s " 
 
     O N   n o t i f i c a t i o n s   F O R   S E L E C T 
 
     T O   a u t h e n t i c a t e d 
 
     U S I N G   ( u s e r _ i d   =   a u t h . u i d ( ) ) ; 
 
 
 
 D R O P   P O L I C Y   I F   E X I S T S   " u s e r s _ u p d a t e _ o w n _ n o t i f i c a t i o n s "   O N   n o t i f i c a t i o n s ; 
 
 C R E A T E   P O L I C Y   " u s e r s _ u p d a t e _ o w n _ n o t i f i c a t i o n s " 
 
     O N   n o t i f i c a t i o n s   F O R   U P D A T E 
 
     T O   a u t h e n t i c a t e d 
 
     U S I N G   ( u s e r _ i d   =   a u t h . u i d ( ) ) 
 
     W I T H   C H E C K   ( u s e r _ i d   =   a u t h . u i d ( ) ) ; 
 
 
 
 D R O P   P O L I C Y   I F   E X I S T S   " u s e r s _ d e l e t e _ o w n _ n o t i f i c a t i o n s "   O N   n o t i f i c a t i o n s ; 
 
 C R E A T E   P O L I C Y   " u s e r s _ d e l e t e _ o w n _ n o t i f i c a t i o n s " 
 
     O N   n o t i f i c a t i o n s   F O R   D E L E T E 
 
     T O   a u t h e n t i c a t e d 
 
     U S I N G   ( u s e r _ i d   =   a u t h . u i d ( ) ) ; 
 
 
 
 D R O P   P O L I C Y   I F   E X I S T S   " a d m i n s _ m a n a g e _ n o t i f i c a t i o n s "   O N   n o t i f i c a t i o n s ; 
 
 C R E A T E   P O L I C Y   " a d m i n s _ m a n a g e _ n o t i f i c a t i o n s " 
 
     O N   n o t i f i c a t i o n s   F O R   A L L 
 
     T O   a u t h e n t i c a t e d 
 
     U S I N G   ( 
 
         E X I S T S   ( 
 
             S E L E C T   1   F R O M   u s e r _ r o l e s   
 
             W H E R E   u s e r _ r o l e s . u s e r _ i d   =   a u t h . u i d ( )   
 
             A N D   u s e r _ r o l e s . r o l e   =   ' a d m i n ' 
 
         ) 
 
     ) 
 
     W I T H   C H E C K   ( 
 
         E X I S T S   ( 
 
             S E L E C T   1   F R O M   u s e r _ r o l e s   
 
             W H E R E   u s e r _ r o l e s . u s e r _ i d   =   a u t h . u i d ( )   
 
             A N D   u s e r _ r o l e s . r o l e   =   ' a d m i n ' 
 
         ) 
 
     ) ; 
 
 
 
 - -   F u n � � � � o   p a r a   m a r c a r   n o t i f i c a � � � � o   c o m o   l i d a 
 
 C R E A T E   O R   R E P L A C E   F U N C T I O N   m a r k _ n o t i f i c a t i o n _ a s _ r e a d ( n o t i f i c a t i o n _ i d   U U I D ) 
 
 R E T U R N S   V O I D   A S   $ $ 
 
 B E G I N 
 
     U P D A T E   n o t i f i c a t i o n s   
 
     S E T   i s _ r e a d   =   t r u e ,   r e a d _ a t   =   n o w ( ) 
 
     W H E R E   i d   =   n o t i f i c a t i o n _ i d   A N D   u s e r _ i d   =   a u t h . u i d ( ) ; 
 
 E N D ; 
 
 $ $   L A N G U A G E   p l p g s q l   S E C U R I T Y   D E F I N E R ; 
 
 
 
 - -   F u n � � � � o   p a r a   m a r c a r   t o d a s   c o m o   l i d a s 
 
 C R E A T E   O R   R E P L A C E   F U N C T I O N   m a r k _ a l l _ n o t i f i c a t i o n s _ a s _ r e a d ( ) 
 
 R E T U R N S   V O I D   A S   $ $ 
 
 B E G I N 
 
     U P D A T E   n o t i f i c a t i o n s   
 
     S E T   i s _ r e a d   =   t r u e ,   r e a d _ a t   =   n o w ( ) 
 
     W H E R E   u s e r _ i d   =   a u t h . u i d ( )   A N D   i s _ r e a d   =   f a l s e ; 
 
 E N D ; 
 
 $ $   L A N G U A G E   p l p g s q l   S E C U R I T Y   D E F I N E R ; 
 
 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 - -   3 .   C U P O N S 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 
 
 C R E A T E   T A B L E   I F   N O T   E X I S T S   c o u p o n s   ( 
 
     i d   U U I D   P R I M A R Y   K E Y   D E F A U L T   g e n _ r a n d o m _ u u i d ( ) , 
 
     
 
     c o d e   T E X T   N O T   N U L L   U N I Q U E , 
 
     d e s c r i p t i o n   T E X T , 
 
     
 
     - -   T i p o   d e   d e s c o n t o 
 
     d i s c o u n t _ t y p e   T E X T   N O T   N U L L   C H E C K   ( d i s c o u n t _ t y p e   I N   ( ' p e r c e n t a g e ' ,   ' f i x e d _ a m o u n t ' ) ) , 
 
     d i s c o u n t _ v a l u e   D E C I M A L ( 1 0 , 2 )   N O T   N U L L   C H E C K   ( d i s c o u n t _ v a l u e   >   0 ) , 
 
     
 
     - -   V a l o r   m � � n i m o   d o   p e d i d o 
 
     m i n _ o r d e r _ v a l u e   D E C I M A L ( 1 0 , 2 )   D E F A U L T   0 , 
 
     
 
     - -   L i m i t e s   d e   u s o 
 
     m a x _ u s e s   I N T E G E R ,   - -   N U L L   =   i l i m i t a d o 
 
     m a x _ u s e s _ p e r _ u s e r   I N T E G E R   D E F A U L T   1 , 
 
     c u r r e n t _ u s e s   I N T E G E R   D E F A U L T   0 , 
 
     
 
     - -   R e s t r i � � � � e s 
 
     a p p l i c a b l e _ t o   T E X T ,   - -   ' a l l ' ,   ' c a t e g o r y ' ,   ' f r a n c h i s e ' ,   ' m o d e l ' 
 
     a p p l i c a b l e _ i d s   T E X T [ ] ,   - -   I D s   e s p e c � � f i c o s   s e   a p l i c � � v e l 
 
     
 
     - -   V a l i d a d e 
 
     v a l i d _ f r o m   T I M E S T A M P T Z   D E F A U L T   n o w ( ) , 
 
     v a l i d _ u n t i l   T I M E S T A M P T Z , 
 
     
 
     i s _ a c t i v e   B O O L E A N   D E F A U L T   t r u e , 
 
     
 
     c r e a t e d _ b y   U U I D   R E F E R E N C E S   a u t h . u s e r s ( i d ) , 
 
     c r e a t e d _ a t   T I M E S T A M P T Z   D E F A U L T   n o w ( ) , 
 
     u p d a t e d _ a t   T I M E S T A M P T Z   D E F A U L T   n o w ( ) 
 
 ) ; 
 
 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o u p o n s _ c o d e   O N   c o u p o n s ( c o d e )   W H E R E   i s _ a c t i v e   =   t r u e ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o u p o n s _ a c t i v e   O N   c o u p o n s ( i s _ a c t i v e ,   v a l i d _ f r o m ,   v a l i d _ u n t i l ) ; 
 
 
 
 - -   T a b e l a   d e   u s o   d e   c u p o n s 
 
 C R E A T E   T A B L E   I F   N O T   E X I S T S   c o u p o n _ u s a g e   ( 
 
     i d   U U I D   P R I M A R Y   K E Y   D E F A U L T   g e n _ r a n d o m _ u u i d ( ) , 
 
     c o u p o n _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   c o u p o n s ( i d )   O N   D E L E T E   C A S C A D E , 
 
     u s e r _ i d   U U I D   N O T   N U L L   R E F E R E N C E S   a u t h . u s e r s ( i d )   O N   D E L E T E   C A S C A D E , 
 
     q u o t e _ i d   U U I D   R E F E R E N C E S   q u o t e s ( i d )   O N   D E L E T E   S E T   N U L L , 
 
     
 
     d i s c o u n t _ a p p l i e d   D E C I M A L ( 1 0 , 2 )   N O T   N U L L , 
 
     o r d e r _ v a l u e   D E C I M A L ( 1 0 , 2 )   N O T   N U L L , 
 
     
 
     u s e d _ a t   T I M E S T A M P T Z   D E F A U L T   n o w ( ) , 
 
     
 
     U N I Q U E ( c o u p o n _ i d ,   q u o t e _ i d ) 
 
 ) ; 
 
 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o u p o n _ u s a g e _ c o u p o n _ i d   O N   c o u p o n _ u s a g e ( c o u p o n _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o u p o n _ u s a g e _ u s e r _ i d   O N   c o u p o n _ u s a g e ( u s e r _ i d ) ; 
 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ c o u p o n _ u s a g e _ u s e d _ a t   O N   c o u p o n _ u s a g e ( u s e d _ a t   D E S C ) ; 
 
 
 
 - -   R L S   p a r a   c o u p o n s 
 
 A L T E R   T A B L E   c o u p o n s   E N A B L E   R O W   L E V E L   S E C U R I T Y ; 
 
 
 
 - -   U s u � � r i o s   p o d e m   v e r   c u p o n s   a t i v o s 
 
 D R O P   P O L I C Y   I F   E X I S T S   " u s e r s _ v i e w _ a c t i v e _ c o u p o n s "   O N   c o u p o n s ; 
 
 C R E A T E   P O L I C Y   " u s e r s _ v i e w _ a c t i v e _ c o u p o n s " 
 
     O N   c o u p o n s   F O R   S E L E C T 
 
     T O   a u t h e n t i c a t e d 
 
     U S I N G   ( 
 
         i s _ a c t i v e   =   t r u e   
 
         A N D   v a l i d _ f r o m   < =   n o w ( )   
 
         A N D   ( v a l i d _ u n t i l   I S   N U L L   O R   v a l i d _ u n t i l   > =   n o w ( ) ) 
 
     ) ; 
 
 
 
 - -   A d m i n s   p o d e m   g e r e n c i a r   t o d o s   o s   c u p o n s 
 
 D R O P   P O L I C Y   I F   E X I S T S   " a d m i n s _ m a n a g e _ c o u p o n s "   O N   c o u p o n s ; 
 
 C R E A T E   P O L I C Y   " a d m i n s _ m a n a g e _ c o u p o n s " 
 
     O N   c o u p o n s   F O R   A L L 
 
     T O   a u t h e n t i c a t e d 
 
     U S I N G   ( 
 
         E X I S T S   ( 
 
             S E L E C T   1   F R O M   u s e r _ r o l e s   
 
             W H E R E   u s e r _ r o l e s . u s e r _ i d   =   a u t h . u i d ( )   
 
             A N D   u s e r _ r o l e s . r o l e   =   ' a d m i n ' 
 
         ) 
 
     ) 
 
     W I T H   C H E C K   ( 
 
         E X I S T S   ( 
 
             S E L E C T   1   F R O M   u s e r _ r o l e s   
 
             W H E R E   u s e r _ r o l e s . u s e r _ i d   =   a u t h . u i d ( )   
 
             A N D   u s e r _ r o l e s . r o l e   =   ' a d m i n ' 
 
         ) 
 
     ) ; 
 
 
 
 - -   R L S   p a r a   c o u p o n _ u s a g e 
 
 A L T E R   T A B L E   c o u p o n _ u s a g e   E N A B L E   R O W   L E V E L   S E C U R I T Y ; 
 
 
 
 D R O P   P O L I C Y   I F   E X I S T S   " u s e r s _ v i e w _ o w n _ c o u p o n _ u s a g e "   O N   c o u p o n _ u s a g e ; 
 
 C R E A T E   P O L I C Y   " u s e r s _ v i e w _ o w n _ c o u p o n _ u s a g e " 
 
     O N   c o u p o n _ u s a g e   F O R   S E L E C T 
 
     T O   a u t h e n t i c a t e d 
 
     U S I N G   ( u s e r _ i d   =   a u t h . u i d ( ) ) ; 
 
 
 
 D R O P   P O L I C Y   I F   E X I S T S   " s y s t e m _ i n s e r t _ c o u p o n _ u s a g e "   O N   c o u p o n _ u s a g e ; 
 
 C R E A T E   P O L I C Y   " s y s t e m _ i n s e r t _ c o u p o n _ u s a g e " 
 
     O N   c o u p o n _ u s a g e   F O R   I N S E R T 
 
     T O   a u t h e n t i c a t e d 
 
     W I T H   C H E C K   ( u s e r _ i d   =   a u t h . u i d ( ) ) ; 
 
 
 
 D R O P   P O L I C Y   I F   E X I S T S   " a d m i n s _ v i e w _ a l l _ c o u p o n _ u s a g e "   O N   c o u p o n _ u s a g e ; 
 
 C R E A T E   P O L I C Y   " a d m i n s _ v i e w _ a l l _ c o u p o n _ u s a g e " 
 
     O N   c o u p o n _ u s a g e   F O R   S E L E C T 
 
     T O   a u t h e n t i c a t e d 
 
     U S I N G   ( 
 
         E X I S T S   ( 
 
             S E L E C T   1   F R O M   u s e r _ r o l e s   
 
             W H E R E   u s e r _ r o l e s . u s e r _ i d   =   a u t h . u i d ( )   
 
             A N D   u s e r _ r o l e s . r o l e   =   ' a d m i n ' 
 
         ) 
 
     ) ; 
 
 
 
 - -   F u n � � � � o   p a r a   v a l i d a r   c u p o m 
 
 C R E A T E   O R   R E P L A C E   F U N C T I O N   v a l i d a t e _ c o u p o n ( 
 
     c o u p o n _ c o d e   T E X T , 
 
     u s e r _ i d _ p a r a m   U U I D , 
 
     o r d e r _ v a l u e _ p a r a m   D E C I M A L 
 
 ) 
 
 R E T U R N S   T A B L E   ( 
 
     v a l i d   B O O L E A N , 
 
     m e s s a g e   T E X T , 
 
     d i s c o u n t _ a m o u n t   D E C I M A L , 
 
     c o u p o n _ i d   U U I D 
 
 )   A S   $ $ 
 
 D E C L A R E 
 
     c o u p o n _ r e c o r d   R E C O R D ; 
 
     u s a g e _ c o u n t   I N T E G E R ; 
 
     u s e r _ u s a g e _ c o u n t   I N T E G E R ; 
 
 B E G I N 
 
     - -   B u s c a r   c u p o m 
 
     S E L E C T   *   I N T O   c o u p o n _ r e c o r d 
 
     F R O M   c o u p o n s 
 
     W H E R E   c o d e   =   c o u p o n _ c o d e 
 
     A N D   i s _ a c t i v e   =   t r u e 
 
     A N D   v a l i d _ f r o m   < =   n o w ( ) 
 
     A N D   ( v a l i d _ u n t i l   I S   N U L L   O R   v a l i d _ u n t i l   > =   n o w ( ) ) ; 
 
     
 
     - -   C u p o m   n � � o   e n c o n t r a d o   o u   i n v � � l i d o 
 
     I F   c o u p o n _ r e c o r d   I S   N U L L   T H E N 
 
         R E T U R N   Q U E R Y   S E L E C T   f a l s e ,   ' C u p o m   i n v � � l i d o   o u   e x p i r a d o ' : : T E X T ,   0 : : D E C I M A L ,   N U L L : : U U I D ; 
 
         R E T U R N ; 
 
     E N D   I F ; 
 
     
 
     - -   V e r i f i c a r   v a l o r   m � � n i m o 
 
     I F   o r d e r _ v a l u e _ p a r a m   <   c o u p o n _ r e c o r d . m i n _ o r d e r _ v a l u e   T H E N 
 
         R E T U R N   Q U E R Y   S E L E C T   
 
             f a l s e ,   
 
             ' V a l o r   m � � n i m o   d o   p e d i d o :   R $   '   | |   c o u p o n _ r e c o r d . m i n _ o r d e r _ v a l u e : : T E X T , 
 
             0 : : D E C I M A L , 
 
             N U L L : : U U I D ; 
 
         R E T U R N ; 
 
     E N D   I F ; 
 
     
 
     - -   V e r i f i c a r   l i m i t e   t o t a l   d e   u s o s 
 
     I F   c o u p o n _ r e c o r d . m a x _ u s e s   I S   N O T   N U L L   A N D   c o u p o n _ r e c o r d . c u r r e n t _ u s e s   > =   c o u p o n _ r e c o r d . m a x _ u s e s   T H E N 
 
         R E T U R N   Q U E R Y   S E L E C T   f a l s e ,   ' C u p o m   e s g o t a d o ' : : T E X T ,   0 : : D E C I M A L ,   N U L L : : U U I D ; 
 
         R E T U R N ; 
 
     E N D   I F ; 
 
     
 
     - -   V e r i f i c a r   l i m i t e   p o r   u s u � � r i o 
 
     S E L E C T   C O U N T ( * )   I N T O   u s e r _ u s a g e _ c o u n t 
 
     F R O M   c o u p o n _ u s a g e 
 
     W H E R E   c o u p o n _ i d   =   c o u p o n _ r e c o r d . i d 
 
     A N D   u s e r _ i d   =   u s e r _ i d _ p a r a m ; 
 
     
 
     I F   u s e r _ u s a g e _ c o u n t   > =   c o u p o n _ r e c o r d . m a x _ u s e s _ p e r _ u s e r   T H E N 
 
         R E T U R N   Q U E R Y   S E L E C T   f a l s e ,   ' V o c � �   j � �   u s o u   e s t e   c u p o m ' : : T E X T ,   0 : : D E C I M A L ,   N U L L : : U U I D ; 
 
         R E T U R N ; 
 
     E N D   I F ; 
 
     
 
     - -   C a l c u l a r   d e s c o n t o 
 
     D E C L A R E 
 
         d i s c o u n t   D E C I M A L ; 
 
     B E G I N 
 
         I F   c o u p o n _ r e c o r d . d i s c o u n t _ t y p e   =   ' p e r c e n t a g e '   T H E N 
 
             d i s c o u n t   : =   o r d e r _ v a l u e _ p a r a m   *   ( c o u p o n _ r e c o r d . d i s c o u n t _ v a l u e   /   1 0 0 ) ; 
 
         E L S E 
 
             d i s c o u n t   : =   c o u p o n _ r e c o r d . d i s c o u n t _ v a l u e ; 
 
         E N D   I F ; 
 
         
 
         - -   D e s c o n t o   n � � o   p o d e   s e r   m a i o r   q u e   o   v a l o r   d o   p e d i d o 
 
         I F   d i s c o u n t   >   o r d e r _ v a l u e _ p a r a m   T H E N 
 
             d i s c o u n t   : =   o r d e r _ v a l u e _ p a r a m ; 
 
         E N D   I F ; 
 
         
 
         R E T U R N   Q U E R Y   S E L E C T   t r u e ,   ' C u p o m   v � � l i d o ' : : T E X T ,   d i s c o u n t ,   c o u p o n _ r e c o r d . i d ; 
 
     E N D ; 
 
 E N D ; 
 
 $ $   L A N G U A G E   p l p g s q l   S E C U R I T Y   D E F I N E R ; 
 
 
 
 - -   T r i g g e r   p a r a   a t u a l i z a r   c o n t a d o r   d e   u s o s 
 
 C R E A T E   O R   R E P L A C E   F U N C T I O N   i n c r e m e n t _ c o u p o n _ u s a g e ( ) 
 
 R E T U R N S   T R I G G E R   A S   $ $ 
 
 B E G I N 
 
     U P D A T E   c o u p o n s   
 
     S E T   c u r r e n t _ u s e s   =   c u r r e n t _ u s e s   +   1 
 
     W H E R E   i d   =   N E W . c o u p o n _ i d ; 
 
     R E T U R N   N E W ; 
 
 E N D ; 
 
 $ $   L A N G U A G E   p l p g s q l ; 
 
 
 
 D R O P   T R I G G E R   I F   E X I S T S   t r i g g e r _ i n c r e m e n t _ c o u p o n _ u s a g e   O N   c o u p o n _ u s a g e ; 
 
 C R E A T E   T R I G G E R   t r i g g e r _ i n c r e m e n t _ c o u p o n _ u s a g e 
 
     A F T E R   I N S E R T   O N   c o u p o n _ u s a g e 
 
     F O R   E A C H   R O W 
 
     E X E C U T E   F U N C T I O N   i n c r e m e n t _ c o u p o n _ u s a g e ( ) ; 
 
 
 
 - -   T r i g g e r   p a r a   u p d a t e d _ a t 
 
 D R O P   T R I G G E R   I F   E X I S T S   t r i g g e r _ c o u p o n s _ u p d a t e d _ a t   O N   c o u p o n s ; 
 
 C R E A T E   T R I G G E R   t r i g g e r _ c o u p o n s _ u p d a t e d _ a t 
 
     B E F O R E   U P D A T E   O N   c o u p o n s 
 
     F O R   E A C H   R O W 
 
     E X E C U T E   F U N C T I O N   s e t _ u p d a t e d _ a t ( ) ; 
 
 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 - -   C O N C L U � � D O ! 
 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 
 