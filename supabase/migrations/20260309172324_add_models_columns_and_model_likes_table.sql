-- =====================================================
-- Migration: Add Models Columns and Model Likes Table
-- Description: Adiciona colunas category, subcategory, tags à tabela models
--              e cria tabela model_likes para curtidas
-- =====================================================

-- =====================================================
-- ADICIONAR COLUNAS À TABELA MODELS
-- =====================================================

ALTER TABLE models
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_models_category ON models(category);
CREATE INDEX IF NOT EXISTS idx_models_subcategory ON models(subcategory);
CREATE INDEX IF NOT EXISTS idx_models_tags ON models USING GIN(tags); -- GIN index para arrays

-- =====================================================
-- CRIAR TABELA MODEL_LIKES
-- =====================================================

CREATE TABLE IF NOT EXISTS model_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES models(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Garantir que um usuário só pode curtir um modelo uma vez
  UNIQUE(model_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_model_likes_model_id ON model_likes(model_id);
CREATE INDEX IF NOT EXISTS idx_model_likes_user_id ON model_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_model_likes_created_at ON model_likes(created_at DESC);

-- =====================================================
-- RLS POLICIES PARA MODEL_LIKES
-- =====================================================

ALTER TABLE model_likes ENABLE ROW LEVEL SECURITY;

-- Todos podem ver curtidas
CREATE POLICY "model_likes_select_all"
  ON model_likes FOR SELECT
  USING (true);

-- Usuários autenticados podem curtir
CREATE POLICY "model_likes_insert_own"
  ON model_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem remover suas próprias curtidas
CREATE POLICY "model_likes_delete_own"
  ON model_likes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNÇÃO PARA CONTAR CURTIDAS
-- =====================================================

CREATE OR REPLACE FUNCTION get_model_likes_count(model_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM model_likes
  WHERE model_id = model_uuid;
$$;

-- =====================================================
-- FUNÇÃO PARA VERIFICAR SE USUÁRIO CURTIU
-- =====================================================

CREATE OR REPLACE FUNCTION user_liked_model(model_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM model_likes
    WHERE model_id = model_uuid
      AND user_id = user_uuid
  );
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN models.category IS 'Categoria principal do modelo (ex: Personagem, Veículo, Cenário)';
COMMENT ON COLUMN models.subcategory IS 'Subcategoria do modelo (ex: Herói, Vilão, Nave)';
COMMENT ON COLUMN models.tags IS 'Tags para busca e filtro (array de texto)';

COMMENT ON TABLE model_likes IS 'Curtidas de usuários em modelos 3D';
COMMENT ON COLUMN model_likes.model_id IS 'ID do modelo curtido';
COMMENT ON COLUMN model_likes.user_id IS 'ID do usuário que curtiu';

COMMENT ON FUNCTION get_model_likes_count IS 'Retorna o número total de curtidas de um modelo';
COMMENT ON FUNCTION user_liked_model IS 'Verifica se um usuário específico curtiu um modelo';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
