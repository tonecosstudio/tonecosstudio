-- Migration: Adicionar configurações de empresa e contato ao system_settings
-- Permite que o admin gerencie essas informações via interface

-- =====================================================
-- CONFIGURAÇÕES DE EMPRESA E CONTATO
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES

-- Informações da Empresa
('company_name', 'Tonecos Studios', 'Nome da empresa'),
('company_address', 'São Paulo, Brasil', 'Endereço da empresa'),
('company_logo_url', '/logo.png', 'URL do logo da empresa'),

-- Emails de Contato
('contact_email', 'contato@ordax.com.br', 'Email principal de contato'),
('support_email', 'suporte@ordax.com.br', 'Email de suporte ao cliente'),
('privacy_email', 'privacidade@ordax.com.br', 'Email para questões de privacidade'),
('dpo_email', 'dpo@ordax.com.br', 'Email do Encarregado de Dados (DPO)'),

-- Website e Redes Sociais
('website_url', 'https://ordax.com.br', 'URL do site principal'),
('facebook_url', '', 'URL do Facebook (opcional)'),
('instagram_url', '', 'URL do Instagram (opcional)'),
('twitter_url', '', 'URL do Twitter (opcional)'),
('youtube_url', '', 'URL do YouTube (opcional)'),

-- Telefones
('phone_primary', '', 'Telefone principal (opcional)'),
('phone_whatsapp', '', 'WhatsApp para contato (opcional)'),

-- Horário de Atendimento
('business_hours', 'Segunda a Sexta, 9h às 18h', 'Horário de atendimento'),

-- Informações Legais
('cnpj', '', 'CNPJ da empresa (opcional)'),
('legal_name', '', 'Razão social (opcional)')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- =====================================================
-- CONFIGURAÇÕES DE PREÇOS E PAGAMENTOS
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES

-- Preços Padrão
('default_price_full', '500', 'Preço padrão cartão (R$)'),
('default_price_pix', '475', 'Preço padrão PIX (R$)'),
('default_deposit_amount', '100', 'Valor de entrada padrão (R$)'),

-- Descontos
('pix_discount_percentage', '5', 'Desconto PIX em porcentagem (%)'),

-- Parcelamento
('max_installments_no_interest', '6', 'Máximo de parcelas sem juros'),
('max_installments_with_interest', '10', 'Máximo de parcelas com juros'),

-- Dias e Prazos
('days_to_next_delivery', '30', 'Dias para próxima entrega'),
('exchange_deadline_days', '1', 'Dias antes da produção para trocar coleção')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- =====================================================
-- CONFIGURAÇÕES DE NOTIFICAÇÕES
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES

-- Timeouts e Intervalos
('user_online_threshold_minutes', '5', 'Minutos para considerar usuário online'),
('notification_polling_interval_ms', '30000', 'Intervalo de polling de notificações (ms)'),
('toast_duration_ms', '5000', 'Duração do toast de notificação (ms)')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- =====================================================
-- CONFIGURAÇÕES DE UI/UX
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES

-- Paginação
('default_page_size', '20', 'Itens por página padrão'),
('search_debounce_ms', '300', 'Debounce de busca (ms)'),
('input_debounce_ms', '500', 'Debounce de input (ms)'),

-- Imagens
('image_compression_quality', '0.8', 'Qualidade de compressão de imagem (0-1)'),
('max_image_size_mb', '5', 'Tamanho máximo de imagem (MB)')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- =====================================================
-- CRIAR VIEW PARA CONFIGURAÇÕES AGRUPADAS
-- =====================================================

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

-- =====================================================
-- PERMISSÕES
-- =====================================================

-- Permitir leitura pública das configurações
GRANT SELECT ON system_settings_grouped TO authenticated, anon;

-- Comentários
COMMENT ON VIEW system_settings_grouped IS 'View consolidada com todas as configurações do sistema agrupadas por categoria';

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Criar índice para buscas por categoria de configuração
CREATE INDEX IF NOT EXISTS idx_system_settings_key_prefix 
ON system_settings (substring(key from 1 for 10));

-- =====================================================
-- VALIDAÇÕES
-- =====================================================

-- Função para validar email
CREATE OR REPLACE FUNCTION validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para validar emails antes de inserir/atualizar
CREATE OR REPLACE FUNCTION validate_system_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar emails
  IF NEW.key LIKE '%_email' AND NEW.value != '' THEN
    IF NOT validate_email(NEW.value) THEN
      RAISE EXCEPTION 'Email inválido: %', NEW.value;
    END IF;
  END IF;
  
  -- Validar URLs
  IF NEW.key LIKE '%_url' AND NEW.value != '' THEN
    IF NEW.value !~ '^https?://' AND NEW.value != '' THEN
      RAISE EXCEPTION 'URL deve começar com http:// ou https://: %', NEW.value;
    END IF;
  END IF;
  
  -- Validar valores numéricos positivos
  IF NEW.key IN ('default_price_full', 'default_price_pix', 'default_deposit_amount') THEN
    IF NEW.value::NUMERIC <= 0 THEN
      RAISE EXCEPTION 'Valor deve ser maior que zero: %', NEW.key;
    END IF;
  END IF;
  
  -- Validar percentuais (0-100)
  IF NEW.key LIKE '%_percentage' THEN
    IF NEW.value::NUMERIC < 0 OR NEW.value::NUMERIC > 100 THEN
      RAISE EXCEPTION 'Percentual deve estar entre 0 e 100: %', NEW.key;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS validate_system_settings_trigger ON system_settings;
CREATE TRIGGER validate_system_settings_trigger
  BEFORE INSERT OR UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION validate_system_settings();

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON FUNCTION validate_email IS 'Valida formato de email';
COMMENT ON FUNCTION validate_system_settings IS 'Valida configurações do sistema antes de salvar';
