-- =====================================================
-- Migration: Add Missing Columns to models
-- Description: Adiciona colunas franchise, image_bucket e image_path
-- =====================================================

-- =====================================================
-- ADICIONAR COLUNAS FALTANTES
-- =====================================================

ALTER TABLE models
ADD COLUMN IF NOT EXISTS franchise TEXT,
ADD COLUMN IF NOT EXISTS image_bucket TEXT DEFAULT 'models',
ADD COLUMN IF NOT EXISTS image_path TEXT;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_models_franchise ON models(franchise);
CREATE INDEX IF NOT EXISTS idx_models_image_bucket ON models(image_bucket);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN models.franchise IS 'Franquia ou série do modelo (ex: Marvel, DC, Star Wars)';
COMMENT ON COLUMN models.image_bucket IS 'Nome do bucket de storage onde a imagem está armazenada';
COMMENT ON COLUMN models.image_path IS 'Caminho da imagem dentro do bucket';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
