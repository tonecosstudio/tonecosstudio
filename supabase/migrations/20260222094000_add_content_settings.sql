-- Migration: Adicionar configuraÃƒÂ§ÃƒÂµes de conteÃƒÂºdo ao system_settings
-- Centraliza TODAS as informaÃƒÂ§ÃƒÂµes que estÃƒÂ£o hardcoded no projeto

-- =====================================================
-- 1. PRAZOS E CRONOGRAMAS
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
-- Prazos de produÃƒÂ§ÃƒÂ£o e entrega
('production_days_min', '15', 'Prazo mÃƒÂ­nimo de produÃƒÂ§ÃƒÂ£o em dias'),
('production_days_max', '20', 'Prazo mÃƒÂ¡ximo de produÃƒÂ§ÃƒÂ£o em dias'),
('shipping_days', '5', 'Prazo de envio em dias ÃƒÂºteis'),
('sales_duration_days', '30', 'DuraÃƒÂ§ÃƒÂ£o do perÃƒÂ­odo de vendas em dias'),

-- Lote/Ciclo Atual (ATUALIZAR MENSALMENTE!)
('current_batch_name', 'Fevereiro/MarÃƒÂ§o', 'Nome do lote/ciclo atual'),
('current_batch_sales_start', '2026-02-15', 'Data de inÃƒÂ­cio das vendas (YYYY-MM-DD)'),
('current_batch_sales_end', '2026-03-15', 'Data de fim das vendas (YYYY-MM-DD)'),
('current_batch_production_start', '2026-03-16', 'Data de inÃƒÂ­cio da produÃƒÂ§ÃƒÂ£o (YYYY-MM-DD)'),
('current_batch_production_end', '2026-03-30', 'Data de fim da produÃƒÂ§ÃƒÂ£o (YYYY-MM-DD)'),
('current_batch_shipping_month', 'Abril', 'MÃƒÂªs de envio do lote atual'),
('current_batch_shipping_deadline', '5', 'Dia ÃƒÂºtil limite de envio no mÃƒÂªs')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- 2. POLÃƒÂTICAS E REGRAS
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
-- PolÃƒÂ­ticas de troca e cancelamento
('exchange_deadline_days', '1', 'Dias antes da produÃƒÂ§ÃƒÂ£o para trocar coleÃƒÂ§ÃƒÂ£o'),
('exchange_policy_text', 'VocÃƒÂª pode trocar suas coleÃƒÂ§ÃƒÂµes quantas vezes quiser, desde que seja atÃƒÂ© {{exchange_deadline_days}} dia(s) antes da produÃƒÂ§ÃƒÂ£o do prÃƒÂ³ximo lote.', 'Texto da polÃƒÂ­tica de troca'),
('cancellation_policy_text', 'Sim, vocÃƒÂª pode cancelar sua assinatura a qualquer momento. As peÃƒÂ§as jÃƒÂ¡ pagas serÃƒÂ£o entregues normalmente.', 'Texto da polÃƒÂ­tica de cancelamento'),
('refund_policy_text', 'NÃƒÂ£o hÃƒÂ¡ reembolso para assinaturas jÃƒÂ¡ pagas, mas vocÃƒÂª continuarÃƒÂ¡ recebendo as entregas atÃƒÂ© o fim do perÃƒÂ­odo contratado.', 'Texto da polÃƒÂ­tica de reembolso'),

-- Suporte
('support_response_hours', '48', 'Prazo de resposta do suporte em horas ÃƒÂºteis'),
('support_response_text', 'Nossa equipe responde em atÃƒÂ© {{support_response_hours}} horas ÃƒÂºteis.', 'Texto do prazo de resposta')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- 3. FAQ (Perguntas Frequentes)
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
-- FAQ sobre cronograma
('faq_first_delivery', 'Seguimos um cronograma mensal fixo: Vendas do dia {{sales_open_day}} ao dia {{sales_open_day}} ({{sales_duration_days}} dias), produÃƒÂ§ÃƒÂ£o de {{production_days_min}} dias, e envio em atÃƒÂ© {{shipping_days}} dias ÃƒÂºteis (considera feriados). Exemplo: compra em {{current_batch_sales_start_formatted}}-{{current_batch_sales_end_formatted}}, produÃƒÂ§ÃƒÂ£o {{current_batch_production_start_formatted}}-{{current_batch_production_end_formatted}}, envio atÃƒÂ© {{current_batch_shipping_deadline}}Ã‚Âº dia ÃƒÂºtil de {{current_batch_shipping_month}}. Todas as coleÃƒÂ§ÃƒÂµes seguem o mesmo padrÃƒÂ£o.', 'Resposta FAQ sobre primeira entrega'),

-- FAQ sobre trocas
('faq_exchange', 'Sim! VocÃƒÂª pode trocar suas coleÃƒÂ§ÃƒÂµes quantas vezes quiser, desde que seja atÃƒÂ© {{exchange_deadline_days}} dia(s) antes da produÃƒÂ§ÃƒÂ£o do prÃƒÂ³ximo lote.', 'Resposta FAQ sobre trocas'),

-- FAQ sobre cancelamento
('faq_cancellation', 'Sim, vocÃƒÂª pode cancelar sua assinatura a qualquer momento. As peÃƒÂ§as jÃƒÂ¡ pagas serÃƒÂ£o entregues normalmente.', 'Resposta FAQ sobre cancelamento'),

-- FAQ sobre diferenÃƒÂ§a entre planos
('faq_plan_difference', 'A principal diferenÃƒÂ§a ÃƒÂ© a quantidade de coleÃƒÂ§ÃƒÂµes e o nÃƒÂºmero de entregas. Planos maiores tÃƒÂªm mais benefÃƒÂ­cios e melhor custo-benefÃƒÂ­cio, com economia de atÃƒÂ© R$ {{max_savings}} no Anual.', 'Resposta FAQ sobre diferenÃƒÂ§a entre planos')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- 4. DATAS DE DOCUMENTOS
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
('terms_last_update', '2026-02-03', 'Data da ÃƒÂºltima atualizaÃƒÂ§ÃƒÂ£o dos Termos de Uso (YYYY-MM-DD)'),
('privacy_last_update', '2026-02-03', 'Data da ÃƒÂºltima atualizaÃƒÂ§ÃƒÂ£o da PolÃƒÂ­tica de Privacidade (YYYY-MM-DD)')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- 5. TEXTOS DINÃƒâ€šMICOS PARA BANNERS
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
-- Banner de lote aberto
('batch_banner_title', 'Ã°Å¸â€Â¥ Lote {{current_batch_name}} Aberto!', 'TÃƒÂ­tulo do banner de lote'),
('batch_banner_subtitle', 'Vendas: {{current_batch_sales_start_formatted}} a {{current_batch_sales_end_formatted}} Ã¢â‚¬Â¢ ProduÃƒÂ§ÃƒÂ£o: {{current_batch_production_start_formatted}}-{{current_batch_production_end_formatted}} Ã¢â‚¬Â¢ Envio: AtÃƒÂ© {{current_batch_shipping_deadline}}Ã‚Âº dia ÃƒÂºtil de {{current_batch_shipping_month}}', 'SubtÃƒÂ­tulo do banner de lote'),
('batch_banner_note', 'Ã¢ÂÂ° Todas as coleÃƒÂ§ÃƒÂµes seguem o mesmo cronograma de lanÃƒÂ§amento', 'Nota do banner de lote')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- 6. FUNÃƒâ€¡ÃƒÆ’O AUXILIAR: Formatar Datas
-- =====================================================

CREATE OR REPLACE FUNCTION format_date_br(date_str TEXT)
RETURNS TEXT AS $$
DECLARE
  date_parts TEXT[];
  day TEXT;
  month TEXT;
BEGIN
  -- Dividir YYYY-MM-DD em partes
  date_parts := string_to_array(date_str, '-');
  day := date_parts[3];
  month := date_parts[2];
  
  -- Retornar DD/MM
  RETURN day || '/' || month;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 7. VIEW: ConfiguraÃƒÂ§ÃƒÂµes Processadas
-- =====================================================

CREATE OR REPLACE VIEW system_settings_processed AS
SELECT 
  key,
  value,
  description,
  updated_at,
  -- Adicionar versÃƒÂµes formatadas de datas
  CASE 
    WHEN key LIKE '%_date' AND value ~ '^\d{4}-\d{2}-\d{2}$' 
    THEN format_date_br(value)
    ELSE value
  END as value_formatted
FROM system_settings;

-- =====================================================
-- 8. COMENTÃƒÂRIOS
-- =====================================================

COMMENT ON FUNCTION format_date_br IS 'Formata data YYYY-MM-DD para DD/MM (formato brasileiro)';
COMMENT ON VIEW system_settings_processed IS 'View com configuraÃƒÂ§ÃƒÂµes e versÃƒÂµes formatadas';

-- =====================================================
-- 9. GRANTS
-- =====================================================

GRANT SELECT ON system_settings_processed TO authenticated, anon;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
