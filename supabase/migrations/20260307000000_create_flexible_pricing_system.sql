-- ============================================================================
-- Migration: Create Flexible Pricing System with Categories
-- Description: Sistema flexível de categorias de preço + Coleções + Catálogo
-- Date: 2026-03-07 00:00:00
-- ============================================================================

-- ============================================================================
-- PASSO 1: Criar tabela de categorias de preço (configurável)
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'standard', 'premium', 'ultra', 'legendary', etc.
  display_name TEXT NOT NULL, -- 'Padrão', 'Premium', 'Ultra Raro', 'Lendário'
  description TEXT,
  price_standalone INTEGER NOT NULL, -- Preço avulso em centavos
  price_coins INTEGER NOT NULL, -- Preço em coins (catálogo)
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_price_categories_active ON price_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_price_categories_order ON price_categories(display_order);

COMMENT ON TABLE price_categories IS 
  'Categorias de preço configuráveis.
   Admin pode criar novas categorias e definir preços livremente.
   Exemplos: Padrão (200 coins), Premium (300 coins), Ultra (450 coins), Lendário (600 coins).';

-- ============================================================================
-- PASSO 2: Inserir categorias de preço padrão
-- ============================================================================

INSERT INTO price_categories (id, name, display_name, description, price_standalone, price_coins, display_order)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'standard',
    'Padrão',
    'Personagens padrão com preço acessível',
    50000, -- R$ 500,00
    200,   -- 200 coins (alinhado com subscription base price)
    1
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'premium',
    'Premium',
    'Personagens especiais com detalhes extras',
    90000, -- R$ 900,00
    300,   -- 300 coins (alinhado com standard_catalog base price)
    2
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'ultra',
    'Ultra Raro',
    'Personagens raros com acabamento superior',
    120000, -- R$ 1.200,00
    450,    -- 450 coins (alinhado com premium_catalog base price)
    3
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'legendary',
    'Lendário',
    'Personagens lendários, edição limitada',
    150000, -- R$ 1.500,00
    600,    -- 600 coins (categoria especial)
    4
  )
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_standalone = EXCLUDED.price_standalone,
  price_coins = EXCLUDED.price_coins,
  display_order = EXCLUDED.display_order;

-- ============================================================================
-- PASSO 3: Atualizar tabela collection_characters
-- ============================================================================

-- Adicionar coluna price_category_id (para personagens do catálogo)
ALTER TABLE collection_characters
ADD COLUMN IF NOT EXISTS price_category_id UUID REFERENCES price_categories(id);

COMMENT ON COLUMN collection_characters.price_category_id IS 
  'Categoria de preço do personagem (apenas para catálogo).
   NULL = personagem de coleção (usa preço contextual)
   NOT NULL = personagem do catálogo (usa preço da categoria)';

-- Adicionar coluna is_catalog para diferenciar
ALTER TABLE collection_characters
ADD COLUMN IF NOT EXISTS is_catalog BOOLEAN DEFAULT false;

COMMENT ON COLUMN collection_characters.is_catalog IS 
  'Indica se personagem pertence ao catálogo avulso.
   false = personagem de coleção (collection_id é obrigatório)
   true = personagem do catálogo (collection_id pode ser NULL)';

-- Tornar collection_id opcional para personagens do catálogo
ALTER TABLE collection_characters
ALTER COLUMN collection_id DROP NOT NULL;

-- ============================================================================
-- PASSO 4: Criar view para facilitar consultas
-- ============================================================================

CREATE OR REPLACE VIEW characters_with_pricing AS
SELECT 
  cc.id,
  cc.name,
  cc.description,
  cc.image_url,
  cc.status,
  cc.release_order,
  cc.is_catalog,
  
  -- Dados da coleção (se pertencer a uma)
  cc.collection_id,
  col.name as collection_name,
  col.slug as collection_slug,
  
  -- Dados da categoria de preço (se for catálogo)
  cc.price_category_id,
  pc.name as price_category_name,
  pc.display_name as price_category_display_name,
  pc.price_standalone,
  pc.price_coins,
  
  -- Indicadores
  CASE 
    WHEN cc.is_catalog THEN 'catalog'
    ELSE 'collection'
  END as source_type
  
FROM collection_characters cc
LEFT JOIN collections col ON col.id = cc.collection_id
LEFT JOIN price_categories pc ON pc.id = cc.price_category_id;

COMMENT ON VIEW characters_with_pricing IS 
  'View consolidada com personagens e seus preços.
   Inclui tanto personagens de coleções quanto do catálogo.';

-- ============================================================================
-- PASSO 5: Função para calcular preço contextual (atualizada)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_character_price_contextual(
  p_character_id UUID,
  p_active_collection_id UUID
)
RETURNS TABLE(
  price_coins INTEGER,
  price_standalone INTEGER,
  price_type TEXT
) AS $$
DECLARE
  v_character RECORD;
BEGIN
  -- Buscar dados do personagem
  SELECT 
    cc.collection_id,
    cc.is_catalog,
    cc.price_category_id,
    pc.price_coins as catalog_price_coins,
    pc.price_standalone as catalog_price_standalone
  INTO v_character
  FROM collection_characters cc
  LEFT JOIN price_categories pc ON pc.id = cc.price_category_id
  WHERE cc.id = p_character_id;
  
  -- Se não encontrou, retornar NULL
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Se é personagem do CATÁLOGO
  IF v_character.is_catalog THEN
    RETURN QUERY SELECT 
      v_character.catalog_price_coins,
      v_character.catalog_price_standalone,
      'catalog'::TEXT;
    RETURN;
  END IF;
  
  -- Se é personagem de COLEÇÃO
  -- Verificar se é da coleção ativa
  IF v_character.collection_id = p_active_collection_id THEN
    -- Coleção ativa: 200 coins (preço prioritário)
    RETURN QUERY SELECT 
      200,
      50000, -- R$ 500,00
      'active_collection'::TEXT;
    RETURN;
  ELSE
    -- Outra coleção: 300 coins (preço contextual)
    RETURN QUERY SELECT 
      300,
      50000, -- R$ 500,00
      'other_collection'::TEXT;
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_character_price_contextual IS 
  'Calcula preço contextual de um personagem.
   
   CATÁLOGO: Usa preço da categoria (ex: 450 coins para premium)
   COLEÇÃO ATIVA: 200 coins (desconto)
   OUTRA COLEÇÃO: 300 coins (preço normal)';

-- ============================================================================
-- PASSO 6: RLS para price_categories
-- ============================================================================

ALTER TABLE price_categories ENABLE ROW LEVEL SECURITY;

-- Todos podem ver categorias ativas
CREATE POLICY "Categorias ativas são públicas"
  ON price_categories FOR SELECT
  USING (is_active = true);

-- Apenas admins podem gerenciar
CREATE POLICY "Apenas admins podem gerenciar categorias"
  ON price_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- PASSO 7: Trigger para updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_price_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_price_categories_updated_at
  BEFORE UPDATE ON price_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_price_categories_updated_at();

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

DO $$
DECLARE
  v_categories_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_categories_count
  FROM price_categories;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SISTEMA DE PREÇOS FLEXÍVEL CRIADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Categorias de preço criadas: %', v_categories_count;
  RAISE NOTICE '';
  RAISE NOTICE 'CATEGORIAS DISPONÍVEIS:';
  RAISE NOTICE '  1. Padrão: R$ 500 / 200 coins';
  RAISE NOTICE '  2. Premium: R$ 900 / 300 coins';
  RAISE NOTICE '  3. Ultra Raro: R$ 1.200 / 450 coins';
  RAISE NOTICE '  4. Lendário: R$ 1.500 / 600 coins';
  RAISE NOTICE '';
  RAISE NOTICE 'PREÇOS CONTEXTUAIS (COLEÇÕES):';
  RAISE NOTICE '  - Coleção ativa: 200 coins';
  RAISE NOTICE '  - Outra coleção: 300 coins';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin pode criar novas categorias livremente!';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
