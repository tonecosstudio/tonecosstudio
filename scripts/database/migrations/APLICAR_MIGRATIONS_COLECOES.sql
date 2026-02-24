-- ============================================
-- APLICAR NO SUPABASE SQL EDITOR
-- ============================================
-- Este script cria todas as tabelas necessárias para o sistema de coleções

-- ============================================
-- 0. COMPLETAR TABELA PROFILES
-- ============================================

-- Adicionar colunas básicas de perfil público
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- ============================================
-- 1. SISTEMA COLECIONADOR
-- ============================================

-- Adicionar colunas de colecionador ao profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS collector_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS collector_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pieces_owned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0;

-- Criar tabela de badges de colecionador
CREATE TABLE IF NOT EXISTS collector_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  requirement_type TEXT,
  requirement_value INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de badges dos usuários
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES collector_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Criar tabela de coleção pública
CREATE TABLE IF NOT EXISTS public_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, model_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_public_collection_user_id ON public_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_public_collection_model_id ON public_collection(model_id);

-- RLS para collector_badges
ALTER TABLE collector_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Badges são públicos para leitura" ON collector_badges;
CREATE POLICY "Badges são públicos para leitura"
  ON collector_badges FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Apenas admins podem gerenciar badges" ON collector_badges;
CREATE POLICY "Apenas admins podem gerenciar badges"
  ON collector_badges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS para user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus próprios badges" ON user_badges;
CREATE POLICY "Usuários podem ver seus próprios badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Badges de usuários públicos são visíveis" ON user_badges;
CREATE POLICY "Badges de usuários públicos são visíveis"
  ON user_badges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = user_badges.user_id 
      AND profiles.is_public = true
    )
  );

DROP POLICY IF EXISTS "Sistema pode inserir badges" ON user_badges;
CREATE POLICY "Sistema pode inserir badges"
  ON user_badges FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS para public_collection
ALTER TABLE public_collection ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem gerenciar sua própria coleção" ON public_collection;
CREATE POLICY "Usuários podem gerenciar sua própria coleção"
  ON public_collection FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Coleções públicas são visíveis" ON public_collection;
CREATE POLICY "Coleções públicas são visíveis"
  ON public_collection FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = public_collection.user_id 
      AND profiles.is_public = true
    )
  );

-- Inserir badges iniciais
INSERT INTO collector_badges (name, description, icon, rarity, requirement_type, requirement_value)
VALUES 
  ('Primeiro Passo', 'Adicionou sua primeira peça à coleção', '🎯', 'common', 'pieces_owned', 1),
  ('Colecionador Iniciante', 'Possui 10 peças na coleção', '⭐', 'common', 'pieces_owned', 10),
  ('Colecionador Dedicado', 'Possui 50 peças na coleção', '🌟', 'rare', 'pieces_owned', 50),
  ('Colecionador Expert', 'Possui 100 peças na coleção', '💎', 'epic', 'pieces_owned', 100),
  ('Mestre Colecionador', 'Possui 500 peças na coleção', '👑', 'legendary', 'pieces_owned', 500)
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. SISTEMA DE COLEÇÕES TEMÁTICAS
-- ============================================

-- Criar tabela de coleções
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de itens das coleções
CREATE TABLE IF NOT EXISTS collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, model_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_active ON collections(is_active);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_model_id ON collection_items(model_id);

-- RLS para collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coleções ativas são públicas" ON collections;
CREATE POLICY "Coleções ativas são públicas"
  ON collections FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins podem ver todas as coleções" ON collections;
CREATE POLICY "Admins podem ver todas as coleções"
  ON collections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Apenas admins podem gerenciar coleções" ON collections;
CREATE POLICY "Apenas admins podem gerenciar coleções"
  ON collections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS para collection_items
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Itens de coleções ativas são públicos" ON collection_items;
CREATE POLICY "Itens de coleções ativas são públicos"
  ON collection_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_items.collection_id 
      AND collections.is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins podem ver todos os itens" ON collection_items;
CREATE POLICY "Admins podem ver todos os itens"
  ON collection_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Apenas admins podem gerenciar itens" ON collection_items;
CREATE POLICY "Apenas admins podem gerenciar itens"
  ON collection_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS collections_updated_at ON collections;
CREATE TRIGGER collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collections_updated_at();

-- ============================================
-- CONCLUÍDO!
-- ============================================
-- Todas as tabelas foram criadas com sucesso
