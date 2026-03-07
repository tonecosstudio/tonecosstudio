-- =====================================================
-- CORREÇÃO DE PRAZOS OFICIAIS DO SISTEMA
-- =====================================================
-- Data: 07/03/2026
-- 
-- FLUXO OFICIAL:
-- Mês 1 (Março): VENDAS (30 dias)
-- Mês 2 (Abril): PRODUÇÃO (30 dias - todo o mês)
-- Mês 3 (Maio): ENVIO/ENTREGA (última semana ou segunda quinzena)
--
-- Exemplo:
-- - Vendas: 01/03 a 31/03
-- - Produção: 01/04 a 30/04
-- - Entrega: 15/05 a 31/05
-- =====================================================

BEGIN;

-- =====================================================
-- 1. REMOVER DUPLICATAS
-- =====================================================

-- Remover shipping_days (manter apenas shipping_business_days)
DELETE FROM system_settings WHERE key = 'shipping_days';

-- =====================================================
-- 2. ATUALIZAR PRAZOS OFICIAIS
-- =====================================================

-- Produção: 30 dias (mês completo)
UPDATE system_settings 
SET value = '30', description = 'Prazo de produção em dias (mês completo)'
WHERE key = 'production_days_min';

UPDATE system_settings 
SET value = '30', description = 'Prazo máximo de produção em dias (mês completo)'
WHERE key = 'production_days_max';

-- Envio: 15 dias (segunda quinzena - do dia 15 ao último dia do mês)
UPDATE system_settings 
SET value = '15', description = 'Prazo de envio em dias (segunda quinzena: dia 15 ao último dia do mês)'
WHERE key = 'shipping_business_days';

-- Vendas: 30 dias (mês completo)
UPDATE system_settings 
SET value = '30', description = 'Duração do período de vendas em dias (mês completo)'
WHERE key = 'sales_duration_days';

-- =====================================================
-- 3. ADICIONAR CONFIGURAÇÕES FALTANTES
-- =====================================================

-- Intervalo entre entregas (antes estava hardcoded)
INSERT INTO system_settings (key, value, description) 
VALUES ('delivery_interval_days', '90', 'Intervalo entre entregas em dias (3 meses: vendas + produção + envio)')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- Prazo para escolha de personagem
INSERT INTO system_settings (key, value, description) 
VALUES ('character_choice_days', '7', 'Prazo para escolha de personagem em dias')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- Prazo para pagamento de saldo
INSERT INTO system_settings (key, value, description) 
VALUES ('balance_payment_days', '5', 'Prazo para pagamento de saldo em dias')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- =====================================================
-- 4. ATUALIZAR FUNÇÃO DE INICIALIZAÇÃO DE ESTÁGIOS (30 DIAS TOTAL)
-- =====================================================

-- Recriar função com novos valores (720 horas = 30 dias)
CREATE OR REPLACE FUNCTION initialize_production_stages()
RETURNS TRIGGER AS $
BEGIN
  -- Create all 6 stages for the new production queue item
  INSERT INTO production_stages (
    production_queue_id,
    stage_name,
    stage_order,
    status,
    estimated_duration
  ) VALUES
    (NEW.id, 'awaiting_choice', 1, 'pending', 168), -- 7 dias
    (NEW.id, 'design', 2, 'pending', 120),          -- 5 dias
    (NEW.id, 'production', 3, 'pending', 288),      -- 12 dias
    (NEW.id, 'quality_check', 4, 'pending', 96),    -- 4 dias
    (NEW.id, 'packaging', 5, 'pending', 48),        -- 2 dias
    (NEW.id, 'shipped', 6, 'pending', 0);           -- 0 horas (instant)
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Atualizar estágios existentes (se houver)
UPDATE production_stages SET estimated_duration = 168 WHERE stage_name = 'awaiting_choice';  -- 7 dias
UPDATE production_stages SET estimated_duration = 120 WHERE stage_name = 'design';           -- 5 dias
UPDATE production_stages SET estimated_duration = 288 WHERE stage_name = 'production';       -- 12 dias
UPDATE production_stages SET estimated_duration = 96  WHERE stage_name = 'quality_check';    -- 4 dias
UPDATE production_stages SET estimated_duration = 48  WHERE stage_name = 'packaging';        -- 2 dias
-- TOTAL: 720 horas = 30 dias

-- =====================================================
-- 5. CRIAR FUNÇÃO PARA CALCULAR DATAS DE ENTREGA
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_delivery_dates(
  p_sales_start_date DATE
)
RETURNS TABLE (
  sales_start DATE,
  sales_end DATE,
  production_start DATE,
  production_end DATE,
  shipping_start DATE,
  shipping_end DATE
) AS $$
DECLARE
  v_sales_duration INTEGER;
  v_production_days INTEGER;
  v_shipping_days INTEGER;
BEGIN
  -- Buscar configurações
  SELECT value::INTEGER INTO v_sales_duration 
  FROM system_settings WHERE key = 'sales_duration_days';
  
  SELECT value::INTEGER INTO v_production_days 
  FROM system_settings WHERE key = 'production_days_min';
  
  SELECT value::INTEGER INTO v_shipping_days 
  FROM system_settings WHERE key = 'shipping_business_days';

  -- Calcular datas
  -- Vendas: mês completo (ex: 01/03 a 31/03)
  -- Produção: mês seguinte completo (ex: 01/04 a 30/04)
  -- Envio: segunda quinzena do terceiro mês (ex: 15/05 a 31/05)
  RETURN QUERY SELECT
    p_sales_start_date AS sales_start,
    (DATE_TRUNC('month', p_sales_start_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE AS sales_end,
    (DATE_TRUNC('month', p_sales_start_date) + INTERVAL '1 month')::DATE AS production_start,
    (DATE_TRUNC('month', p_sales_start_date) + INTERVAL '2 months' - INTERVAL '1 day')::DATE AS production_end,
    (DATE_TRUNC('month', p_sales_start_date) + INTERVAL '2 months' + INTERVAL '14 days')::DATE AS shipping_start,
    (DATE_TRUNC('month', p_sales_start_date) + INTERVAL '3 months' - INTERVAL '1 day')::DATE AS shipping_end;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. EXEMPLO DE USO
-- =====================================================

-- Exemplo: Vendas começam em 01/03/2026
SELECT * FROM calculate_delivery_dates('2026-03-01');

-- Resultado esperado:
-- sales_start:      2026-03-01 (Março - Vendas)
-- sales_end:        2026-03-31 (Fim das vendas)
-- production_start: 2026-04-01 (Abril - Produção começa)
-- production_end:   2026-04-30 (Fim da produção)
-- shipping_start:   2026-05-15 (Maio - Dia 15)
-- shipping_end:     2026-05-31 (Maio - Último dia do mês)

-- =====================================================
-- 7. VALIDAR CONFIGURAÇÕES
-- =====================================================

SELECT 
  key,
  value::INTEGER as dias,
  description
FROM system_settings
WHERE key IN (
  'production_days_min',
  'production_days_max',
  'shipping_business_days',
  'sales_duration_days',
  'delivery_interval_days',
  'character_choice_days',
  'balance_payment_days'
)
ORDER BY key;

-- =====================================================
-- 8. VALIDAR ESTÁGIOS DE PRODUÇÃO
-- =====================================================

-- Verificar valores dos estágios (se houver registros)
SELECT 
  stage_name,
  estimated_duration as horas,
  ROUND(estimated_duration / 24.0, 1) as dias,
  stage_order
FROM production_stages
WHERE production_queue_id IN (
  SELECT id FROM production_queue LIMIT 1
)
ORDER BY stage_order;

-- Verificar soma total dos valores padrão na função
SELECT 
  168 + 120 + 288 + 96 + 48 as total_horas,
  ROUND((168 + 120 + 288 + 96 + 48) / 24.0, 1) as total_dias;

COMMIT;

-- =====================================================
-- RESUMO DAS MUDANÇAS
-- =====================================================
-- ✅ Removida duplicata: shipping_days
-- ✅ Produção: 15 dias → 30 dias (mês completo)
-- ✅ Envio: 5 dias → 15 dias (segunda quinzena: dia 15 ao último dia)
-- ✅ Adicionado: delivery_interval_days (90 dias - 3 meses)
-- ✅ Adicionado: character_choice_days (7 dias)
-- ✅ Adicionado: balance_payment_days (5 dias)
-- ✅ Estágios ajustados para somar 30 dias
-- ✅ Função criada para calcular datas automaticamente (meses completos)
-- =====================================================
