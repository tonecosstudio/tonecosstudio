-- =====================================================
-- Migration: Premium Club Fixed-Price Model
-- Description: Implementa sistema de ciclos quinzenais,
--              entregas consecutivas e peças bônus
-- Date: 2026-03-01
-- =====================================================

-- =====================================================
-- PART 1: CREATE ENUMS
-- =====================================================

-- Enum para status de ciclo
DO $$ 
BEGIN
  CREATE TYPE cycle_status AS ENUM ('open', 'production', 'shipping', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para tipo de feriado
DO $$ 
BEGIN
  CREATE TYPE holiday_type AS ENUM ('national', 'state');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para status de peça bônus
DO $$ 
BEGIN
  CREATE TYPE bonus_status AS ENUM ('pending', 'prepared', 'shipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar enum delivery_status se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
    CREATE TYPE delivery_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
  END IF;
END $$;

-- Adicionar novos valores ao enum de status de entrega (se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t 
                 JOIN pg_enum e ON t.oid = e.enumtypid  
                 WHERE t.typname = 'delivery_status' AND e.enumlabel = 'scheduled') THEN
    ALTER TYPE delivery_status ADD VALUE 'scheduled';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type t 
                 JOIN pg_enum e ON t.oid = e.enumtypid  
                 WHERE t.typname = 'delivery_status' AND e.enumlabel = 'pending_production') THEN
    ALTER TYPE delivery_status ADD VALUE 'pending_production';
  END IF;
END $$;

-- =====================================================
-- PART 2: CREATE NEW TABLES
-- =====================================================

-- Tabela de ciclos quinzenais
CREATE TABLE IF NOT EXISTS cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Identificação
  cycle_number integer NOT NULL CHECK (cycle_number IN (1, 2)),
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year >= 2026),
  
  -- Datas (todas em America/Bahia timezone)
  open_start timestamptz NOT NULL,
  open_end timestamptz NOT NULL,
  production_start timestamptz NOT NULL,
  production_end timestamptz NOT NULL,
  shipping_date date NOT NULL,
  
  -- Status
  status cycle_status DEFAULT 'open',
  status_changed_at timestamptz,
  
  -- Capacidade
  capacity_max integer DEFAULT 100,
  capacity_current integer DEFAULT 0,
  
  -- Constraint: apenas um ciclo por número/mês/ano
  UNIQUE(cycle_number, month, year)
);

-- Índices para cycles
CREATE INDEX IF NOT EXISTS idx_cycles_status ON cycles(status);
CREATE INDEX IF NOT EXISTS idx_cycles_month_year ON cycles(month, year);
CREATE INDEX IF NOT EXISTS idx_cycles_shipping_date ON cycles(shipping_date);
CREATE INDEX IF NOT EXISTS idx_cycles_dates ON cycles(open_start, open_end);

-- Tabela de feriados
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Data do feriado
  holiday_date date NOT NULL,
  
  -- Informações
  name text NOT NULL,
  description text,
  type holiday_type NOT NULL,
  
  -- Estado (apenas para feriados estaduais)
  state_code text CHECK (
    (type = 'national' AND state_code IS NULL) OR
    (type = 'state' AND state_code IS NOT NULL)
  ),
  
  -- Recorrência
  is_recurring boolean DEFAULT false,
  
  UNIQUE(holiday_date, type, state_code)
);

-- Índices para holidays
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type);
CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(EXTRACT(YEAR FROM holiday_date));

-- Tabela de peças bônus
CREATE TABLE IF NOT EXISTS bonus_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Relacionamentos
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  delivery_id uuid REFERENCES subscription_deliveries(id),
  
  -- Informações
  description text,
  status bonus_status DEFAULT 'pending',
  
  -- Datas
  prepared_at timestamptz,
  shipped_at timestamptz,
  
  -- Constraint: apenas um bônus por assinatura
  UNIQUE(subscription_id)
);

-- Índices para bonus_pieces
CREATE INDEX IF NOT EXISTS idx_bonus_subscription ON bonus_pieces(subscription_id);
CREATE INDEX IF NOT EXISTS idx_bonus_status ON bonus_pieces(status);
CREATE INDEX IF NOT EXISTS idx_bonus_delivery ON bonus_pieces(delivery_id);

-- =====================================================
-- PART 3: MODIFY EXISTING TABLES
-- =====================================================

-- Modificar tabela subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS entry_cycle_id uuid REFERENCES cycles(id),
  ADD COLUMN IF NOT EXISTS current_delivery_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_deliveries integer,
  ADD COLUMN IF NOT EXISTS is_legacy_model boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_subscriptions_entry_cycle ON subscriptions(entry_cycle_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_legacy ON subscriptions(is_legacy_model);

-- Modificar tabela subscription_plans
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS deliveries_total integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS includes_bonus boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS collections_count integer DEFAULT 1 CHECK (collections_count >= 1);

-- Atualizar planos existentes
UPDATE subscription_plans 
SET deliveries_total = 3, includes_bonus = false, collections_count = 1
WHERE plan_type = 'trimestral' AND deliveries_total IS NULL;

UPDATE subscription_plans 
SET deliveries_total = 6, includes_bonus = true, collections_count = 1
WHERE plan_type = 'semestral' AND deliveries_total IS NULL;

-- Modificar tabela collections
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS available_for_plans text[] DEFAULT ARRAY['trimestral', 'semestral'],
  ADD COLUMN IF NOT EXISTS is_semestral_exclusive boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_special_edition boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_limited_availability boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_collections_availability ON collections USING GIN(available_for_plans);

-- Modificar tabela subscription_deliveries
ALTER TABLE subscription_deliveries
  ADD COLUMN IF NOT EXISTS cycle_id uuid REFERENCES cycles(id);

CREATE INDEX IF NOT EXISTS idx_deliveries_cycle ON subscription_deliveries(cycle_id);

-- =====================================================
-- PART 4: CREATE TRIGGERS
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_cycles_updated_at ON cycles;
CREATE TRIGGER update_cycles_updated_at
  BEFORE UPDATE ON cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_holidays_updated_at ON holidays;
CREATE TRIGGER update_holidays_updated_at
  BEFORE UPDATE ON holidays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bonus_pieces_updated_at ON bonus_pieces;
CREATE TRIGGER update_bonus_pieces_updated_at
  BEFORE UPDATE ON bonus_pieces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 5: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_pieces ENABLE ROW LEVEL SECURITY;

-- Políticas para cycles
DROP POLICY IF EXISTS "Qualquer um pode visualizar ciclos" ON cycles;
CREATE POLICY "Qualquer um pode visualizar ciclos"
  ON cycles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins podem gerenciar ciclos" ON cycles;
CREATE POLICY "Admins podem gerenciar ciclos"
  ON cycles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para holidays
DROP POLICY IF EXISTS "Qualquer um pode visualizar feriados" ON holidays;
CREATE POLICY "Qualquer um pode visualizar feriados"
  ON holidays FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins podem gerenciar feriados" ON holidays;
CREATE POLICY "Admins podem gerenciar feriados"
  ON holidays FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para bonus_pieces
DROP POLICY IF EXISTS "Usuários visualizam seus próprios bônus" ON bonus_pieces;
CREATE POLICY "Usuários visualizam seus próprios bônus"
  ON bonus_pieces FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins podem gerenciar bônus" ON bonus_pieces;
CREATE POLICY "Admins podem gerenciar bônus"
  ON bonus_pieces FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- PART 6: SEED BRAZILIAN HOLIDAYS (2026-2030)
-- =====================================================

-- Inserir feriados nacionais fixos
INSERT INTO holidays (holiday_date, name, type, is_recurring) VALUES
  -- 2026
  ('2026-01-01', 'Ano Novo', 'national', true),
  ('2026-04-21', 'Tiradentes', 'national', true),
  ('2026-05-01', 'Dia do Trabalho', 'national', true),
  ('2026-09-07', 'Independência do Brasil', 'national', true),
  ('2026-10-12', 'Nossa Senhora Aparecida', 'national', true),
  ('2026-11-02', 'Finados', 'national', true),
  ('2026-11-15', 'Proclamação da República', 'national', true),
  ('2026-12-25', 'Natal', 'national', true),
  
  -- 2027
  ('2027-01-01', 'Ano Novo', 'national', true),
  ('2027-04-21', 'Tiradentes', 'national', true),
  ('2027-05-01', 'Dia do Trabalho', 'national', true),
  ('2027-09-07', 'Independência do Brasil', 'national', true),
  ('2027-10-12', 'Nossa Senhora Aparecida', 'national', true),
  ('2027-11-02', 'Finados', 'national', true),
  ('2027-11-15', 'Proclamação da República', 'national', true),
  ('2027-12-25', 'Natal', 'national', true),
  
  -- 2028
  ('2028-01-01', 'Ano Novo', 'national', true),
  ('2028-04-21', 'Tiradentes', 'national', true),
  ('2028-05-01', 'Dia do Trabalho', 'national', true),
  ('2028-09-07', 'Independência do Brasil', 'national', true),
  ('2028-10-12', 'Nossa Senhora Aparecida', 'national', true),
  ('2028-11-02', 'Finados', 'national', true),
  ('2028-11-15', 'Proclamação da República', 'national', true),
  ('2028-12-25', 'Natal', 'national', true),
  
  -- 2029
  ('2029-01-01', 'Ano Novo', 'national', true),
  ('2029-04-21', 'Tiradentes', 'national', true),
  ('2029-05-01', 'Dia do Trabalho', 'national', true),
  ('2029-09-07', 'Independência do Brasil', 'national', true),
  ('2029-10-12', 'Nossa Senhora Aparecida', 'national', true),
  ('2029-11-02', 'Finados', 'national', true),
  ('2029-11-15', 'Proclamação da República', 'national', true),
  ('2029-12-25', 'Natal', 'national', true),
  
  -- 2030
  ('2030-01-01', 'Ano Novo', 'national', true),
  ('2030-04-21', 'Tiradentes', 'national', true),
  ('2030-05-01', 'Dia do Trabalho', 'national', true),
  ('2030-09-07', 'Independência do Brasil', 'national', true),
  ('2030-10-12', 'Nossa Senhora Aparecida', 'national', true),
  ('2030-11-02', 'Finados', 'national', true),
  ('2030-11-15', 'Proclamação da República', 'national', true),
  ('2030-12-25', 'Natal', 'national', true)
ON CONFLICT (holiday_date, type, state_code) DO NOTHING;

-- Inserir feriados variáveis (Carnaval, Sexta-feira Santa, Corpus Christi)
INSERT INTO holidays (holiday_date, name, type, is_recurring) VALUES
  -- 2026
  ('2026-02-16', 'Carnaval', 'national', false),
  ('2026-02-17', 'Carnaval', 'national', false),
  ('2026-04-03', 'Sexta-feira Santa', 'national', false),
  ('2026-06-04', 'Corpus Christi', 'national', false),
  
  -- 2027
  ('2027-02-08', 'Carnaval', 'national', false),
  ('2027-02-09', 'Carnaval', 'national', false),
  ('2027-03-26', 'Sexta-feira Santa', 'national', false),
  ('2027-05-27', 'Corpus Christi', 'national', false),
  
  -- 2028
  ('2028-02-28', 'Carnaval', 'national', false),
  ('2028-02-29', 'Carnaval', 'national', false),
  ('2028-04-14', 'Sexta-feira Santa', 'national', false),
  ('2028-06-15', 'Corpus Christi', 'national', false),
  
  -- 2029
  ('2029-02-12', 'Carnaval', 'national', false),
  ('2029-02-13', 'Carnaval', 'national', false),
  ('2029-03-30', 'Sexta-feira Santa', 'national', false),
  ('2029-05-31', 'Corpus Christi', 'national', false),
  
  -- 2030
  ('2030-03-04', 'Carnaval', 'national', false),
  ('2030-03-05', 'Carnaval', 'national', false),
  ('2030-04-19', 'Sexta-feira Santa', 'national', false),
  ('2030-06-20', 'Corpus Christi', 'national', false)
ON CONFLICT (holiday_date, type, state_code) DO NOTHING;

-- Inserir feriados estaduais da Bahia
INSERT INTO holidays (holiday_date, name, type, state_code, is_recurring) VALUES
  ('2026-07-02', 'Independência da Bahia', 'state', 'BA', true),
  ('2027-07-02', 'Independência da Bahia', 'state', 'BA', true),
  ('2028-07-02', 'Independência da Bahia', 'state', 'BA', true),
  ('2029-07-02', 'Independência da Bahia', 'state', 'BA', true),
  ('2030-07-02', 'Independência da Bahia', 'state', 'BA', true)
ON CONFLICT (holiday_date, type, state_code) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE cycles IS 'Ciclos quinzenais de produção e envio';
COMMENT ON TABLE holidays IS 'Feriados nacionais e estaduais para cálculo de dias úteis';
COMMENT ON TABLE bonus_pieces IS 'Peças bônus exclusivas do plano semestral';

COMMENT ON COLUMN cycles.cycle_number IS '1 = dias 1-15, 2 = dias 16-fim do mês';
COMMENT ON COLUMN cycles.status IS 'open, production, shipping, completed';
COMMENT ON COLUMN holidays.type IS 'national ou state';
COMMENT ON COLUMN subscriptions.is_legacy_model IS 'true = modelo antigo de precificação por coleção';
