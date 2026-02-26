-- Migration: Funcoes de Banco de Dados para Gestao de Ciclos
-- Data: 2026-03-01
-- Descricao: Funcoes SQL para suportar operacoes de ciclo

-- Funcao: Incrementar capacidade de um ciclo
CREATE OR REPLACE FUNCTION increment_cycle_capacity(cycle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cycles
  SET capacity_current = capacity_current + 1,
      updated_at = now()
  WHERE id = cycle_id;
END;
$$;

-- Funcao: Decrementar capacidade de um ciclo
CREATE OR REPLACE FUNCTION decrement_cycle_capacity(cycle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cycles
  SET capacity_current = GREATEST(0, capacity_current - 1),
      updated_at = now()
  WHERE id = cycle_id;
END;
$$;

-- Funcao: Calcular N-esimo dia util de um mes
-- Considera fins de semana e feriados da tabela holidays
CREATE OR REPLACE FUNCTION calculate_nth_business_day(
  target_month integer,
  target_year integer,
  n integer
)
RETURNS date
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  check_date date;
  business_day_count integer := 0;
  day_of_week integer;
  is_holiday boolean;
BEGIN
  -- Comecar do primeiro dia do mes
  check_date := make_date(target_year, target_month, 1);
  
  -- Iterar ate encontrar o N-esimo dia util
  WHILE business_day_count < n LOOP
    -- Verificar se e fim de semana (0 = domingo, 6 = sabado)
    day_of_week := EXTRACT(DOW FROM check_date);
    
    -- Verificar se e feriado
    SELECT EXISTS(
      SELECT 1 FROM holidays
      WHERE holiday_date = check_date
    ) INTO is_holiday;
    
    -- Se nao e fim de semana nem feriado, contar como dia util
    IF day_of_week NOT IN (0, 6) AND NOT is_holiday THEN
      business_day_count := business_day_count + 1;
    END IF;
    
    -- Se ainda nao chegamos no N-esimo dia util, avancar para o proximo dia
    IF business_day_count < n THEN
      check_date := check_date + INTERVAL '1 day';
    END IF;
  END LOOP;
  
  RETURN check_date;
END;
$$;

-- Funcao: Obter ou criar ciclo atual
-- Retorna o ciclo atual baseado na data/hora atual (America/Bahia timezone)
CREATE OR REPLACE FUNCTION get_or_create_current_cycle()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  cycle_number integer,
  month integer,
  year integer,
  open_start timestamptz,
  open_end timestamptz,
  production_start timestamptz,
  production_end timestamptz,
  shipping_date date,
  status cycle_status,
  status_changed_at timestamptz,
  capacity_max integer,
  capacity_current integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_time_bahia timestamptz;
  current_day integer;
  current_month integer;
  current_year integer;
  current_cycle_number integer;
  existing_cycle cycles%ROWTYPE;
  new_cycle cycles%ROWTYPE;
  cycle_open_start timestamptz;
  cycle_open_end timestamptz;
  cycle_production_start timestamptz;
  cycle_production_end timestamptz;
  cycle_shipping_date date;
  last_day_of_month integer;
  next_month integer;
  next_year integer;
  last_day_next_month integer;
  shipping_month integer;
  shipping_year integer;
BEGIN
  -- Obter hora atual em America/Bahia (UTC-3)
  current_time_bahia := now() AT TIME ZONE 'America/Bahia';
  
  -- Extrair dia, mes e ano
  current_day := EXTRACT(DAY FROM current_time_bahia);
  current_month := EXTRACT(MONTH FROM current_time_bahia);
  current_year := EXTRACT(YEAR FROM current_time_bahia);
  
  -- Determinar numero do ciclo (1 = dias 1-15, 2 = dias 16-fim)
  IF current_day <= 15 THEN
    current_cycle_number := 1;
  ELSE
    current_cycle_number := 2;
  END IF;
  
  -- Tentar buscar ciclo existente
  SELECT * INTO existing_cycle
  FROM cycles
  WHERE cycles.cycle_number = current_cycle_number
    AND cycles.month = current_month
    AND cycles.year = current_year;
  
  -- Se encontrou, retornar
  IF FOUND THEN
    RETURN QUERY SELECT 
      existing_cycle.id,
      existing_cycle.created_at,
      existing_cycle.updated_at,
      existing_cycle.cycle_number,
      existing_cycle.month,
      existing_cycle.year,
      existing_cycle.open_start,
      existing_cycle.open_end,
      existing_cycle.production_start,
      existing_cycle.production_end,
      existing_cycle.shipping_date,
      existing_cycle.status,
      existing_cycle.status_changed_at,
      existing_cycle.capacity_max,
      existing_cycle.capacity_current;
    RETURN;
  END IF;
  
  -- Criar novo ciclo
  -- Calcular datas baseado no numero do ciclo
  IF current_cycle_number = 1 THEN
    -- Ciclo 1: dias 1-15 (pedidos) -> 16-fim (producao)
    cycle_open_start := make_timestamptz(current_year, current_month, 1, 0, 0, 0, 'America/Bahia');
    cycle_open_end := make_timestamptz(current_year, current_month, 15, 23, 59, 59, 'America/Bahia');
    cycle_production_start := make_timestamptz(current_year, current_month, 16, 0, 0, 0, 'America/Bahia');
    
    -- Ultimo dia do mes
    last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('month', make_date(current_year, current_month, 1)) + INTERVAL '1 month - 1 day'));
    cycle_production_end := make_timestamptz(current_year, current_month, last_day_of_month, 23, 59, 59, 'America/Bahia');
    
    -- Envio no mes seguinte
    IF current_month = 12 THEN
      shipping_month := 1;
      shipping_year := current_year + 1;
    ELSE
      shipping_month := current_month + 1;
      shipping_year := current_year;
    END IF;
  ELSE
    -- Ciclo 2: dias 16-fim (pedidos) -> mes seguinte (producao)
    cycle_open_start := make_timestamptz(current_year, current_month, 16, 0, 0, 0, 'America/Bahia');
    
    last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('month', make_date(current_year, current_month, 1)) + INTERVAL '1 month - 1 day'));
    cycle_open_end := make_timestamptz(current_year, current_month, last_day_of_month, 23, 59, 59, 'America/Bahia');
    
    -- Producao no mes seguinte
    IF current_month = 12 THEN
      next_month := 1;
      next_year := current_year + 1;
    ELSE
      next_month := current_month + 1;
      next_year := current_year;
    END IF;
    
    cycle_production_start := make_timestamptz(next_year, next_month, 1, 0, 0, 0, 'America/Bahia');
    
    last_day_next_month := EXTRACT(DAY FROM (DATE_TRUNC('month', make_date(next_year, next_month, 1)) + INTERVAL '1 month - 1 day'));
    cycle_production_end := make_timestamptz(next_year, next_month, last_day_next_month, 23, 59, 59, 'America/Bahia');
    
    -- Envio dois meses a frente
    IF next_month = 12 THEN
      shipping_month := 1;
      shipping_year := next_year + 1;
    ELSE
      shipping_month := next_month + 1;
      shipping_year := next_year;
    END IF;
  END IF;
  
  -- Calcular 5o dia util do mes de envio
  cycle_shipping_date := calculate_nth_business_day(shipping_month, shipping_year, 5);
  
  -- Inserir novo ciclo
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
    current_cycle_number,
    current_month,
    current_year,
    cycle_open_start,
    cycle_open_end,
    cycle_production_start,
    cycle_production_end,
    cycle_shipping_date,
    'open',
    100,
    0
  )
  RETURNING * INTO new_cycle;
  
  -- Retornar novo ciclo
  RETURN QUERY SELECT 
    new_cycle.id,
    new_cycle.created_at,
    new_cycle.updated_at,
    new_cycle.cycle_number,
    new_cycle.month,
    new_cycle.year,
    new_cycle.open_start,
    new_cycle.open_end,
    new_cycle.production_start,
    new_cycle.production_end,
    new_cycle.shipping_date,
    new_cycle.status,
    new_cycle.status_changed_at,
    new_cycle.capacity_max,
    new_cycle.capacity_current;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION increment_cycle_capacity IS 'Incrementa a capacidade atual de um ciclo em 1';
COMMENT ON FUNCTION decrement_cycle_capacity IS 'Decrementa a capacidade atual de um ciclo em 1 (minimo 0)';
COMMENT ON FUNCTION calculate_nth_business_day IS 'Calcula o N-esimo dia util de um mes, excluindo fins de semana e feriados';
COMMENT ON FUNCTION get_or_create_current_cycle IS 'Retorna o ciclo atual baseado na data/hora atual (America/Bahia), criando se nao existir';
