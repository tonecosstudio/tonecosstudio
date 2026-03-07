-- ============================================================================
-- FIX: Corrigir Tabela Cycles para Usar Prazos Oficiais
-- ============================================================================
-- Problema: Tabela cycles usa sistema quinzenal (2 ciclos/mês, ~37 dias)
-- Solução: Migrar para sistema mensal (1 ciclo/mês, 90 dias)
-- 
-- PRAZOS OFICIAIS:
-- - Vendas/Escolha: 30 dias (mês completo)
-- - Produção: 30 dias (mês completo seguinte)
-- - Envio: 15 dias (segunda quinzena do 3º mês)
-- - Total: 90 dias (3 meses)
-- 
-- FLUXO: MARÇO (vendas) → ABRIL (produção) → MAIO (envio dia 15-31)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASSO 1: Limpar dados antigos (sistema quinzenal)
-- ============================================================================

DELETE FROM cycles;

-- ============================================================================
-- PASSO 2: Alterar estrutura da tabela
-- ============================================================================

-- Remover coluna cycle_number (não é mais quinzenal)
ALTER TABLE cycles DROP COLUMN IF EXISTS cycle_number;

-- Adicionar constraint para garantir 1 ciclo por mês
DROP INDEX IF EXISTS idx_cycles_unique_month;
CREATE UNIQUE INDEX idx_cycles_unique_month ON cycles(month, year);

-- ============================================================================
-- PASSO 3: Criar ciclos mensais com prazos oficiais
-- ============================================================================

-- Função auxiliar para calcular data de envio (5º dia útil da segunda quinzena)
CREATE OR REPLACE FUNCTION calculate_shipping_date(p_year INTEGER, p_month INTEGER)
RETURNS DATE AS $$
DECLARE
  v_shipping_date DATE;
  v_business_days INTEGER := 0;
  v_current_date DATE;
BEGIN
  -- Começar no dia 15 do mês
  v_current_date := make_date(p_year, p_month, 15);
  
  -- Contar 5 dias úteis
  WHILE v_business_days < 5 LOOP
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
  
  RETURN v_current_date;
END;
$$ LANGUAGE plpgsql;

-- Criar ciclos para março a dezembro de 2026
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
) VALUES
-- MARÇO 2026: Vendas em março → Produção em abril → Envio em maio
(
  gen_random_uuid(),
  3, -- março
  2026,
  '2026-03-01 00:00:00-03'::timestamptz, -- Início vendas: 1º de março
  '2026-03-31 23:59:59-03'::timestamptz, -- Fim vendas: 31 de março
  '2026-04-01 00:00:00-03'::timestamptz, -- Início produção: 1º de abril
  '2026-04-30 23:59:59-03'::timestamptz, -- Fim produção: 30 de abril
  calculate_shipping_date(2026, 5), -- Envio: 5º dia útil da 2ª quinzena de maio
  'open',
  500,
  0
),
-- ABRIL 2026: Vendas em abril → Produção em maio → Envio em junho
(
  gen_random_uuid(),
  4, -- abril
  2026,
  '2026-04-01 00:00:00-03'::timestamptz,
  '2026-04-30 23:59:59-03'::timestamptz,
  '2026-05-01 00:00:00-03'::timestamptz,
  '2026-05-31 23:59:59-03'::timestamptz,
  calculate_shipping_date(2026, 6),
  'open',
  500,
  0
),
-- MAIO 2026: Vendas em maio → Produção em junho → Envio em julho
(
  gen_random_uuid(),
  5, -- maio
  2026,
  '2026-05-01 00:00:00-03'::timestamptz,
  '2026-05-31 23:59:59-03'::timestamptz,
  '2026-06-01 00:00:00-03'::timestamptz,
  '2026-06-30 23:59:59-03'::timestamptz,
  calculate_shipping_date(2026, 7),
  'open',
  500,
  0
),
-- JUNHO 2026: Vendas em junho → Produção em julho → Envio em agosto
(
  gen_random_uuid(),
  6, -- junho
  2026,
  '2026-06-01 00:00:00-03'::timestamptz,
  '2026-06-30 23:59:59-03'::timestamptz,
  '2026-07-01 00:00:00-03'::timestamptz,
  '2026-07-31 23:59:59-03'::timestamptz,
  calculate_shipping_date(2026, 8),
  'open',
  500,
  0
),
-- JULHO 2026: Vendas em julho → Produção em agosto → Envio em setembro
(
  gen_random_uuid(),
  7, -- julho
  2026,
  '2026-07-01 00:00:00-03'::timestamptz,
  '2026-07-31 23:59:59-03'::timestamptz,
  '2026-08-01 00:00:00-03'::timestamptz,
  '2026-08-31 23:59:59-03'::timestamptz,
  calculate_shipping_date(2026, 9),
  'open',
  500,
  0
),
-- AGOSTO 2026: Vendas em agosto → Produção em setembro → Envio em outubro
(
  gen_random_uuid(),
  8, -- agosto
  2026,
  '2026-08-01 00:00:00-03'::timestamptz,
  '2026-08-31 23:59:59-03'::timestamptz,
  '2026-09-01 00:00:00-03'::timestamptz,
  '2026-09-30 23:59:59-03'::timestamptz,
  calculate_shipping_date(2026, 10),
  'open',
  500,
  0
),
-- SETEMBRO 2026: Vendas em setembro → Produção em outubro → Envio em novembro
(
  gen_random_uuid(),
  9, -- setembro
  2026,
  '2026-09-01 00:00:00-03'::timestamptz,
  '2026-09-30 23:59:59-03'::timestamptz,
  '2026-10-01 00:00:00-03'::timestamptz,
  '2026-10-31 23:59:59-03'::timestamptz,
  calculate_shipping_date(2026, 11),
  'open',
  500,
  0
),
-- OUTUBRO 2026: Vendas em outubro → Produção em novembro → Envio em dezembro
(
  gen_random_uuid(),
  10, -- outubro
  2026,
  '2026-10-01 00:00:00-03'::timestamptz,
  '2026-10-31 23:59:59-03'::timestamptz,
  '2026-11-01 00:00:00-03'::timestamptz,
  '2026-11-30 23:59:59-03'::timestamptz,
  calculate_shipping_date(2026, 12),
  'open',
  500,
  0
),
-- NOVEMBRO 2026: Vendas em novembro → Produção em dezembro → Envio em janeiro/2027
(
  gen_random_uuid(),
  11, -- novembro
  2026,
  '2026-11-01 00:00:00-03'::timestamptz,
  '2026-11-30 23:59:59-03'::timestamptz,
  '2026-12-01 00:00:00-03'::timestamptz,
  '2026-12-31 23:59:59-03'::timestamptz,
  calculate_shipping_date(2027, 1),
  'open',
  500,
  0
),
-- DEZEMBRO 2026: Vendas em dezembro → Produção em janeiro/2027 → Envio em fevereiro/2027
(
  gen_random_uuid(),
  12, -- dezembro
  2026,
  '2026-12-01 00:00:00-03'::timestamptz,
  '2026-12-31 23:59:59-03'::timestamptz,
  '2027-01-01 00:00:00-03'::timestamptz,
  '2027-01-31 23:59:59-03'::timestamptz,
  calculate_shipping_date(2027, 2),
  'open',
  500,
  0
);

-- ============================================================================
-- PASSO 4: Atualizar comentários da tabela
-- ============================================================================

COMMENT ON TABLE cycles IS 
  'Ciclos mensais de produção.
   Cada ciclo representa 1 mês de vendas + 1 mês de produção + envio na 2ª quinzena do 3º mês.
   Total: 90 dias (3 meses).
   Exemplo: Março (vendas) → Abril (produção) → Maio (envio).';

COMMENT ON COLUMN cycles.month IS 'Mês de VENDAS/ESCOLHA (1-12)';
COMMENT ON COLUMN cycles.year IS 'Ano de VENDAS/ESCOLHA';
COMMENT ON COLUMN cycles.open_start IS 'Início do período de vendas/escolha (1º dia do mês)';
COMMENT ON COLUMN cycles.open_end IS 'Fim do período de vendas/escolha (último dia do mês)';
COMMENT ON COLUMN cycles.production_start IS 'Início da produção (1º dia do mês seguinte)';
COMMENT ON COLUMN cycles.production_end IS 'Fim da produção (último dia do mês seguinte)';
COMMENT ON COLUMN cycles.shipping_date IS 'Data de envio (5º dia útil da 2ª quinzena do 3º mês)';

-- ============================================================================
-- PASSO 5: Verificar resultado
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
-- RESULTADO ESPERADO:
-- ============================================================================
-- Março/2026:  Vendas 01/03-31/03 → Produção 01/04-30/04 → Envio ~21/05
-- Abril/2026:  Vendas 01/04-30/04 → Produção 01/05-31/05 → Envio ~20/06
-- Maio/2026:   Vendas 01/05-31/05 → Produção 01/06-30/06 → Envio ~21/07
-- ... e assim por diante
-- ============================================================================
