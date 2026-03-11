-- =====================================================
-- Migration: Create Catalog and Pricing Tables
-- Description: Tabelas para catálogo avançado e categorias de preço
-- =====================================================

-- =====================================================
-- 1. PRICE_CATEGORIES - Categorias de preço
-- =====================================================
CREATE TABLE IF NOT EXISTS price_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  price_coins DECIMAL(10,2) NOT NULL,
  price_standalone DECIMAL(10,2) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_price_categories_display_order ON price_categories(display_order);

-- RLS
ALTER TABLE price_categories ENABLE ROW LEVEL SECURITY;

-- Todos podem ver categorias de preço
CREATE POLICY "Anyone can view price categories"
  ON price_categories FOR SELECT
  USING (true);

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage price categories"
  ON price_categories FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- =====================================================
-- 2. COLLECTION_CHARACTERS - Relacionamento avançado
-- =====================================================
CREATE TABLE IF NOT EXISTS collection_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  theme_category TEXT,
  product_line TEXT,
  is_catalog BOOLEAN DEFAULT false,
  price_category_id UUID REFERENCES price_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(collection_id, character_id)
);

-- Índices
CREATE INDEX idx_collection_characters_collection ON collection_characters(collection_id);
CREATE INDEX idx_collection_characters_character ON collection_characters(character_id);
CREATE INDEX idx_collection_characters_catalog ON collection_characters(is_catalog);
CREATE INDEX idx_collection_characters_theme ON collection_characters(theme_category);
CREATE INDEX idx_collection_characters_product_line ON collection_characters(product_line);
CREATE INDEX idx_collection_characters_price_category ON collection_characters(price_category_id);

-- RLS
ALTER TABLE collection_characters ENABLE ROW LEVEL SECURITY;

-- Todos podem ver itens do catálogo
CREATE POLICY "Anyone can view catalog items"
  ON collection_characters FOR SELECT
  USING (is_catalog = true);

-- Admins podem ver tudo
CREATE POLICY "Admins can view all collection characters"
  ON collection_characters FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage collection characters"
  ON collection_characters FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- =====================================================
-- 3. Triggers para updated_at
-- =====================================================
CREATE TRIGGER set_updated_at_price_categories
  BEFORE UPDATE ON price_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_collection_characters
  BEFORE UPDATE ON collection_characters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 4. Dados iniciais - Categorias de preço padrão
-- =====================================================
INSERT INTO price_categories (name, display_name, price_coins, price_standalone, display_order)
VALUES
  ('standard', 'Padrão', 150.00, 150.00, 1),
  ('premium', 'Premium', 200.00, 200.00, 2),
  ('deluxe', 'Deluxe', 250.00, 250.00, 3),
  ('special', 'Especial', 300.00, 300.00, 4)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE price_categories IS 'Categorias de preço para personagens';
COMMENT ON TABLE collection_characters IS 'Relacionamento avançado entre coleções e personagens com metadados';

COMMENT ON COLUMN collection_characters.theme_category IS 'Categoria temática do personagem';
COMMENT ON COLUMN collection_characters.product_line IS 'Linha de produto';
COMMENT ON COLUMN collection_characters.is_catalog IS 'Se está disponível no catálogo público';
COMMENT ON COLUMN collection_characters.price_category_id IS 'Categoria de preço aplicada';
