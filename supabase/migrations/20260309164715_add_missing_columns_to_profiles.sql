-- =====================================================
-- Migration: Add Missing Columns to profiles
-- Description: Adiciona colunas de perfil público e estatísticas de colecionador
-- =====================================================

-- =====================================================
-- ADICIONAR COLUNAS FALTANTES
-- =====================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS collector_level INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN IF NOT EXISTS collector_xp INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS pieces_owned INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON profiles(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_profiles_collector_level ON profiles(collector_level);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN profiles.username IS 'Nome de usuário único para perfil público';
COMMENT ON COLUMN profiles.display_name IS 'Nome de exibição público';
COMMENT ON COLUMN profiles.bio IS 'Biografia do colecionador';
COMMENT ON COLUMN profiles.avatar_url IS 'URL do avatar do usuário';
COMMENT ON COLUMN profiles.is_public IS 'Indica se o perfil é público';
COMMENT ON COLUMN profiles.collector_level IS 'Nível do colecionador (baseado em XP)';
COMMENT ON COLUMN profiles.collector_xp IS 'Pontos de experiência do colecionador';
COMMENT ON COLUMN profiles.pieces_owned IS 'Quantidade de peças na coleção';
COMMENT ON COLUMN profiles.total_spent IS 'Total gasto em compras';

-- Recarregar schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
