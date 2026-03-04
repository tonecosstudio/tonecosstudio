-- Migration: Landing Page Tables
-- CriaÃƒÂ§ÃƒÂ£o das tabelas necessÃƒÂ¡rias para a landing page ORDAX

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Tabela: community_suggestions
-- Armazena sugestÃƒÂµes da comunidade para futuras coleÃƒÂ§ÃƒÂµes
-- =====================================================
CREATE TABLE IF NOT EXISTS community_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  
  CONSTRAINT suggestion_not_empty CHECK (LENGTH(TRIM(suggestion)) > 0)
);

-- ÃƒÂndices para community_suggestions
CREATE INDEX IF NOT EXISTS idx_suggestions_user ON community_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON community_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_created ON community_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_reviewed_by ON community_suggestions(reviewed_by);

-- ComentÃƒÂ¡rios
COMMENT ON TABLE community_suggestions IS 'SugestÃƒÂµes da comunidade para futuras coleÃƒÂ§ÃƒÂµes';
COMMENT ON COLUMN community_suggestions.status IS 'Status da sugestÃƒÂ£o: pending, reviewed, approved, rejected';

-- =====================================================
-- Tabela: founders_program
-- Gerencia o programa de membros fundadores
-- =====================================================
CREATE TABLE IF NOT EXISTS founders_program (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ÃƒÂndices para founders_program
CREATE INDEX IF NOT EXISTS idx_founders_user ON founders_program(user_id);
CREATE INDEX IF NOT EXISTS idx_founders_status ON founders_program(status);
CREATE INDEX IF NOT EXISTS idx_founders_email ON founders_program(email);
CREATE INDEX IF NOT EXISTS idx_founders_joined ON founders_program(joined_at DESC);

-- ComentÃƒÂ¡rios
COMMENT ON TABLE founders_program IS 'Programa de membros fundadores com benefÃƒÂ­cios exclusivos';
COMMENT ON COLUMN founders_program.status IS 'Status do membro: pending, approved, active, inactive';
COMMENT ON COLUMN founders_program.benefits_activated IS 'Indica se os benefÃƒÂ­cios foram ativados';

-- =====================================================
-- Tabela: order_migrations
-- Gerencia solicitaÃƒÂ§ÃƒÂµes de migraÃƒÂ§ÃƒÂ£o de pedidos anteriores
-- =====================================================
CREATE TABLE IF NOT EXISTS order_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ÃƒÂndices para order_migrations
CREATE INDEX IF NOT EXISTS idx_migrations_user ON order_migrations(user_id);
CREATE INDEX IF NOT EXISTS idx_migrations_status ON order_migrations(status);
CREATE INDEX IF NOT EXISTS idx_migrations_created ON order_migrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_migrations_analyzed_by ON order_migrations(analyzed_by);
CREATE INDEX IF NOT EXISTS idx_migrations_email ON order_migrations(email);

-- ComentÃƒÂ¡rios
COMMENT ON TABLE order_migrations IS 'SolicitaÃƒÂ§ÃƒÂµes de migraÃƒÂ§ÃƒÂ£o de pedidos anteriores para o novo sistema';
COMMENT ON COLUMN order_migrations.status IS 'Status da migraÃƒÂ§ÃƒÂ£o: pending, analyzing, approved, migrated, rejected';
COMMENT ON COLUMN order_migrations.new_order_id IS 'ID do novo pedido apÃƒÂ³s migraÃƒÂ§ÃƒÂ£o bem-sucedida';

-- =====================================================
-- RLS Policies: community_suggestions
-- =====================================================
ALTER TABLE community_suggestions ENABLE ROW LEVEL SECURITY;

-- UsuÃƒÂ¡rios autenticados podem criar sugestÃƒÂµes
CREATE POLICY "Users can create suggestions"
  ON community_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UsuÃƒÂ¡rios podem ver suas prÃƒÂ³prias sugestÃƒÂµes
CREATE POLICY "Users can view own suggestions"
  ON community_suggestions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins podem ver todas as sugestÃƒÂµes
CREATE POLICY "Admins can view all suggestions"
  ON community_suggestions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem atualizar sugestÃƒÂµes
CREATE POLICY "Admins can update suggestions"
  ON community_suggestions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- RLS Policies: founders_program
-- =====================================================
ALTER TABLE founders_program ENABLE ROW LEVEL SECURITY;

-- UsuÃƒÂ¡rios podem criar sua prÃƒÂ³pria entrada no programa
CREATE POLICY "Users can create own founder entry"
  ON founders_program
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UsuÃƒÂ¡rios podem ver sua prÃƒÂ³pria entrada
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
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem atualizar entradas
CREATE POLICY "Admins can update founder entries"
  ON founders_program
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- RLS Policies: order_migrations
-- =====================================================
ALTER TABLE order_migrations ENABLE ROW LEVEL SECURITY;

-- UsuÃƒÂ¡rios podem criar solicitaÃƒÂ§ÃƒÂµes de migraÃƒÂ§ÃƒÂ£o
CREATE POLICY "Users can create migration requests"
  ON order_migrations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UsuÃƒÂ¡rios podem ver suas prÃƒÂ³prias migraÃƒÂ§ÃƒÂµes
CREATE POLICY "Users can view own migrations"
  ON order_migrations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins podem ver todas as migraÃƒÂ§ÃƒÂµes
CREATE POLICY "Admins can view all migrations"
  ON order_migrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins podem atualizar migraÃƒÂ§ÃƒÂµes
CREATE POLICY "Admins can update migrations"
  ON order_migrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- FunÃƒÂ§ÃƒÂµes auxiliares
-- =====================================================

-- FunÃƒÂ§ÃƒÂ£o para aprovar membro fundador
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

-- FunÃƒÂ§ÃƒÂ£o para ativar benefÃƒÂ­cios do fundador
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

-- FunÃƒÂ§ÃƒÂ£o para aprovar migraÃƒÂ§ÃƒÂ£o de pedido
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

-- FunÃƒÂ§ÃƒÂ£o para rejeitar migraÃƒÂ§ÃƒÂ£o de pedido
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

-- Conceder permissÃƒÂµes de execuÃƒÂ§ÃƒÂ£o nas funÃƒÂ§ÃƒÂµes
GRANT EXECUTE ON FUNCTION approve_founder_member TO authenticated;
GRANT EXECUTE ON FUNCTION activate_founder_benefits TO authenticated;
GRANT EXECUTE ON FUNCTION approve_order_migration TO authenticated;
GRANT EXECUTE ON FUNCTION reject_order_migration TO authenticated;
