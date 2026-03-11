-- =====================================================
-- Migration: Create Core Tables
-- Description: Tabelas principais do sistema (collections, characters, cycles)
-- =====================================================

-- Criar enums necessários
CREATE TYPE collection_status AS ENUM ('draft', 'active', 'inactive', 'archived');
CREATE TYPE cycle_status AS ENUM ('sales', 'production', 'shipping', 'completed', 'cancelled');

-- =====================================================
-- COLLECTIONS (Coleções de personagens)
-- =====================================================
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  status collection_status DEFAULT 'draft' NOT NULL,
  display_order INTEGER DEFAULT 0,
  total_characters INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_collections_is_active ON collections(is_active);
CREATE INDEX idx_collections_status ON collections(status);
CREATE INDEX idx_collections_display_order ON collections(display_order);

-- =====================================================
-- CHARACTERS (Personagens das coleções)
-- =====================================================
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_revealed BOOLEAN DEFAULT false NOT NULL,
  reveal_date TIMESTAMPTZ,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_characters_collection_id ON characters(collection_id);
CREATE INDEX idx_characters_is_revealed ON characters(is_revealed);
CREATE INDEX idx_characters_display_order ON characters(display_order);

-- =====================================================
-- CYCLES (Ciclos mensais de produção - 90 dias)
-- =====================================================
CREATE TABLE cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  cycle_number INTEGER DEFAULT 1 NOT NULL CHECK (cycle_number IN (1, 2)),
  status cycle_status DEFAULT 'sales' NOT NULL,
  sales_start_date DATE NOT NULL,
  sales_end_date DATE NOT NULL,
  production_start_date DATE NOT NULL,
  production_end_date DATE NOT NULL,
  shipping_start_date DATE NOT NULL,
  shipping_end_date DATE NOT NULL,
  capacity_limit INTEGER DEFAULT 100,
  reserved_capacity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(year, month, cycle_number)
);

CREATE INDEX idx_cycles_year_month ON cycles(year, month);
CREATE INDEX idx_cycles_status ON cycles(status);
CREATE INDEX idx_cycles_sales_dates ON cycles(sales_start_date, sales_end_date);

-- =====================================================
-- SYSTEM_SETTINGS (Configurações do sistema)
-- =====================================================
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Inserir configurações padrão
INSERT INTO system_settings (key, value, description) VALUES
  ('default_price_full', '150.00', 'Preço padrão em reais'),
  ('default_price_pix', '142.50', 'Preço com desconto PIX (5%)'),
  ('pix_discount_percentage', '5', 'Percentual de desconto PIX'),
  ('monthly_production_limit', '100', 'Limite de produção mensal'),
  ('sales_open_day', '1', 'Dia de abertura das vendas');

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Collections: Público pode ver ativas, admins veem todas
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_select_public"
  ON collections FOR SELECT
  USING (is_active = true AND status = 'active');

CREATE POLICY "collections_select_admin"
  ON collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "collections_modify_admin"
  ON collections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Characters: Público vê revelados, admins veem todos
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "characters_select_public"
  ON characters FOR SELECT
  USING (is_revealed = true);

CREATE POLICY "characters_select_admin"
  ON characters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "characters_modify_admin"
  ON characters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Cycles: Todos podem ver, apenas admins modificam
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cycles_select_all"
  ON cycles FOR SELECT
  USING (true);

CREATE POLICY "cycles_modify_admin"
  ON cycles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- System Settings: Todos podem ver, apenas admins modificam
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_settings_select_all"
  ON system_settings FOR SELECT
  USING (true);

CREATE POLICY "system_settings_modify_admin"
  ON system_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at
CREATE TRIGGER set_updated_at_collections
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_characters
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_cycles
  BEFORE UPDATE ON cycles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_system_settings
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE collections IS 'Coleções de personagens disponíveis para venda';
COMMENT ON TABLE characters IS 'Personagens individuais dentro de cada coleção';
COMMENT ON TABLE cycles IS 'Ciclos mensais de produção (modelo 90 dias: vendas 30d + produção 30d + envio 2ª quinzena)';
COMMENT ON TABLE system_settings IS 'Configurações gerais do sistema';
