-- Migration: Adicionar configurações de conteúdo ao system_settings
-- Centraliza TODAS as informações que estão hardcoded no projeto

-- =====================================================
-- 1. PRAZOS E CRONOGRAMAS
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
-- Prazos de produção e entrega
('production_days_min', '15', 'Prazo mínimo de produção em dias'),
('production_days_max', '20', 'Prazo máximo de produção em dias'),
('shipping_days', '5', 'Prazo de envio em dias úteis'),
('sales_duration_days', '30', 'Duração do período de vendas em dias'),

-- Lote/Ciclo Atual (ATUALIZAR MENSALMENTE!)
('current_batch_name', 'Fevereiro/Março', 'Nome do lote/ciclo atual'),
('current_batch_sales_start', '2026-02-15', 'Data de início das vendas (YYYY-MM-DD)'),
('current_batch_sales_end', '2026-03-15', 'Data de fim das vendas (YYYY-MM-DD)'),
('current_batch_production_start', '2026-03-16', 'Data de início da produção (YYYY-MM-DD)'),
('current_batch_production_end', '2026-03-30', 'Data de fim da produção (YYYY-MM-DD)'),
('current_batch_shipping_month', 'Abril', 'Mês de envio do lote atual'),
('current_batch_shipping_deadline', '5', 'Dia útil limite de envio no mês')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- 2. POLÍTICAS E REGRAS
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
-- Políticas de troca e cancelamento
('exchange_deadline_days', '1', 'Dias antes da produção para trocar coleção'),
('exchange_policy_text', 'Você pode trocar suas coleções quantas vezes quiser, desde que seja até {{exchange_deadline_days}} dia(s) antes da produção do próximo lote.', 'Texto da política de troca'),
('cancellation_policy_text', 'Sim, você pode cancelar sua assinatura a qualquer momento. As peças já pagas serão entregues normalmente.', 'Texto da política de cancelamento'),
('refund_policy_text', 'Não há reembolso para assinaturas já pagas, mas você continuará recebendo as entregas até o fim do período contratado.', 'Texto da política de reembolso'),

-- Suporte
('support_response_hours', '48', 'Prazo de resposta do suporte em horas úteis'),
('support_response_text', 'Nossa equipe responde em até {{support_response_hours}} horas úteis.', 'Texto do prazo de resposta')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- 3. FAQ (Perguntas Frequentes)
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
-- FAQ sobre cronograma
('faq_first_delivery', 'Seguimos um cronograma mensal fixo: Vendas do dia {{sales_open_day}} ao dia {{sales_open_day}} ({{sales_duration_days}} dias), produção de {{production_days_min}} dias, e envio em até {{shipping_days}} dias úteis (considera feriados). Exemplo: compra em {{current_batch_sales_start_formatted}}-{{current_batch_sales_end_formatted}}, produção {{current_batch_production_start_formatted}}-{{current_batch_production_end_formatted}}, envio até {{current_batch_shipping_deadline}}º dia útil de {{current_batch_shipping_month}}. Todas as coleções seguem o mesmo padrão.', 'Resposta FAQ sobre primeira entrega'),

-- FAQ sobre trocas
('faq_exchange', 'Sim! Você pode trocar suas coleções quantas vezes quiser, desde que seja até {{exchange_deadline_days}} dia(s) antes da produção do próximo lote.', 'Resposta FAQ sobre trocas'),

-- FAQ sobre cancelamento
('faq_cancellation', 'Sim, você pode cancelar sua assinatura a qualquer momento. As peças já pagas serão entregues normalmente.', 'Resposta FAQ sobre cancelamento'),

-- FAQ sobre diferença entre planos
('faq_plan_difference', 'A principal diferença é a quantidade de coleções e o número de entregas. Planos maiores têm mais benefícios e melhor custo-benefício, com economia de até R$ {{max_savings}} no Anual.', 'Resposta FAQ sobre diferença entre planos')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- 4. DATAS DE DOCUMENTOS
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
('terms_last_update', '2026-02-03', 'Data da última atualização dos Termos de Uso (YYYY-MM-DD)'),
('privacy_last_update', '2026-02-03', 'Data da última atualização da Política de Privacidade (YYYY-MM-DD)')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- 5. TEXTOS DINÂMICOS PARA BANNERS
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
-- Banner de lote aberto
('batch_banner_title', '🔥 Lote {{current_batch_name}} Aberto!', 'Título do banner de lote'),
('batch_banner_subtitle', 'Vendas: {{current_batch_sales_start_formatted}} a {{current_batch_sales_end_formatted}} • Produção: {{current_batch_production_start_formatted}}-{{current_batch_production_end_formatted}} • Envio: Até {{current_batch_shipping_deadline}}º dia útil de {{current_batch_shipping_month}}', 'Subtítulo do banner de lote'),
('batch_banner_note', '⏰ Todas as coleções seguem o mesmo cronograma de lançamento', 'Nota do banner de lote')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- =====================================================
-- 6. FUNÇÃO AUXILIAR: Formatar Datas
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
-- 7. VIEW: Configurações Processadas
-- =====================================================

CREATE OR REPLACE VIEW system_settings_processed AS
SELECT 
  key,
  value,
  description,
  updated_at,
  -- Adicionar versões formatadas de datas
  CASE 
    WHEN key LIKE '%_date' AND value ~ '^\d{4}-\d{2}-\d{2}$' 
    THEN format_date_br(value)
    ELSE value
  END as value_formatted
FROM system_settings;

-- =====================================================
-- 8. COMENTÁRIOS
-- =====================================================

COMMENT ON FUNCTION format_date_br IS 'Formata data YYYY-MM-DD para DD/MM (formato brasileiro)';
COMMENT ON VIEW system_settings_processed IS 'View com configurações e versões formatadas';

-- =====================================================
-- 9. GRANTS
-- =====================================================

GRANT SELECT ON system_settings_processed TO authenticated, anon;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
