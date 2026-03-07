-- ============================================================================
-- FIX: Ciclos Usando SSOT (Single Source of Truth)
-- ============================================================================
-- Problema: Ciclos têm prazos hardcoded (15 dias, 30 dias, etc)
-- Solução: Ciclos devem ser gerados automaticamente a partir de system_settings
-- 
-- SSOT: Tabela system_settings
-- - production_days (30 dias)
-- - shipping_business_days (15 dias úteis)
-- - Total: 90 dias (3 meses)
-- 
-- BENEFÍCIO: Alterar system_settings → Todos os ciclos se ajustam automaticamente
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASSO 1: Limpar dados antigos
-- ============================================================================

DELETE FROM cycles;

-- ============================================================================
-- PASSO 2: Remover coluna cycle_number (sistema não é mais quinzenal)
-- ============================================================================

ALTER TABLE cycles DROP COLUMN IF EXISTS cycle_number;

-- Criar constraint única por mês/ano
DROP INDEX IF EXISTS idx_cycles_unique_month;
CREATE UNIQUE INDEX idx_cycles_unique_month ON cycles(month, year);

-- ============================================================================
-- PASSO 3: Criar função para gerar ciclos a partir do SSOT
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_cycle_dates(
  p_sales_month INTEGER,
  p_sales_year INTEGER
)
RETURNS TABLE (
  open_start TIMESTAMPTZ,
  open_end TIMESTAMPTZ,
  production_start TIMESTAMPTZ,
  production_end TIMESTAMPTZ,
  shipping_date DATE
) AS $$
DECLARE
  v_production_days INTEGER;
  v_shipping_business_days INTEGER;
  v_sales_start TIMESTAMPTZ;
  v_sales_end TIMESTAMPTZ;
  v_prod_start TIMESTAMPTZ;
  v_prod_end TIMESTAMPTZ;
  v_shipping_month INTEGER;
  v_shipping_year INTEGER;
  v_shipping_date DATE;
  v_business_days INTEGER := 0;
  v_current_date DATE;
BEGIN
  -- Buscar prazos do SSOT
  SELECT 
    production_days,
    shipping_business_days
  INTO 
    v_production_days,
    v_shipping_business_days
  FROM system_settings
  LIMIT 1;

  -- Se não encontrar, usar valores padrão
  IF v_production_days IS NULL THEN
    v_production_days := 30;
  END IF;
  
  IF v_shipping_business_days IS NULL THEN
    v_shipping_business_days := 15;
  END IF;

  -- FASE 1: VENDAS/ESCOLHA (mês completo)
  v_sales_start := make_timestamptz(
    p_sales_year, p_sales_month, 1, 
    0, 0, 0, 'America/Bahia'
  );
  
  v_sales_end := make_timestamptz(
    p_sales_year, p_sales_month, 
    EXTRACT(DAY FROM (DATE_TRUNC('month', v_sales_start) + INTERVAL '1 month - 1 day')::DATE)::INTEGER,
    23, 59, 59, 'America/Bahia'
  );

  -- FASE 2: PRODUÇÃO (v_production_days após vendas)
  v_prod_start := v_sales_end + INTERVAL '1 second';
  v_prod_end := v_prod_start + (v_production_days || ' days')::INTERVAL - INTERVAL '1 second';

  -- FASE 3: ENVIO (v_shipping_business_days dias úteis na segunda quinzena)
  -- Calcular mês de envio (2 meses após vendas)
  v_shipping_month := p_sales_month + 2;
  v_shipping_year := p_sales_year;
  
  IF v_shipping_month > 12 THEN
    v_shipping_month := v_shipping_month - 12;
    v_shipping_year := v_shipping_year + 1;
  END IF;

  -- Começar no dia 15 do mês de envio
  v_current_date := make_date(v_shipping_year, v_shipping_month, 15);
  
  -- Contar dias úteis
  WHILE v_business_days < v_shipping_business_days LOOP
    v_current_date := v_current_date + INTERVAL '1 day';
    
    -- Verificar se é dia útil (não é sábado nem domingo)
    IF EXTRACT(DOW FROM v_current_date) NOT IN (0, 6) THEN
      -- Verificar se não é feriado
      IF NOT EXISTS (
        SELECT 1 FROM holidays 
        WHERE holiday_date = v_current_date
      ) THEN
        v_business_days := v_business_days + 1;
      END IF;
    END IF;
  END LOOP;
  
  v_shipping_date := v_current_date;

  -- Retornar datas calculadas
  RETURN QUERY SELECT 
    v_sales_start,
    v_sales_end,
    v_prod_start,
    v_prod_end,
    v_shipping_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_cycle_dates IS 
  'Gera datas de um ciclo baseado no SSOT (system_settings).
   Parâmetros: mês e ano de VENDAS.
   Retorna: datas de vendas, produção e envio calculadas automaticamente.';

-- ============================================================================
-- PASSO 4: Criar função para popular ciclos automaticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_cycles(
  p_start_month INTEGER,
  p_start_year INTEGER,
  p_num_months INTEGER DEFAULT 12
)
RETURNS INTEGER AS $$
DECLARE
  v_current_month INTEGER := p_start_month;
  v_current_year INTEGER := p_start_year;
  v_cycle_dates RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR i IN 1..p_num_months LOOP
    -- Gerar datas do ciclo
    SELECT * INTO v_cycle_dates
    FROM generate_cycle_dates(v_current_month, v_current_year);
    
    -- Inserir ciclo
    INSERT INTO cycles (
      id,
      month,
      year,
      open_start,
      open_end,
      production_start,
      production_end,
      shipping_date,
      status,
      capacity_max,
      capacity_current
    ) VALUES (
      gen_random_uuid(),
      v_current_month,
      v_current_year,
      v_cycle_dates.open_start,
      v_cycle_dates.open_end,
      v_cycle_dates.production_start,
      v_cycle_dates.production_end,
      v_cycle_dates.shipping_date,
      'open',
      500,
      0
    )
    ON CONFLICT (month, year) DO UPDATE SET
      open_start = EXCLUDED.open_start,
      open_end = EXCLUDED.open_end,
      production_start = EXCLUDED.production_start,
      production_end = EXCLUDED.production_end,
      shipping_date = EXCLUDED.shipping_date;
    
    v_count := v_count + 1;
    
    -- Avançar para próximo mês
    v_current_month := v_current_month + 1;
    IF v_current_month > 12 THEN
      v_current_month := 1;
      v_current_year := v_current_year + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION populate_cycles IS 
  'Popula ou atualiza ciclos automaticamente baseado no SSOT.
   Parâmetros: mês inicial, ano inicial, quantidade de meses.
   Retorna: número de ciclos criados/atualizados.';

-- ============================================================================
-- PASSO 5: Criar trigger para atualizar ciclos quando system_settings mudar
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_cycles_on_settings_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se production_days ou shipping_business_days mudaram
  IF (OLD.production_days IS DISTINCT FROM NEW.production_days) OR
     (OLD.shipping_business_days IS DISTINCT FROM NEW.shipping_business_days) THEN
    
    -- Recriar todos os ciclos futuros (status = 'open')
    PERFORM populate_cycles(
      EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
      EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
      12
    );
    
    RAISE NOTICE 'Ciclos atualizados automaticamente após mudança em system_settings';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cycles_on_settings_change ON system_settings;
CREATE TRIGGER update_cycles_on_settings_change
  AFTER UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_cycles_on_settings_change();

COMMENT ON TRIGGER update_cycles_on_settings_change ON system_settings IS 
  'Atualiza automaticamente todos os ciclos quando prazos mudam no SSOT.';

-- ============================================================================
-- PASSO 6: Popular ciclos iniciais (março a dezembro 2026)
-- ============================================================================

SELECT populate_cycles(3, 2026, 10);

-- ============================================================================
-- PASSO 7: Atualizar comentários
-- ============================================================================

COMMENT ON TABLE cycles IS 
  'Ciclos mensais de produção gerados automaticamente a partir do SSOT (system_settings).
   Cada ciclo é calculado dinamicamente baseado em:
   - production_days (padrão: 30 dias)
   - shipping_business_days (padrão: 15 dias úteis)
   
   IMPORTANTE: Alterar system_settings → Todos os ciclos são recalculados automaticamente.';

COMMENT ON COLUMN cycles.month IS 'Mês de VENDAS/ESCOLHA (1-12)';
COMMENT ON COLUMN cycles.year IS 'Ano de VENDAS/ESCOLHA';
COMMENT ON COLUMN cycles.open_start IS 'Início vendas (calculado: 1º dia do mês)';
COMMENT ON COLUMN cycles.open_end IS 'Fim vendas (calculado: último dia do mês)';
COMMENT ON COLUMN cycles.production_start IS 'Início produção (calculado: open_end + 1 segundo)';
COMMENT ON COLUMN cycles.production_end IS 'Fim produção (calculado: production_start + production_days)';
COMMENT ON COLUMN cycles.shipping_date IS 'Data envio (calculado: shipping_business_days dias úteis após dia 15)';

-- ============================================================================
-- PASSO 8: Verificar resultado
-- ============================================================================

SELECT 
  month,
  year,
  open_start::date as vendas_inicio,
  open_end::date as vendas_fim,
  production_start::date as producao_inicio,
  production_end::date as producao_fim,
  shipping_date as envio,
  status,
  capacity_max,
  capacity_current
FROM cycles
ORDER BY year, month;

COMMIT;

-- ============================================================================
-- COMO USAR NO FUTURO:
-- ============================================================================
-- 1. Para alterar prazos:
--    UPDATE system_settings SET production_days = 45;
--    → Todos os ciclos são recalculados automaticamente!
--
-- 2. Para criar novos ciclos:
--    SELECT populate_cycles(1, 2027, 12); -- Janeiro a dezembro 2027
--
-- 3. Para recriar todos os ciclos:
--    DELETE FROM cycles;
--    SELECT populate_cycles(3, 2026, 24); -- 2 anos de ciclos
-- ============================================================================
