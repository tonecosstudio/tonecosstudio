-- Migration: Sistema de Chaves de Pagamento por Tipo
-- Data: 26/02/2026
-- DescriÃƒÂ§ÃƒÂ£o: Adiciona chaves PIX e links de pagamento especÃƒÂ­ficos por tipo de transaÃƒÂ§ÃƒÂ£o

-- =====================================================
-- 1. ADICIONAR CONFIGURAÃƒâ€¡Ãƒâ€¢ES DE PAGAMENTO
-- =====================================================

-- Chaves PIX por tipo de pagamento
INSERT INTO system_settings (key, value, description) VALUES
  -- Compras Avulsas (One-time)
  ('pix_key_onetime', '', 'Chave PIX para compras avulsas (quotes)'),
  ('payment_link_onetime', '', 'Link de pagamento por cartÃƒÂ£o para compras avulsas'),
  
  -- Sistema de Voucher (Entrada de R$ 100)
  ('pix_key_voucher', '', 'Chave PIX para sistema de voucher (entrada R$ 100)'),
  ('payment_link_voucher', '', 'Link de pagamento por cartÃƒÂ£o para voucher'),
  
  -- Assinatura Trimestral
  ('pix_key_subscription_quarterly', '', 'Chave PIX para assinatura trimestral'),
  ('payment_link_subscription_quarterly', '', 'Link de pagamento por cartÃƒÂ£o para assinatura trimestral'),
  
  -- Assinatura Semestral
  ('pix_key_subscription_semiannual', '', 'Chave PIX para assinatura semestral'),
  ('payment_link_subscription_semiannual', '', 'Link de pagamento por cartÃƒÂ£o para assinatura semestral'),
  
  -- Assinatura Anual
  ('pix_key_subscription_annual', '', 'Chave PIX para assinatura anual'),
  ('payment_link_subscription_annual', '', 'Link de pagamento por cartÃƒÂ£o para assinatura anual')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 2. FUNÃƒâ€¡ÃƒÆ’O: Obter Chave PIX por Tipo
-- =====================================================

CREATE OR REPLACE FUNCTION get_pix_key_for_payment(
  p_payment_type TEXT, -- 'onetime', 'voucher', 'subscription'
  p_subscription_period TEXT DEFAULT NULL -- 'quarterly', 'semiannual', 'annual'
)
RETURNS TEXT AS $$
DECLARE
  v_key TEXT;
  v_setting_key TEXT;
BEGIN
  -- Determinar qual chave buscar
  IF p_payment_type = 'onetime' THEN
    v_setting_key := 'pix_key_onetime';
  ELSIF p_payment_type = 'voucher' THEN
    v_setting_key := 'pix_key_voucher';
  ELSIF p_payment_type = 'subscription' THEN
    CASE p_subscription_period
      WHEN 'quarterly' THEN v_setting_key := 'pix_key_subscription_quarterly';
      WHEN 'semiannual' THEN v_setting_key := 'pix_key_subscription_semiannual';
      WHEN 'annual' THEN v_setting_key := 'pix_key_subscription_annual';
      ELSE v_setting_key := 'pix_key_subscription_quarterly'; -- Default
    END CASE;
  ELSE
    RETURN NULL;
  END IF;
  
  -- Buscar chave
  SELECT value INTO v_key
  FROM system_settings
  WHERE key = v_setting_key;
  
  RETURN v_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. FUNÃƒâ€¡ÃƒÆ’O: Obter Link de Pagamento por Tipo
-- =====================================================

CREATE OR REPLACE FUNCTION get_payment_link_for_payment(
  p_payment_type TEXT, -- 'onetime', 'voucher', 'subscription'
  p_subscription_period TEXT DEFAULT NULL -- 'quarterly', 'semiannual', 'annual'
)
RETURNS TEXT AS $$
DECLARE
  v_link TEXT;
  v_setting_key TEXT;
BEGIN
  -- Determinar qual link buscar
  IF p_payment_type = 'onetime' THEN
    v_setting_key := 'payment_link_onetime';
  ELSIF p_payment_type = 'voucher' THEN
    v_setting_key := 'payment_link_voucher';
  ELSIF p_payment_type = 'subscription' THEN
    CASE p_subscription_period
      WHEN 'quarterly' THEN v_setting_key := 'payment_link_subscription_quarterly';
      WHEN 'semiannual' THEN v_setting_key := 'payment_link_subscription_semiannual';
      WHEN 'annual' THEN v_setting_key := 'payment_link_subscription_annual';
      ELSE v_setting_key := 'payment_link_subscription_quarterly'; -- Default
    END CASE;
  ELSE
    RETURN NULL;
  END IF;
  
  -- Buscar link
  SELECT value INTO v_link
  FROM system_settings
  WHERE key = v_setting_key;
  
  RETURN v_link;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FUNÃƒâ€¡ÃƒÆ’O: Obter Todas as InformaÃƒÂ§ÃƒÂµes de Pagamento
-- =====================================================

CREATE OR REPLACE FUNCTION get_payment_info_for_type(
  p_payment_type TEXT,
  p_subscription_period TEXT DEFAULT NULL
)
RETURNS TABLE (
  payment_type TEXT,
  subscription_period TEXT,
  pix_key TEXT,
  payment_link TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_payment_type,
    p_subscription_period,
    get_pix_key_for_payment(p_payment_type, p_subscription_period),
    get_payment_link_for_payment(p_payment_type, p_subscription_period);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. COMENTÃƒÂRIOS
-- =====================================================

COMMENT ON FUNCTION get_pix_key_for_payment(TEXT, TEXT) IS 'Retorna a chave PIX apropriada baseada no tipo de pagamento';
COMMENT ON FUNCTION get_payment_link_for_payment(TEXT, TEXT) IS 'Retorna o link de pagamento apropriado baseado no tipo de pagamento';
COMMENT ON FUNCTION get_payment_info_for_type(TEXT, TEXT) IS 'Retorna todas as informaÃƒÂ§ÃƒÂµes de pagamento para um tipo especÃƒÂ­fico';

-- =====================================================
-- 6. GRANTS
-- =====================================================

-- Permitir que usuÃƒÂ¡rios autenticados chamem as funÃƒÂ§ÃƒÂµes
GRANT EXECUTE ON FUNCTION get_pix_key_for_payment(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_link_for_payment(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_info_for_type(TEXT, TEXT) TO authenticated;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
