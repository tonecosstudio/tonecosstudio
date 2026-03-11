-- =====================================================
-- Migration: Create monthly_production table and RPC functions
-- Description: Sistema de controle de limite de produção mensal
-- =====================================================

-- =====================================================
-- MONTHLY_PRODUCTION (Controle de produção mensal)
-- =====================================================
CREATE TABLE monthly_production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  global_limit INTEGER NOT NULL DEFAULT 100,
  units_sold INTEGER NOT NULL DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_reason TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(month, year)
);

-- Índices
CREATE INDEX idx_monthly_production_month_year ON monthly_production(month, year);
CREATE INDEX idx_monthly_production_is_closed ON monthly_production(is_closed);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE monthly_production ENABLE ROW LEVEL SECURITY;

-- Todos podem ler
CREATE POLICY "monthly_production_select_all"
  ON monthly_production FOR SELECT
  USING (true);

-- Apenas admins podem modificar
CREATE POLICY "monthly_production_modify_admin"
  ON monthly_production FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TRIGGER
-- =====================================================

CREATE TRIGGER set_updated_at_monthly_production
  BEFORE UPDATE ON monthly_production
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- RPC FUNCTION: get_current_production_limit
-- =====================================================

-- Drop and recreate with correct signature
DROP FUNCTION IF EXISTS get_current_production_limit();

CREATE OR REPLACE FUNCTION get_current_production_limit()
RETURNS TABLE (
  prod_month INTEGER,
  prod_year INTEGER,
  prod_global_limit INTEGER,
  prod_units_sold INTEGER,
  prod_available INTEGER,
  prod_is_closed BOOLEAN,
  prod_percentage_sold NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month INTEGER;
  v_current_year INTEGER;
  v_limit_value INTEGER;
BEGIN
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Buscar limite configurado
  SELECT value::INTEGER INTO v_limit_value
  FROM system_settings
  WHERE key = 'monthly_production_limit';
  
  -- Usar 100 como padrão se não configurado
  v_limit_value := COALESCE(v_limit_value, 100);
  
  -- Criar registro do mês atual se não existir
  INSERT INTO monthly_production (month, year, global_limit)
  VALUES (v_current_month, v_current_year, v_limit_value)
  ON CONFLICT (month, year) DO NOTHING;
  
  -- Retornar dados do mês atual
  RETURN QUERY
  SELECT 
    mp.month,
    mp.year,
    mp.global_limit,
    mp.units_sold,
    GREATEST(mp.global_limit - mp.units_sold, 0) AS available,
    mp.is_closed,
    CASE 
      WHEN mp.global_limit > 0 THEN ROUND((mp.units_sold::NUMERIC / mp.global_limit::NUMERIC) * 100, 2)
      ELSE 0
    END AS percentage_sold
  FROM monthly_production mp
  WHERE mp.month = v_current_month
    AND mp.year = v_current_year;
END;
$$;

-- =====================================================
-- RPC FUNCTION: are_sales_open
-- =====================================================

CREATE OR REPLACE FUNCTION are_sales_open()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month INTEGER;
  v_current_year INTEGER;
  v_is_closed BOOLEAN;
BEGIN
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Buscar status do mês atual
  SELECT is_closed INTO v_is_closed
  FROM monthly_production
  WHERE month = v_current_month
    AND year = v_current_year;
  
  -- Se não existe registro, vendas estão abertas
  RETURN COALESCE(NOT v_is_closed, true);
END;
$$;

-- =====================================================
-- RPC FUNCTION: increment_monthly_sales
-- =====================================================

CREATE OR REPLACE FUNCTION increment_monthly_sales(quantity INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month INTEGER;
  v_current_year INTEGER;
  v_limit_value INTEGER;
  v_current_sold INTEGER;
  v_is_closed BOOLEAN;
BEGIN
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Buscar limite configurado
  SELECT value::INTEGER INTO v_limit_value
  FROM system_settings
  WHERE key = 'monthly_production_limit';
  
  v_limit_value := COALESCE(v_limit_value, 100);
  
  -- Criar registro se não existir
  INSERT INTO monthly_production (month, year, global_limit)
  VALUES (v_current_month, v_current_year, v_limit_value)
  ON CONFLICT (month, year) DO NOTHING;
  
  -- Verificar se vendas estão fechadas
  SELECT is_closed, units_sold INTO v_is_closed, v_current_sold
  FROM monthly_production
  WHERE month = v_current_month
    AND year = v_current_year;
  
  IF v_is_closed THEN
    RAISE EXCEPTION 'Vendas do mês atual estão fechadas';
  END IF;
  
  -- Verificar se há espaço disponível
  IF v_current_sold + quantity > v_limit_value THEN
    RAISE EXCEPTION 'Limite de produção mensal atingido';
  END IF;
  
  -- Incrementar vendas
  UPDATE monthly_production
  SET units_sold = units_sold + quantity,
      updated_at = NOW()
  WHERE month = v_current_month
    AND year = v_current_year;
  
  -- Fechar automaticamente se atingir o limite
  IF v_current_sold + quantity >= v_limit_value THEN
    UPDATE monthly_production
    SET is_closed = true,
        closed_reason = 'automatic',
        closed_at = NOW(),
        updated_at = NOW()
    WHERE month = v_current_month
      AND year = v_current_year;
  END IF;
  
  RETURN true;
END;
$$;

-- =====================================================
-- RPC FUNCTION: close_monthly_sales
-- =====================================================

CREATE OR REPLACE FUNCTION close_monthly_sales(reason TEXT DEFAULT 'manual')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month INTEGER;
  v_current_year INTEGER;
BEGIN
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  UPDATE monthly_production
  SET is_closed = true,
      closed_reason = reason,
      closed_at = NOW(),
      updated_at = NOW()
  WHERE month = v_current_month
    AND year = v_current_year;
  
  RETURN true;
END;
$$;

-- =====================================================
-- RPC FUNCTION: reopen_monthly_sales
-- =====================================================

CREATE OR REPLACE FUNCTION reopen_monthly_sales()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month INTEGER;
  v_current_year INTEGER;
BEGIN
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  UPDATE monthly_production
  SET is_closed = false,
      closed_reason = NULL,
      closed_at = NULL,
      updated_at = NOW()
  WHERE month = v_current_month
    AND year = v_current_year;
  
  RETURN true;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON monthly_production TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_current_production_limit() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION are_sales_open() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_monthly_sales(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION close_monthly_sales(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reopen_monthly_sales() TO authenticated;

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Criar registro para o mês atual
INSERT INTO monthly_production (month, year, global_limit)
VALUES (
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  COALESCE((SELECT value::INTEGER FROM system_settings WHERE key = 'monthly_production_limit'), 100)
)
ON CONFLICT (month, year) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE monthly_production IS 'Controle de limite de produção mensal';
COMMENT ON COLUMN monthly_production.global_limit IS 'Limite global de unidades para o mês';
COMMENT ON COLUMN monthly_production.units_sold IS 'Quantidade de unidades vendidas no mês';
COMMENT ON COLUMN monthly_production.is_closed IS 'Indica se as vendas do mês estão fechadas';
COMMENT ON COLUMN monthly_production.closed_reason IS 'Motivo do fechamento (manual, automatic)';

COMMENT ON FUNCTION get_current_production_limit IS 'Retorna informações do limite de produção do mês atual';
COMMENT ON FUNCTION are_sales_open IS 'Verifica se as vendas do mês atual estão abertas';
COMMENT ON FUNCTION increment_monthly_sales IS 'Incrementa contador de vendas e fecha automaticamente se atingir limite';
COMMENT ON FUNCTION close_monthly_sales IS 'Fecha vendas do mês atual manualmente';
COMMENT ON FUNCTION reopen_monthly_sales IS 'Reabre vendas do mês atual';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
