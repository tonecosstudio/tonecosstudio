-- Migration: Sistema de Limite de Produção Mensal
-- Data: 15/02/2026
-- Descrição: Implementa controle de limite global de produção mensal

-- =====================================================
-- 1. TABELA: system_settings
-- =====================================================
-- Armazena configurações globais do sistema

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Inserir configuração padrão de limite mensal
INSERT INTO system_settings (key, value, description)
VALUES 
  ('monthly_production_limit', '20', 'Limite global de produção mensal (todas as coleções somadas)'),
  ('sales_open_day', '15', 'Dia do mês em que as vendas abrem (padrão: dia 15)')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 2. TABELA: monthly_production
-- =====================================================
-- Controla a produção mensal e limite de vendas

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
  
  -- Garantir apenas um registro por mês/ano
  UNIQUE(month, year)
);

-- Índices para performance
CREATE INDEX idx_monthly_production_period ON monthly_production(year, month);
CREATE INDEX idx_monthly_production_status ON monthly_production(is_closed);

-- =====================================================
-- 3. ADICIONAR CAMPOS EM COLLECTIONS
-- =====================================================
-- Adicionar informações de ciclo anual

ALTER TABLE collections
ADD COLUMN IF NOT EXISTS cycle_year INTEGER DEFAULT 2026,
ADD COLUMN IF NOT EXISTS release_order INTEGER;

-- Atualizar coleções existentes com ordem de lançamento
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

-- Adicionar constraint após atualizar os dados
ALTER TABLE collections
ADD CONSTRAINT collections_release_order_check 
CHECK (release_order BETWEEN 1 AND 4);

-- =====================================================
-- 4. ADICIONAR CAMPOS EM COLLECTION_CHARACTERS
-- =====================================================
-- Adicionar informações de lançamento mensal

ALTER TABLE collection_characters
ADD COLUMN IF NOT EXISTS release_month INTEGER CHECK (release_month BETWEEN 1 AND 12),
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS is_revealed BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 5. FUNÇÃO: Obter Limite de Produção Atual
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
    GREATEST(0, mp.global_limit - mp.units_sold) as available,
    mp.is_closed,
    ROUND((mp.units_sold::NUMERIC / NULLIF(mp.global_limit, 0)) * 100, 2) as percentage_sold
  FROM monthly_production mp
  WHERE mp.month = v_current_month AND mp.year = v_current_year;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. FUNÇÃO: Incrementar Vendas do Mês
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
    RAISE EXCEPTION 'Limite de produção mensal atingido (% / %)', v_current_sold, v_current_limit;
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
-- 7. FUNÇÃO: Verificar se Vendas Estão Abertas
-- =====================================================

CREATE OR REPLACE FUNCTION are_sales_open()
RETURNS BOOLEAN AS $$
DECLARE
  v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  v_is_closed_flag BOOLEAN;
BEGIN
  -- Buscar status do mês atual
  SELECT is_closed INTO v_is_closed_flag
  FROM monthly_production
  WHERE month = v_current_month AND year = v_current_year;
  
  -- Se não existe registro, vendas estão abertas
  IF v_is_closed_flag IS NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN NOT v_is_closed_flag;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. FUNÇÃO: Fechar Vendas Manualmente
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
-- 9. FUNÇÃO: Reabrir Vendas
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

-- Políticas para system_settings
CREATE POLICY "Todos podem ler configurações"
  ON system_settings FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem atualizar configurações"
  ON system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para monthly_production
CREATE POLICY "Todos podem ler produção mensal"
  ON monthly_production FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar produção"
  ON monthly_production FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 11. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE system_settings IS 'Configurações globais do sistema Ordax';
COMMENT ON TABLE monthly_production IS 'Controle de limite de produção mensal';
COMMENT ON FUNCTION get_current_production_limit() IS 'Retorna informações do limite de produção do mês atual';
COMMENT ON FUNCTION increment_monthly_sales(INTEGER) IS 'Incrementa contador de vendas e fecha automaticamente se atingir limite';
COMMENT ON FUNCTION are_sales_open() IS 'Verifica se as vendas do mês atual estão abertas';
COMMENT ON FUNCTION close_monthly_sales(TEXT) IS 'Fecha vendas do mês atual manualmente';
COMMENT ON FUNCTION reopen_monthly_sales() IS 'Reabre vendas do mês atual';

-- =====================================================
-- 12. DADOS INICIAIS
-- =====================================================

-- Criar registro para o mês atual
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
