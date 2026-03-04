-- Migration: Create Initial Cycles
-- Description: Cria ciclos iniciais para o mÃƒÂªs de lanÃƒÂ§amento (MarÃƒÂ§o 2026)
-- Author: System
-- Date: 2026-03-01

-- FunÃƒÂ§ÃƒÂ£o auxiliar para calcular o 5Ã‚Âº dia ÃƒÂºtil
-- (SerÃƒÂ¡ usada para calcular data de envio)
CREATE OR REPLACE FUNCTION calculate_fifth_business_day(
  p_month INTEGER,
  p_year INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_date DATE;
  v_business_days INTEGER := 0;
  v_day_of_week INTEGER;
  v_is_holiday BOOLEAN;
BEGIN
  -- ComeÃƒÂ§ar no primeiro dia do mÃƒÂªs
  v_current_date := make_date(p_year, p_month, 1);
  
  -- Contar atÃƒÂ© 5 dias ÃƒÂºteis
  WHILE v_business_days < 5 LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    -- Verificar se ÃƒÂ© feriado
    SELECT EXISTS(
      SELECT 1 FROM holidays 
      WHERE holiday_date = v_current_date
    ) INTO v_is_holiday;
    
    -- Se nÃƒÂ£o ÃƒÂ© fim de semana (0=domingo, 6=sÃƒÂ¡bado) e nÃƒÂ£o ÃƒÂ© feriado
    IF v_day_of_week NOT IN (0, 6) AND NOT v_is_holiday THEN
      v_business_days := v_business_days + 1;
    END IF;
    
    -- Se ainda nÃƒÂ£o chegou a 5 dias ÃƒÂºteis, avanÃƒÂ§ar para prÃƒÂ³ximo dia
    IF v_business_days < 5 THEN
      v_current_date := v_current_date + INTERVAL '1 day';
    END IF;
  END LOOP;
  
  RETURN v_current_date;
END;
$$;

-- Criar Ciclo 1 de MarÃƒÂ§o 2026
INSERT INTO cycles (
  cycle_number,
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
  1, -- Ciclo 1
  3, -- MarÃƒÂ§o
  2026,
  '2026-03-01 00:00:00-03'::TIMESTAMPTZ, -- InÃƒÂ­cio perÃƒÂ­odo de pedidos
  '2026-03-15 23:59:59-03'::TIMESTAMPTZ, -- Fim perÃƒÂ­odo de pedidos
  '2026-03-16 00:00:00-03'::TIMESTAMPTZ, -- InÃƒÂ­cio produÃƒÂ§ÃƒÂ£o
  '2026-03-31 23:59:59-03'::TIMESTAMPTZ, -- Fim produÃƒÂ§ÃƒÂ£o
  calculate_fifth_business_day(4, 2026), -- 5Ã‚Âº dia ÃƒÂºtil de Abril
  'open', -- Status inicial
  500, -- Capacidade mÃƒÂ¡xima
  0 -- Capacidade atual
)
ON CONFLICT (cycle_number, month, year) DO NOTHING;

-- Criar Ciclo 2 de MarÃƒÂ§o 2026
INSERT INTO cycles (
  cycle_number,
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
  2, -- Ciclo 2
  3, -- MarÃƒÂ§o
  2026,
  '2026-03-16 00:00:00-03'::TIMESTAMPTZ, -- InÃƒÂ­cio perÃƒÂ­odo de pedidos
  '2026-03-31 23:59:59-03'::TIMESTAMPTZ, -- Fim perÃƒÂ­odo de pedidos
  '2026-04-01 00:00:00-03'::TIMESTAMPTZ, -- InÃƒÂ­cio produÃƒÂ§ÃƒÂ£o (mÃƒÂªs seguinte)
  '2026-04-30 23:59:59-03'::TIMESTAMPTZ, -- Fim produÃƒÂ§ÃƒÂ£o
  calculate_fifth_business_day(5, 2026), -- 5Ã‚Âº dia ÃƒÂºtil de Maio
  'open', -- Status inicial
  500, -- Capacidade mÃƒÂ¡xima
  0 -- Capacidade atual
)
ON CONFLICT (cycle_number, month, year) DO NOTHING;

-- Criar Ciclo 1 de Abril 2026 (para planejamento)
INSERT INTO cycles (
  cycle_number,
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
  1,
  4, -- Abril
  2026,
  '2026-04-01 00:00:00-03'::TIMESTAMPTZ,
  '2026-04-15 23:59:59-03'::TIMESTAMPTZ,
  '2026-04-16 00:00:00-03'::TIMESTAMPTZ,
  '2026-04-30 23:59:59-03'::TIMESTAMPTZ,
  calculate_fifth_business_day(5, 2026),
  'open',
  500,
  0
)
ON CONFLICT (cycle_number, month, year) DO NOTHING;

-- Criar Ciclo 2 de Abril 2026 (para planejamento)
INSERT INTO cycles (
  cycle_number,
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
  2,
  4, -- Abril
  2026,
  '2026-04-16 00:00:00-03'::TIMESTAMPTZ,
  '2026-04-30 23:59:59-03'::TIMESTAMPTZ,
  '2026-05-01 00:00:00-03'::TIMESTAMPTZ,
  '2026-05-31 23:59:59-03'::TIMESTAMPTZ,
  calculate_fifth_business_day(6, 2026),
  'open',
  500,
  0
)
ON CONFLICT (cycle_number, month, year) DO NOTHING;

-- Criar Ciclo 1 de Maio 2026 (para planejamento)
INSERT INTO cycles (
  cycle_number,
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
  1,
  5, -- Maio
  2026,
  '2026-05-01 00:00:00-03'::TIMESTAMPTZ,
  '2026-05-15 23:59:59-03'::TIMESTAMPTZ,
  '2026-05-16 00:00:00-03'::TIMESTAMPTZ,
  '2026-05-31 23:59:59-03'::TIMESTAMPTZ,
  calculate_fifth_business_day(6, 2026),
  'open',
  500,
  0
)
ON CONFLICT (cycle_number, month, year) DO NOTHING;

-- Criar Ciclo 2 de Maio 2026 (para planejamento)
INSERT INTO cycles (
  cycle_number,
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
  2,
  5, -- Maio
  2026,
  '2026-05-16 00:00:00-03'::TIMESTAMPTZ,
  '2026-05-31 23:59:59-03'::TIMESTAMPTZ,
  '2026-06-01 00:00:00-03'::TIMESTAMPTZ,
  '2026-06-30 23:59:59-03'::TIMESTAMPTZ,
  calculate_fifth_business_day(7, 2026),
  'open',
  500,
  0
)
ON CONFLICT (cycle_number, month, year) DO NOTHING;

-- Log de criaÃƒÂ§ÃƒÂ£o
DO $$
BEGIN
  RAISE NOTICE 'Ciclos iniciais criados com sucesso para MarÃƒÂ§o, Abril e Maio de 2026';
END $$;
