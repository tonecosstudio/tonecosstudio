-- Migration: Sistema de Limite de ProduÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Mensal
-- Data: 15/02/2026
-- DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: Implementa controle de limite global de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o mensal

-- =====================================================
-- 1. TABELA: system_settings
-- =====================================================
-- Armazena configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes globais do sistema

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Inserir configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o padrÃƒÆ’Ã‚Â£o de limite mensal
INSERT INTO system_settings (key, value, description)
VALUES 
  ('monthly_production_limit', '20', 'Limite global de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o mensal (todas as coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes somadas)'),
  ('sales_open_day', '15', 'Dia do mÃƒÆ’Ã‚Âªs em que as vendas abrem (padrÃƒÆ’Ã‚Â£o: dia 15)')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 2. TABELA: monthly_production
-- =====================================================
-- Controla a produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o mensal e limite de vendas

CREATE TABLE IF NOT EXISTS monthly_production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2026),
  global_limit INTEGER NOT NULL DEFAULT 20,
  units_sold INTEGER NOT NULL DEFAULT 0,
  is_closed BOOLEAN DEFAULT FALSE,
  closed_reason TEXT CHECK (closed_reason IN ('limit_reached', 'time_expired', 'manual')),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir apenas um registro por mÃƒÆ’Ã‚Âªs/ano
  UNIQUE(month, year)
);

-- ÃƒÆ’Ã‚Ândices para performance
CREATE INDEX IF NOT EXISTS idx_monthly_production_period ON monthly_production(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_production_status ON monthly_production(is_closed);

-- =====================================================
-- 3. ADICIONAR CAMPOS EM COLLECTIONS
-- =====================================================
-- Adicionar informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de ciclo anual

ALTER TABLE collections
ADD COLUMN IF NOT EXISTS cycle_year INTEGER DEFAULT 2026,
ADD COLUMN IF NOT EXISTS release_order INTEGER;

-- Atualizar coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes existentes com ordem de lanÃƒÆ’Ã‚Â§amento
WITH numbered_collections AS (
  SELECT 
    id,
    CASE 
      WHEN name ILIKE '%marvel%' THEN 1
      WHEN name ILIKE '%dc%' THEN 2
      WHEN name ILIKE '%anime%' THEN 3
      WHEN name ILIKE '%terror%' THEN 4
      ELSE ((ROW_NUMBER() OVER (ORDER BY created_at) - 1) % 4) + 1
    END as new_order
  FROM collections
  WHERE release_order IS NULL
)
UPDATE collections
SET release_order = numbered_collections.new_order
FROM numbered_collections
WHERE collections.id = numbered_collections.id;

-- Adicionar constraint apÃƒÆ’Ã‚Â³s atualizar os dados
ALTER TABLE collections
ADD CONSTRAINT collections_release_order_check 
CHECK (release_order BETWEEN 1 AND 4);

-- =====================================================
-- 4. ADICIONAR CAMPOS EM COLLECTION_CHARACTERS
-- =====================================================
-- Adicionar informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes de lanÃƒÆ’Ã‚Â§amento mensal

ALTER TABLE collection_characters
ADD COLUMN IF NOT EXISTS release_month INTEGER CHECK (release_month BETWEEN 1 AND 12),
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS is_revealed BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 5. FUNÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O: Obter Limite de ProduÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Atual
-- =====================================================

CREATE OR REPLACE FUNCTION get_current_production_limit()
RETURNS TABLE (
  prod_month INTEGER,
  prod_year INTEGER,
  prod_global_limit INTEGER,
  prod_units_sold INTEGER,
  prod_available INTEGER,
  prod_is_closed BOOLEAN,
  prod_percentage_sold NUMERIC
) AS $$
DECLARE
  v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_limit_value INTEGER;
BEGIN
  -- Buscar limite configurado
  SELECT value::INTEGER INTO v_limit_value
  FROM system_settings
  WHERE key = 'monthly_production_limit';
  
  -- Criar registro do mÃƒÆ’Ã‚Âªs atual se nÃƒÆ’Ã‚Â£o existir
  INSERT INTO monthly_production (month, year, global_limit)
  VALUES (v_current_month, v_current_year, v_limit_value)
  ON CONFLICT (month, year) DO NOTHING;
  
  -- Retornar dados do mÃƒÆ’Ã‚Âªs atual
  RETURN QUERY
  SELECT 
    mp.month,
    mp.year,
    mp.global_limit,
    mp.units_sold,
    GREATEST(0, mp.global_limit - mp.units_sold) as available,
    mp.is_closed,
    ROUND((mp.units_sold::NUMERIC / NULLIF(mp.global_limit, 0)) * 100, 2) as percentage_sold
  FROM monthly_production mp
  WHERE mp.month = v_current_month AND mp.year = v_current_year;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. FUNÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O: Incrementar Vendas do MÃƒÆ’Ã‚Âªs
-- =====================================================

CREATE OR REPLACE FUNCTION increment_monthly_sales(quantity INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_current_limit INTEGER;
  v_current_sold INTEGER;
  v_new_sold INTEGER;
BEGIN
  -- Buscar dados atuais
  SELECT global_limit, units_sold INTO v_current_limit, v_current_sold
  FROM monthly_production
  WHERE month = v_current_month AND year = v_current_year;
  
  -- Calcular novo total
  v_new_sold := v_current_sold + quantity;
  
  -- Verificar se excede limite
  IF v_new_sold > v_current_limit THEN
    RAISE EXCEPTION 'Limite de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o mensal atingido (% / %)', v_current_sold, v_current_limit;
  END IF;
  
  -- Atualizar vendas
  UPDATE monthly_production
  SET 
    units_sold = v_new_sold,
    updated_at = NOW(),
    -- Fechar automaticamente se atingir limite
    is_closed = CASE WHEN v_new_sold >= v_current_limit THEN TRUE ELSE is_closed END,
    closed_reason = CASE WHEN v_new_sold >= v_current_limit THEN 'limit_reached' ELSE closed_reason END,
    closed_at = CASE WHEN v_new_sold >= v_current_limit THEN NOW() ELSE closed_at END
  WHERE month = v_current_month AND year = v_current_year;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. FUNÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O: Verificar se Vendas EstÃƒÆ’Ã‚Â£o Abertas
-- =====================================================

CREATE OR REPLACE FUNCTION are_sales_open()
RETURNS BOOLEAN AS $$
DECLARE
  v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_is_closed_flag BOOLEAN;
BEGIN
  -- Buscar status do mÃƒÆ’Ã‚Âªs atual
  SELECT is_closed INTO v_is_closed_flag
  FROM monthly_production
  WHERE month = v_current_month AND year = v_current_year;
  
  -- Se nÃƒÆ’Ã‚Â£o existe registro, vendas estÃƒÆ’Ã‚Â£o abertas
  IF v_is_closed_flag IS NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN NOT v_is_closed_flag;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. FUNÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O: Fechar Vendas Manualmente
-- =====================================================

CREATE OR REPLACE FUNCTION close_monthly_sales(reason TEXT DEFAULT 'manual')
RETURNS BOOLEAN AS $$
DECLARE
  v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  UPDATE monthly_production
  SET 
    is_closed = TRUE,
    closed_reason = reason,
    closed_at = NOW(),
    updated_at = NOW()
  WHERE month = v_current_month AND year = v_current_year;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. FUNÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O: Reabrir Vendas
-- =====================================================

CREATE OR REPLACE FUNCTION reopen_monthly_sales()
RETURNS BOOLEAN AS $$
DECLARE
  v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  UPDATE monthly_production
  SET 
    is_closed = FALSE,
    closed_reason = NULL,
    closed_at = NULL,
    updated_at = NOW()
  WHERE month = v_current_month AND year = v_current_year;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_production ENABLE ROW LEVEL SECURITY;

-- PolÃƒÆ’Ã‚Â­ticas para system_settings
CREATE POLICY "Todos podem ler configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes"
  ON system_settings FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem atualizar configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes"
  ON system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- PolÃƒÆ’Ã‚Â­ticas para monthly_production
CREATE POLICY "Todos podem ler produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o mensal"
  ON monthly_production FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o"
  ON monthly_production FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 11. COMENTÃƒÆ’Ã‚ÂRIOS
-- =====================================================

COMMENT ON TABLE system_settings IS 'ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes globais do sistema Ordax';
COMMENT ON TABLE monthly_production IS 'Controle de limite de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o mensal';
COMMENT ON FUNCTION get_current_production_limit() IS 'Retorna informaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes do limite de produÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do mÃƒÆ’Ã‚Âªs atual';
COMMENT ON FUNCTION increment_monthly_sales(INTEGER) IS 'Incrementa contador de vendas e fecha automaticamente se atingir limite';
COMMENT ON FUNCTION are_sales_open() IS 'Verifica se as vendas do mÃƒÆ’Ã‚Âªs atual estÃƒÆ’Ã‚Â£o abertas';
COMMENT ON FUNCTION close_monthly_sales(TEXT) IS 'Fecha vendas do mÃƒÆ’Ã‚Âªs atual manualmente';
COMMENT ON FUNCTION reopen_monthly_sales() IS 'Reabre vendas do mÃƒÆ’Ã‚Âªs atual';

-- =====================================================
-- 12. DADOS INICIAIS
-- =====================================================

-- Criar registro para o mÃƒÆ’Ã‚Âªs atual
INSERT INTO monthly_production (month, year, global_limit)
VALUES (
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  20
)
ON CONFLICT (month, year) DO NOTHING;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
