-- Sistema de Colecionador
-- Adiciona campos de colecionador à tabela profiles

-- Primeiro, adicionar colunas básicas de perfil público se não existirem
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

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

-- RLS para collector_badges (público para leitura)
ALTER TABLE collector_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges são públicos para leitura"
  ON collector_badges FOR SELECT
  TO authenticated
  USING (true);

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

CREATE POLICY "Usuários podem ver seus próprios badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

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

CREATE POLICY "Usuários podem gerenciar sua própria coleção"
  ON public_collection FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

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

-- Inserir alguns badges iniciais
INSERT INTO collector_badges (name, description, icon, rarity, requirement_type, requirement_value)
VALUES 
  ('Primeiro Passo', 'Adicionou sua primeira peça à coleção', '🎯', 'common', 'pieces_owned', 1),
  ('Colecionador Iniciante', 'Possui 10 peças na coleção', '⭐', 'common', 'pieces_owned', 10),
  ('Colecionador Dedicado', 'Possui 50 peças na coleção', '🌟', 'rare', 'pieces_owned', 50),
  ('Colecionador Expert', 'Possui 100 peças na coleção', '💎', 'epic', 'pieces_owned', 100),
  ('Mestre Colecionador', 'Possui 500 peças na coleção', '👑', 'legendary', 'pieces_owned', 500)
ON CONFLICT DO NOTHING;
