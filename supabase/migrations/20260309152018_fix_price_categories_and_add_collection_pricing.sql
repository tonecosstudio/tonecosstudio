-- =====================================================
-- Migration: Fix Price Categories and Add Collection Pricing
-- Description: Adicionar is_active a price_categories e criar tabelas de pricing de coleções
-- =====================================================

-- =====================================================
-- 1. Fix price_categories - adicionar is_active
-- =====================================================
ALTER TABLE price_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_price_categories_active ON price_categories(is_active);

-- Atualizar registros existentes
UPDATE price_categories SET is_active = true WHERE is_active IS NULL;

-- =====================================================
-- 2. COLLECTION_TYPES - Tipos de coleção
-- =====================================================
CREATE TABLE IF NOT EXISTS collection_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_collection_types_active ON collection_types(is_active);
CREATE INDEX idx_collection_types_order ON collection_types(display_order);

-- RLS
ALTER TABLE collection_types ENABLE ROW LEVEL SECURITY;

-- Todos podem ver tipos ativos
CREATE POLICY "Anyone can view active collection types"
  ON collection_types FOR SELECT
  USING (is_active = true);

-- Admins podem ver todos
CREATE POLICY "Admins can view all collection types"
  ON collection_types FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage collection types"
  ON collection_types FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- =====================================================
-- 3. COLLECTION_BASE_PRICING - Preços base por tipo
-- =====================================================
CREATE TABLE IF NOT EXISTS collection_base_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_type_id UUID REFERENCES collection_types(id) ON DELETE CASCADE,
  base_price_coins INTEGER NOT NULL CHECK (base_price_coins > 0),
  base_price_brl DECIMAL(10,2) NOT NULL CHECK (base_price_brl > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(collection_type_id)
);

-- Índices
CREATE INDEX idx_collection_base_pricing_type ON collection_base_pricing(collection_type_id);
CREATE INDEX idx_collection_base_pricing_active ON collection_base_pricing(is_active);

-- RLS
ALTER TABLE collection_base_pricing ENABLE ROW LEVEL SECURITY;

-- Todos podem ver preços ativos
CREATE POLICY "Anyone can view active pricing"
  ON collection_base_pricing FOR SELECT
  USING (is_active = true);

-- Admins podem ver todos
CREATE POLICY "Admins can view all pricing"
  ON collection_base_pricing FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage pricing"
  ON collection_base_pricing FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- =====================================================
-- 4. Triggers para updated_at
-- =====================================================
CREATE TRIGGER set_updated_at_collection_types
  BEFORE UPDATE ON collection_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_collection_base_pricing
  BEFORE UPDATE ON collection_base_pricing
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 5. Dados iniciais - Tipos de coleção
-- =====================================================
INSERT INTO collection_types (name, display_name, description, display_order)
VALUES
  ('standard', 'Padrão', 'Coleção padrão com personagens clássicos', 1),
  ('premium', 'Premium', 'Coleção premium com acabamento especial', 2),
  ('limited', 'Edição Limitada', 'Coleção de edição limitada', 3),
  ('exclusive', 'Exclusiva', 'Coleção exclusiva para colecionadores', 4)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 6. Dados iniciais - Preços base
-- =====================================================
INSERT INTO collection_base_pricing (collection_type_id, base_price_coins, base_price_brl)
SELECT 
  id,
  CASE name
    WHEN 'standard' THEN 150
    WHEN 'premium' THEN 200
    WHEN 'limited' THEN 250
    WHEN 'exclusive' THEN 350
  END,
  CASE name
    WHEN 'standard' THEN 150.00
    WHEN 'premium' THEN 200.00
    WHEN 'limited' THEN 250.00
    WHEN 'exclusive' THEN 350.00
  END
FROM collection_types
ON CONFLICT (collection_type_id) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE collection_types IS 'Tipos de coleção disponíveis';
COMMENT ON TABLE collection_base_pricing IS 'Preços base por tipo de coleção';

COMMENT ON COLUMN price_categories.is_active IS 'Se a categoria está ativa e disponível';
COMMENT ON COLUMN collection_base_pricing.base_price_coins IS 'Preço base em moedas';
COMMENT ON COLUMN collection_base_pricing.base_price_brl IS 'Preço base em reais';
