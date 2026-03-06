-- =====================================================
-- SOLUÇÃO ALTERNATIVA: Criar função ao invés de view
-- Funções são mais confiáveis com PostgREST
-- =====================================================

-- 1. Criar função que retorna as configurações
CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS TABLE (
  -- Empresa
  company_name TEXT,
  company_address TEXT,
  company_logo_url TEXT,
  cnpj TEXT,
  legal_name TEXT,
  
  -- Contato
  contact_email TEXT,
  support_email TEXT,
  privacy_email TEXT,
  dpo_email TEXT,
  phone_primary TEXT,
  phone_whatsapp TEXT,
  business_hours TEXT,
  
  -- Website e Redes
  website_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  youtube_url TEXT,
  
  -- Preços
  default_price_full NUMERIC,
  default_price_pix NUMERIC,
  default_deposit_amount NUMERIC,
  pix_discount_percentage NUMERIC,
  max_installments_no_interest INTEGER,
  max_installments_with_interest INTEGER,
  
  -- Prazos
  shipping_business_days INTEGER,
  exchange_deadline_days INTEGER,
  days_to_next_delivery INTEGER,
  
  -- Notificações
  user_online_threshold_minutes INTEGER,
  notification_polling_interval_ms INTEGER,
  toast_duration_ms INTEGER,
  
  -- UI/UX
  default_page_size INTEGER,
  search_debounce_ms INTEGER,
  input_debounce_ms INTEGER,
  image_compression_quality NUMERIC,
  max_image_size_mb INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    -- Empresa
    MAX(CASE WHEN key = 'company_name' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'company_address' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'company_logo_url' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'cnpj' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'legal_name' THEN value END)::TEXT,
    
    -- Contato
    MAX(CASE WHEN key = 'contact_email' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'support_email' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'privacy_email' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'dpo_email' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'phone_primary' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'phone_whatsapp' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'business_hours' THEN value END)::TEXT,
    
    -- Website e Redes
    MAX(CASE WHEN key = 'website_url' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'facebook_url' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'instagram_url' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'twitter_url' THEN value END)::TEXT,
    MAX(CASE WHEN key = 'youtube_url' THEN value END)::TEXT,
    
    -- Preços
    MAX(CASE WHEN key = 'default_price_full' THEN value::NUMERIC END),
    MAX(CASE WHEN key = 'default_price_pix' THEN value::NUMERIC END),
    MAX(CASE WHEN key = 'default_deposit_amount' THEN value::NUMERIC END),
    MAX(CASE WHEN key = 'pix_discount_percentage' THEN value::NUMERIC END),
    MAX(CASE WHEN key = 'max_installments_no_interest' THEN value::INTEGER END),
    MAX(CASE WHEN key = 'max_installments_with_interest' THEN value::INTEGER END),
    
    -- Prazos
    MAX(CASE WHEN key = 'shipping_business_days' THEN value::INTEGER END),
    MAX(CASE WHEN key = 'exchange_deadline_days' THEN value::INTEGER END),
    MAX(CASE WHEN key = 'days_to_next_delivery' THEN value::INTEGER END),
    
    -- Notificações
    MAX(CASE WHEN key = 'user_online_threshold_minutes' THEN value::INTEGER END),
    MAX(CASE WHEN key = 'notification_polling_interval_ms' THEN value::INTEGER END),
    MAX(CASE WHEN key = 'toast_duration_ms' THEN value::INTEGER END),
    
    -- UI/UX
    MAX(CASE WHEN key = 'default_page_size' THEN value::INTEGER END),
    MAX(CASE WHEN key = 'search_debounce_ms' THEN value::INTEGER END),
    MAX(CASE WHEN key = 'input_debounce_ms' THEN value::INTEGER END),
    MAX(CASE WHEN key = 'image_compression_quality' THEN value::NUMERIC END),
    MAX(CASE WHEN key = 'max_image_size_mb' THEN value::INTEGER END)
  FROM system_settings;
$$;

-- 2. Garantir permissões para a função
GRANT EXECUTE ON FUNCTION get_system_settings() TO authenticated, anon;

-- 3. Adicionar comentário
COMMENT ON FUNCTION get_system_settings() IS 'Retorna todas as configurações do sistema agrupadas por categoria';

-- 4. Testar a função
SELECT * FROM get_system_settings();

-- 5. Forçar reload do schema
NOTIFY pgrst, 'reload schema';
