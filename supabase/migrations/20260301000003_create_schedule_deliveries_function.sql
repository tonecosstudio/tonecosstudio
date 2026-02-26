-- Migration: Funcao para Agendar Entregas Consecutivas
-- Data: 2026-03-01
-- Descricao: Funcao SQL para agendar entregas consecutivas em ciclos sequenciais

-- Funcao: Agendar entregas consecutivas
-- Cria N entregas nos proximos N ciclos consecutivos apos o ciclo de entrada
CREATE OR REPLACE FUNCTION schedule_consecutive_deliveries(
  p_subscription_id uuid,
  p_plan_type text,
  p_entry_cycle_id uuid,
  p_delivery_count integer
)
RETURNS TABLE (
  id uuid,
  subscription_id uuid,
  cycle_id uuid,
  delivery_number integer,
  status delivery_status,
  scheduled_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  entry_cycle cycles%ROWTYPE;
  current_cycle_number integer;
  current_month integer;
  current_year integer;
  target_cycle_id uuid;
  target_shipping_date date;
  delivery_num integer;
  last_day_of_month integer;
  cycle_open_start timestamptz;
  cycle_open_end timestamptz;
  cycle_production_start timestamptz;
  cycle_production_end timestamptz;
  cycle_shipping_date date;
  next_month integer;
  next_year integer;
  last_day_next_month integer;
  shipping_month integer;
  shipping_year integer;
  new_cycle_id uuid;
BEGIN
  -- Buscar ciclo de entrada
  SELECT * INTO entry_cycle
  FROM cycles
  WHERE cycles.id = p_entry_cycle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ciclo de entrada nao encontrado: %', p_entry_cycle_id;
  END IF;
  
  -- Inicializar com dados do ciclo de entrada
  current_cycle_number := entry_cycle.cycle_number;
  current_month := entry_cycle.month;
  current_year := entry_cycle.year;
  
  -- Criar entregas para cada ciclo consecutivo
  FOR delivery_num IN 1..p_delivery_count LOOP
    -- Avancar para o proximo ciclo
    IF current_cycle_number = 1 THEN
      -- Ciclo 1 -> Ciclo 2 (mesmo mes)
      current_cycle_number := 2;
    ELSE
      -- Ciclo 2 -> Ciclo 1 (proximo mes)
      current_cycle_number := 1;
      current_month := current_month + 1;
      
      -- Virar o ano se necessario
      IF current_month > 12 THEN
        current_month := 1;
        current_year := current_year + 1;
      END IF;
    END IF;
    
    -- Verificar se o ciclo ja existe
    SELECT cycles.id, cycles.shipping_date INTO target_cycle_id, target_shipping_date
    FROM cycles
    WHERE cycles.cycle_number = current_cycle_number
      AND cycles.month = current_month
      AND cycles.year = current_year;
    
    -- Se nao existe, criar o ciclo
    IF NOT FOUND THEN
      -- Calcular datas do ciclo
      IF current_cycle_number = 1 THEN
        -- Ciclo 1: dias 1-15 (pedidos) -> 16-fim (producao)
        cycle_open_start := make_timestamptz(current_year, current_month, 1, 0, 0, 0, 'America/Bahia');
        cycle_open_end := make_timestamptz(current_year, current_month, 15, 23, 59, 59, 'America/Bahia');
        cycle_production_start := make_timestamptz(current_year, current_month, 16, 0, 0, 0, 'America/Bahia');
        
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
      RETURNING cycles.id, cycles.shipping_date INTO target_cycle_id, target_shipping_date;
    END IF;
    
    -- Criar entrega
    RETURN QUERY
    INSERT INTO subscription_deliveries (
      subscription_id,
      cycle_id,
      delivery_number,
      status,
      scheduled_date
    ) VALUES (
      p_subscription_id,
      target_cycle_id,
      delivery_num,
      'scheduled',
      target_shipping_date
    )
    RETURNING 
      subscription_deliveries.id,
      subscription_deliveries.subscription_id,
      subscription_deliveries.cycle_id,
      subscription_deliveries.delivery_number,
      subscription_deliveries.status,
      subscription_deliveries.scheduled_date;
  END LOOP;
END;
$$;

-- Comentario
COMMENT ON FUNCTION schedule_consecutive_deliveries IS 'Agenda N entregas consecutivas nos proximos N ciclos apos o ciclo de entrada';
