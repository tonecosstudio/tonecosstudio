-- =====================================================
-- MIGRATION: Sistema de Ciclos Recorrentes Mensais
-- Data: 24/02/2026
-- Versão: 2.0
-- =====================================================
-- 
-- MODELO OPERACIONAL:
-- - 2 ciclos por mês (Ciclo 1 e Ciclo 2)
-- - Ciclo 1: dia 01-15 (primeira quinzena)
-- - Ciclo 2: dia 16-último dia (segunda quinzena)
-- 
-- =====================================================

-- =====================================================
-- 1. BACKUP DOS DADOS ANTIGOS
-- =====================================================

-- Criar tabela de backup (se não existir)
CREATE TABLE IF NOT EXISTS system_settings_backup (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  backed_up_at TIMESTAMP DEFAULT NOW()
);

-- Fazer backup dos campos antigos
INSERT INTO system_settings_backup (key, value, description)
SELECT key, value, description
FROM system_settings
WHERE key IN (
  'current_batch_name',
  'current_batch_sales_start',
  'current_batch_sales_end',
  'current_batch_production_start',
  'current_batch_production_end',
  'current_batch_shipping_month',
  'current_batch_shipping_deadline',
  'sales_open_day',
  'sales_duration_days',
  'production_days_min',
  'production_days_max'
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, 
    description = EXCLUDED.description,
    backed_up_at = NOW();

-- =====================================================
-- 2. ADICIONAR NOVOS CAMPOS DE CICLO
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES

-- =====================================================
-- CICLO ATUAL
-- =====================================================
('current_cycle_type', 'cycle1', 'Tipo do ciclo atual: cycle1 (primeira quinzena) ou cycle2 (segunda quinzena)'),
('current_cycle_month', '2', 'Mês do ciclo atual (0-11, onde 0=Janeiro, 2=Março)'),
('current_cycle_year', '2026', 'Ano do ciclo atual'),

-- =====================================================
-- CICLO 1 (PRIMEIRA QUINZENA) - MARÇO 2026
-- =====================================================
('cycle1_sales_start', '2026-03-01', 'Início das vendas do Ciclo 1 (YYYY-MM-DD)'),
('cycle1_sales_end', '2026-03-15', 'Fim das vendas do Ciclo 1 (YYYY-MM-DD)'),
('cycle1_production_start', '2026-03-16', 'Início da produção do Ciclo 1 (YYYY-MM-DD)'),
('cycle1_production_end', '2026-03-31', 'Fim da produção do Ciclo 1 (YYYY-MM-DD)'),
('cycle1_shipping_deadline', '2026-04-07', 'Prazo de envio do Ciclo 1 (5º dia útil - YYYY-MM-DD)'),

-- =====================================================
-- CICLO 2 (SEGUNDA QUINZENA) - MARÇO 2026
-- =====================================================
('cycle2_sales_start', '2026-03-16', 'Início das vendas do Ciclo 2 (YYYY-MM-DD)'),
('cycle2_sales_end', '2026-03-31', 'Fim das vendas do Ciclo 2 (YYYY-MM-DD)'),
('cycle2_production_start', '2026-04-01', 'Início da produção do Ciclo 2 (YYYY-MM-DD)'),
('cycle2_production_end', '2026-04-30', 'Fim da produção do Ciclo 2 (YYYY-MM-DD)'),
('cycle2_shipping_deadline', '2026-05-07', 'Prazo de envio do Ciclo 2 (5º dia útil - YYYY-MM-DD)'),

-- =====================================================
-- CONFIGURAÇÕES GERAIS
-- =====================================================
('shipping_business_days', '5', 'Prazo de envio em dias úteis (padrão: 5)')

ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 3. ATUALIZAR TABELA DE PEDIDOS
-- =====================================================

-- Adicionar campos de ciclo em orders (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cycle_type VARCHAR(10);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cycle_month INTEGER;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cycle_year INTEGER;
    
    -- Criar índice para melhor performance
    CREATE INDEX IF NOT EXISTS idx_orders_cycle ON orders(cycle_type, cycle_month, cycle_year);
    
    RAISE NOTICE 'Campos de ciclo adicionados à tabela orders';
  ELSE
    RAISE NOTICE 'Tabela orders não existe, pulando atualização';
  END IF;
END $$;

-- =====================================================
-- 4. MIGRAR PEDIDOS EXISTENTES
-- =====================================================

-- Atualizar pedidos de Março 2026 - Ciclo 1 (01-15/03)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    UPDATE orders 
    SET 
      cycle_type = 'cycle1',
      cycle_month = 2, -- Março (0-indexed: 0=Jan, 1=Fev, 2=Mar)
      cycle_year = 2026
    WHERE 
      created_at >= '2026-03-01 00:00:00' 
      AND created_at <= '2026-03-15 23:59:59'
      AND cycle_type IS NULL;
    
    -- Atualizar pedidos de Março 2026 - Ciclo 2 (16-31/03)
    UPDATE orders 
    SET 
      cycle_type = 'cycle2',
      cycle_month = 2,
      cycle_year = 2026
    WHERE 
      created_at >= '2026-03-16 00:00:00' 
      AND created_at <= '2026-03-31 23:59:59'
      AND cycle_type IS NULL;
    
    RAISE NOTICE 'Pedidos existentes migrados para o novo modelo de ciclos';
  ELSE
    RAISE NOTICE 'Tabela orders não existe, pulando migração de pedidos';
  END IF;
END $$;

-- =====================================================
-- 5. ATUALIZAR FAQs
-- =====================================================

-- Atualizar FAQ sobre cronograma
UPDATE system_settings 
SET value = 'Operamos com 2 ciclos por mês: Ciclo 1 (dia 01-15) e Ciclo 2 (dia 16-último dia). Cada ciclo tem seu próprio cronograma de produção e envio. Exemplo: Ciclo 1 de Março (01-15/03) → Produção 16-31/03 → Envio até 07/04. Ciclo 2 de Março (16-31/03) → Produção 01-30/04 → Envio até 07/05.'
WHERE key = 'faq_first_delivery';

-- =====================================================
-- 6. CRIAR FUNÇÃO PARA DETECTAR CICLO AUTOMATICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_cycle()
RETURNS TABLE (
  cycle_type TEXT,
  cycle_month INTEGER,
  cycle_year INTEGER,
  sales_start DATE,
  sales_end DATE,
  production_start DATE,
  production_end DATE,
  shipping_deadline DATE
) AS $$
DECLARE
  current_day INTEGER;
  current_month INTEGER;
  current_year INTEGER;
BEGIN
  -- Obter data atual
  current_day := EXTRACT(DAY FROM CURRENT_DATE);
  current_month := EXTRACT(MONTH FROM CURRENT_DATE) - 1; -- 0-indexed
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Determinar ciclo baseado no dia
  IF current_day <= 15 THEN
    -- Ciclo 1
    RETURN QUERY
    SELECT 
      'cycle1'::TEXT,
      current_month,
      current_year,
      (SELECT value::DATE FROM system_settings WHERE key = 'cycle1_sales_start'),
      (SELECT value::DATE FROM system_settings WHERE key = 'cycle1_sales_end'),
      (SELECT value::DATE FROM system_settings WHERE key = 'cycle1_production_start'),
      (SELECT value::DATE FROM system_settings WHERE key = 'cycle1_production_end'),
      (SELECT value::DATE FROM system_settings WHERE key = 'cycle1_shipping_deadline');
  ELSE
    -- Ciclo 2
    RETURN QUERY
    SELECT 
      'cycle2'::TEXT,
      current_month,
      current_year,
      (SELECT value::DATE FROM system_settings WHERE key = 'cycle2_sales_start'),
      (SELECT value::DATE FROM system_settings WHERE key = 'cycle2_sales_end'),
      (SELECT value::DATE FROM system_settings WHERE key = 'cycle2_production_start'),
      (SELECT value::DATE FROM system_settings WHERE key = 'cycle2_production_end'),
      (SELECT value::DATE FROM system_settings WHERE key = 'cycle2_shipping_deadline');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CRIAR VIEW PARA FACILITAR CONSULTAS
-- =====================================================

CREATE OR REPLACE VIEW current_cycle_info AS
SELECT 
  (SELECT value FROM system_settings WHERE key = 'current_cycle_type') AS cycle_type,
  (SELECT value::INTEGER FROM system_settings WHERE key = 'current_cycle_month') AS cycle_month,
  (SELECT value::INTEGER FROM system_settings WHERE key = 'current_cycle_year') AS cycle_year,
  
  -- Ciclo 1
  (SELECT value::DATE FROM system_settings WHERE key = 'cycle1_sales_start') AS cycle1_sales_start,
  (SELECT value::DATE FROM system_settings WHERE key = 'cycle1_sales_end') AS cycle1_sales_end,
  (SELECT value::DATE FROM system_settings WHERE key = 'cycle1_production_start') AS cycle1_production_start,
  (SELECT value::DATE FROM system_settings WHERE key = 'cycle1_production_end') AS cycle1_production_end,
  (SELECT value::DATE FROM system_settings WHERE key = 'cycle1_shipping_deadline') AS cycle1_shipping_deadline,
  
  -- Ciclo 2
  (SELECT value::DATE FROM system_settings WHERE key = 'cycle2_sales_start') AS cycle2_sales_start,
  (SELECT value::DATE FROM system_settings WHERE key = 'cycle2_sales_end') AS cycle2_sales_end,
  (SELECT value::DATE FROM system_settings WHERE key = 'cycle2_production_start') AS cycle2_production_start,
  (SELECT value::DATE FROM system_settings WHERE key = 'cycle2_production_end') AS cycle2_production_end,
  (SELECT value::DATE FROM system_settings WHERE key = 'cycle2_shipping_deadline') AS cycle2_shipping_deadline,
  
  -- Configurações
  (SELECT value::INTEGER FROM system_settings WHERE key = 'shipping_business_days') AS shipping_business_days;

-- =====================================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE system_settings_backup IS 'Backup dos campos antigos do sistema de lote único (v1)';
COMMENT ON FUNCTION get_current_cycle IS 'Retorna informações do ciclo atual baseado na data de hoje';
COMMENT ON VIEW current_cycle_info IS 'View consolidada com todas as informações dos ciclos atuais';

-- =====================================================
-- 9. GRANTS (PERMISSÕES)
-- =====================================================

-- Permitir que usuários autenticados leiam as configurações
GRANT SELECT ON system_settings TO authenticated;
GRANT SELECT ON current_cycle_info TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_cycle TO authenticated;

-- =====================================================
-- 10. VALIDAÇÃO
-- =====================================================

-- Verificar se todos os campos foram criados
DO $$
DECLARE
  missing_keys TEXT[];
BEGIN
  SELECT ARRAY_AGG(key) INTO missing_keys
  FROM (VALUES 
    ('current_cycle_type'),
    ('current_cycle_month'),
    ('current_cycle_year'),
    ('cycle1_sales_start'),
    ('cycle1_sales_end'),
    ('cycle1_production_start'),
    ('cycle1_production_end'),
    ('cycle1_shipping_deadline'),
    ('cycle2_sales_start'),
    ('cycle2_sales_end'),
    ('cycle2_production_start'),
    ('cycle2_production_end'),
    ('cycle2_shipping_deadline'),
    ('shipping_business_days')
  ) AS expected(key)
  WHERE NOT EXISTS (
    SELECT 1 FROM system_settings WHERE system_settings.key = expected.key
  );
  
  IF missing_keys IS NOT NULL THEN
    RAISE EXCEPTION 'Migration incompleta! Campos faltando: %', missing_keys;
  END IF;
  
  RAISE NOTICE 'Migration concluída com sucesso! Todos os campos foram criados.';
END $$;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- Exibir resumo
SELECT 
  'Migration 20260224000000_add_cycle_system.sql' AS migration,
  'Sistema de Ciclos Recorrentes Mensais' AS description,
  '2.0' AS version,
  'CONCLUÍDO' AS status,
  NOW() AS executed_at;
