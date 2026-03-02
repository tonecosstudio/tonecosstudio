-- Migration: Landing Page Tables
-- Criação das tabelas necessárias para a landing page ORDAX

-- =====================================================
-- Tabela: community_suggestions
-- Armazena sugestões da comunidade para futuras coleções
-- =====================================================
CREATE TABLE IF NOT EXISTS community_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  
  CONSTRAINT suggestion_not_empty CHECK (LENGTH(TRIM(suggestion)) > 0)
);

-- Índices para community_suggestions
CREATE INDEX IF NOT EXISTS idx_suggestions_user ON community_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON community_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_created ON community_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_reviewed_by ON community_suggestions(reviewed_by);

-- Comentários
COMMENT ON TABLE community_suggestions IS 'Sugestões da comunidade para futuras coleções';
COMMENT ON COLUMN community_suggestions.status IS 'Status da sugestão: pending, reviewed, approved, rejected';

-- =====================================================
-- Tabela: founders_program
-- Gerencia o programa de membros fundadores
-- =====================================================
CREATE TABLE IF NOT EXISTS founders_program (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  interests TEXT[],
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'inactive')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  benefits_activated BOOLEAN DEFAULT false,
  notes TEXT,
  
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT full_name_not_empty CHECK (LENGTH(TRIM(full_name)) > 0)
);

-- Índices para founders_program
CREATE INDEX IF NOT EXISTS idx_founders_user ON founders_program(user_id);
CREATE INDEX IF NOT EXISTS idx_founders_status ON founders_program(status);
CREATE INDEX IF NOT EXISTS idx_founders_email ON founders_program(email);
CREATE INDEX IF NOT EXISTS idx_founders_joined ON founders_program(joined_at DESC);

-- Comentários
COMMENT ON TABLE founders_program IS 'Programa de membros fundadores com benefícios exclusivos';
COMMENT ON COLUMN founders_program.status IS 'Status do membro: pending, approved, active, inactive';
COMMENT ON COLUMN founders_program.benefits_activated IS 'Indica se os benefícios foram ativados';

-- =====================================================
-- Tabela: order_migrations
-- Gerencia solicitações de migração de pedidos anteriores
-- =====================================================
CREATE TABLE IF NOT EXISTS order_migrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  old_order_number VARCHAR(100),
  order_description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'approved', 'migrated', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  analyzed_at TIMESTAMP WITH TIME ZONE,
  analyzed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  new_order_id UUID,
  rejection_reason TEXT,
  
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT description_not_empty CHECK (LENGTH(TRIM(order_description)) > 0)
);

-- Índices para order_migrations
CREATE INDEX IF NOT EXISTS idx_migrations_user ON order_migrations(user_id);
CREATE INDEX IF NOT EXISTS idx_migrations_status ON order_migrations(status);
CREATE INDEX IF NOT EXISTS idx_migrations_created ON order_migrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_migrations_analyzed_by ON order_migrations(analyzed_by);
CREATE INDEX IF NOT EXISTS idx_migrations_email ON order_migrations(email);

-- Comentários
COMMENT ON TABLE order_migrations IS 'Solicitações de migração de pedidos anteriores para o novo sistema';
COMMENT ON COLUMN order_migrations.status IS 'Status da migração: pending, analyzing, approved, migrated, rejected';
COMMENT ON COLUMN order_migrations.new_order_id IS 'ID do novo pedido após migração bem-sucedida';

-- =====================================================
-- RLS Policies: community_suggestions
-- =====================================================
ALTER TABLE community_suggestions ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem criar sugestões
CREATE POLICY "Users can create suggestions"
  ON community_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem ver suas próprias sugestões
CREATE POLICY "Users can view own suggestions"
  ON community_suggestions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins podem ver todas as sugestões
CREATE POLICY "Admins can view all suggestions"
  ON community_suggestions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins podem atualizar sugestões
CREATE POLICY "Admins can update suggestions"
  ON community_suggestions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- RLS Policies: founders_program
-- =====================================================
ALTER TABLE founders_program ENABLE ROW LEVEL SECURITY;

-- Usuários podem criar sua própria entrada no programa
CREATE POLICY "Users can create own founder entry"
  ON founders_program
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem ver sua própria entrada
CREATE POLICY "Users can view own founder entry"
  ON founders_program
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins podem ver todas as entradas
CREATE POLICY "Admins can view all founder entries"
  ON founders_program
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins podem atualizar entradas
CREATE POLICY "Admins can update founder entries"
  ON founders_program
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- RLS Policies: order_migrations
-- =====================================================
ALTER TABLE order_migrations ENABLE ROW LEVEL SECURITY;

-- Usuários podem criar solicitações de migração
CREATE POLICY "Users can create migration requests"
  ON order_migrations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem ver suas próprias migrações
CREATE POLICY "Users can view own migrations"
  ON order_migrations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins podem ver todas as migrações
CREATE POLICY "Admins can view all migrations"
  ON order_migrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins podem atualizar migrações
CREATE POLICY "Admins can update migrations"
  ON order_migrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- Funções auxiliares
-- =====================================================

-- Função para aprovar membro fundador
CREATE OR REPLACE FUNCTION approve_founder_member(
  p_founder_id UUID,
  p_admin_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE founders_program
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_by = p_admin_id
  WHERE id = p_founder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para ativar benefícios do fundador
CREATE OR REPLACE FUNCTION activate_founder_benefits(
  p_founder_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE founders_program
  SET 
    benefits_activated = true,
    status = 'active'
  WHERE id = p_founder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para aprovar migração de pedido
CREATE OR REPLACE FUNCTION approve_order_migration(
  p_migration_id UUID,
  p_admin_id UUID,
  p_new_order_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE order_migrations
  SET 
    status = 'migrated',
    analyzed_at = NOW(),
    analyzed_by = p_admin_id,
    new_order_id = p_new_order_id
  WHERE id = p_migration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para rejeitar migração de pedido
CREATE OR REPLACE FUNCTION reject_order_migration(
  p_migration_id UUID,
  p_admin_id UUID,
  p_rejection_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE order_migrations
  SET 
    status = 'rejected',
    analyzed_at = NOW(),
    analyzed_by = p_admin_id,
    rejection_reason = p_rejection_reason
  WHERE id = p_migration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grants
-- =====================================================

-- Conceder permissões de execução nas funções
GRANT EXECUTE ON FUNCTION approve_founder_member TO authenticated;
GRANT EXECUTE ON FUNCTION activate_founder_benefits TO authenticated;
GRANT EXECUTE ON FUNCTION approve_order_migration TO authenticated;
GRANT EXECUTE ON FUNCTION reject_order_migration TO authenticated;
