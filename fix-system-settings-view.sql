-- =====================================================
-- FIX: Recriar view system_settings_grouped e atualizar cache
-- =====================================================

-- 1. Dropar a view existente (se houver)
DROP VIEW IF EXISTS system_settings_grouped CASCADE;

-- 2. Recriar a view com todos os campos
CREATE OR REPLACE VIEW system_settings_grouped AS
SELECT 
  -- Empresa
  MAX(CASE WHEN key = 'company_name' THEN value END) as company_name,
  MAX(CASE WHEN key = 'company_address' THEN value END) as company_address,
  MAX(CASE WHEN key = 'company_logo_url' THEN value END) as company_logo_url,
  MAX(CASE WHEN key = 'cnpj' THEN value END) as cnpj,
  MAX(CASE WHEN key = 'legal_name' THEN value END) as legal_name,
  
  -- Contato
  MAX(CASE WHEN key = 'contact_email' THEN value END) as contact_email,
  MAX(CASE WHEN key = 'support_email' THEN value END) as support_email,
  MAX(CASE WHEN key = 'privacy_email' THEN value END) as privacy_email,
  MAX(CASE WHEN key = 'dpo_email' THEN value END) as dpo_email,
  MAX(CASE WHEN key = 'phone_primary' THEN value END) as phone_primary,
  MAX(CASE WHEN key = 'phone_whatsapp' THEN value END) as phone_whatsapp,
  MAX(CASE WHEN key = 'business_hours' THEN value END) as business_hours,
  
  -- Website e Redes
  MAX(CASE WHEN key = 'website_url' THEN value END) as website_url,
  MAX(CASE WHEN key = 'facebook_url' THEN value END) as facebook_url,
  MAX(CASE WHEN key = 'instagram_url' THEN value END) as instagram_url,
  MAX(CASE WHEN key = 'twitter_url' THEN value END) as twitter_url,
  MAX(CASE WHEN key = 'youtube_url' THEN value END) as youtube_url,
  
  -- Preços
  MAX(CASE WHEN key = 'default_price_full' THEN value::NUMERIC END) as default_price_full,
  MAX(CASE WHEN key = 'default_price_pix' THEN value::NUMERIC END) as default_price_pix,
  MAX(CASE WHEN key = 'default_deposit_amount' THEN value::NUMERIC END) as default_deposit_amount,
  MAX(CASE WHEN key = 'pix_discount_percentage' THEN value::NUMERIC END) as pix_discount_percentage,
  MAX(CASE WHEN key = 'max_installments_no_interest' THEN value::INTEGER END) as max_installments_no_interest,
  MAX(CASE WHEN key = 'max_installments_with_interest' THEN value::INTEGER END) as max_installments_with_interest,
  
  -- Prazos
  MAX(CASE WHEN key = 'shipping_business_days' THEN value::INTEGER END) as shipping_business_days,
  MAX(CASE WHEN key = 'exchange_deadline_days' THEN value::INTEGER END) as exchange_deadline_days,
  MAX(CASE WHEN key = 'days_to_next_delivery' THEN value::INTEGER END) as days_to_next_delivery,
  
  -- Notificações
  MAX(CASE WHEN key = 'user_online_threshold_minutes' THEN value::INTEGER END) as user_online_threshold_minutes,
  MAX(CASE WHEN key = 'notification_polling_interval_ms' THEN value::INTEGER END) as notification_polling_interval_ms,
  MAX(CASE WHEN key = 'toast_duration_ms' THEN value::INTEGER END) as toast_duration_ms,
  
  -- UI/UX
  MAX(CASE WHEN key = 'default_page_size' THEN value::INTEGER END) as default_page_size,
  MAX(CASE WHEN key = 'search_debounce_ms' THEN value::INTEGER END) as search_debounce_ms,
  MAX(CASE WHEN key = 'input_debounce_ms' THEN value::INTEGER END) as input_debounce_ms,
  MAX(CASE WHEN key = 'image_compression_quality' THEN value::NUMERIC END) as image_compression_quality,
  MAX(CASE WHEN key = 'max_image_size_mb' THEN value::INTEGER END) as max_image_size_mb
FROM system_settings;

-- 3. Garantir permissões
GRANT SELECT ON system_settings_grouped TO authenticated, anon;

-- 4. Adicionar comentário
COMMENT ON VIEW system_settings_grouped IS 'View consolidada com todas as configurações do sistema agrupadas por categoria';

-- 5. FORÇAR atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- 6. Verificar se a view foi criada
SELECT 'View criada com sucesso!' as status,
       COUNT(*) as total_campos
FROM information_schema.columns 
WHERE table_name = 'system_settings_grouped';

-- 7. Testar a view
SELECT * FROM system_settings_grouped;
