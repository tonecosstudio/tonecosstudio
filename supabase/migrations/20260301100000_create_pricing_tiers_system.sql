-- ============================================
-- Migration: Sistema de Níveis de Preço (Pricing Tiers)
-- Data: 2026-03-01 10:00
-- Descrição: Criar estrutura completa para sistema de níveis de preço
-- ============================================

-- =====================================================
-- 1. CRIAR TABELA pricing_tiers
-- =====================================================

CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Preços
  price_full NUMERIC(10,2) NOT NULL CHECK (price_full > 0),
  deposit_amount NUMERIC(10,2) NOT NULL CHECK (deposit_amount > 0),
  pix_discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (pix_discount_percentage >= 0 AND pix_discount_percentage <= 100),
  price_pix NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(price_full * (1 - pix_discount_percentage / 100), 2)) STORED,
  
  -- Status e configuração
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT check_deposit_less_than_full CHECK (deposit_amount < price_full),
  CONSTRAINT check_pix_less_than_full CHECK (price_pix < price_full)
);

-- Índices
CREATE INDEX idx_pricing_tiers_active ON pricing_tiers(is_active) WHERE is_active = true;
CREATE INDEX idx_pricing_tiers_default ON pricing_tiers(is_default) WHERE is_default = true;
CREATE INDEX idx_pricing_tiers_display_order ON pricing_tiers(display_order);

-- Comentários
COMMENT ON TABLE pricing_tiers IS 'Níveis de preço reutilizáveis para coleções';
COMMENT ON COLUMN pricing_tiers.name IS 'Nome único do nível (ex: "Nível 1", "Premium")';
COMMENT ON COLUMN pricing_tiers.price_full IS 'Preço cheio sem desconto';
COMMENT ON COLUMN pricing_tiers.price_pix IS 'Preço com desconto PIX (calculado automaticamente)';
COMMENT ON COLUMN pricing_tiers.deposit_amount IS 'Valor da entrada';
COMMENT ON COLUMN pricing_tiers.pix_discount_percentage IS 'Percentual de desconto PIX (padrão 5%)';
COMMENT ON COLUMN pricing_tiers.is_default IS 'Se true, este é o nível padrão para novas coleções';
COMMENT ON COLUMN pricing_tiers.display_order IS 'Ordem de exibição na UI';

-- =====================================================
-- 2. CRIAR TABELA collection_tier_assignments
-- =====================================================

CREATE TABLE IF NOT EXISTS collection_tier_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES pricing_tiers(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  previous_tier_id UUID REFERENCES pricing_tiers(id),
  
  CONSTRAINT unique_collection_tier UNIQUE(collection_id)
);

-- Índices
CREATE INDEX idx_collection_tier_assignments_collection ON collection_tier_assignments(collection_id);
CREATE INDEX idx_collection_tier_assignments_tier ON collection_tier_assignments(tier_id);
CREATE INDEX idx_collection_tier_assignments_assigned_at ON collection_tier_assignments(assigned_at DESC);

-- Comentários
COMMENT ON TABLE collection_tier_assignments IS 'Atribuições de coleções a níveis de preço';
COMMENT ON COLUMN collection_tier_assignments.previous_tier_id IS 'Nível anterior para histórico';

-- =====================================================
-- 3. CRIAR TABELA pricing_history
-- =====================================================

CREATE TABLE IF NOT EXISTS pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID REFERENCES pricing_tiers(id) ON DELETE SET NULL,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'tier_created', 'tier_updated', 'tier_deleted', 
    'tier_assigned', 'tier_unassigned', 'price_propagated', 
    'custom_price_set'
  )),
  
  -- Valores antigos e novos
  old_price_full NUMERIC(10,2),
  new_price_full NUMERIC(10,2),
  old_price_pix NUMERIC(10,2),
  new_price_pix NUMERIC(10,2),
  old_deposit_amount NUMERIC(10,2),
  new_deposit_amount NUMERIC(10,2),
  
  -- Auditoria
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  metadata JSONB,
  
  CONSTRAINT check_tier_or_collection CHECK (tier_id IS NOT NULL OR collection_id IS NOT NULL)
);

-- Índices
CREATE INDEX idx_pricing_history_tier ON pricing_history(tier_id, changed_at DESC);
CREATE INDEX idx_pricing_history_collection ON pricing_history(collection_id, changed_at DESC);
CREATE INDEX idx_pricing_history_changed_at ON pricing_history(changed_at DESC);
CREATE INDEX idx_pricing_history_changed_by ON pricing_history(changed_by);
CREATE INDEX idx_pricing_history_change_type ON pricing_history(change_type);

-- Comentários
COMMENT ON TABLE pricing_history IS 'Histórico completo de mudanças de preço';
COMMENT ON COLUMN pricing_history.change_type IS 'Tipo de mudança realizada';
COMMENT ON COLUMN pricing_history.metadata IS 'Dados adicionais sobre a mudança (JSON)';

-- =====================================================
-- 4. CRIAR TABELA migration_audit
-- =====================================================

CREATE TABLE IF NOT EXISTS migration_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_type TEXT NOT NULL CHECK (migration_type IN ('initial_migration', 'bulk_assignment', 'rollback')),
  collections_affected INTEGER NOT NULL DEFAULT 0,
  tiers_created INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'rolled_back')),
  executed_by UUID REFERENCES auth.users(id),
  error_message TEXT,
  migration_data JSONB,
  
  CONSTRAINT check_completed_at_when_done CHECK (
    (status = 'in_progress' AND completed_at IS NULL) OR
    (status != 'in_progress' AND completed_at IS NOT NULL)
  )
);

-- Índices
CREATE INDEX idx_migration_audit_status ON migration_audit(status);
CREATE INDEX idx_migration_audit_started_at ON migration_audit(started_at DESC);

-- Comentários
COMMENT ON TABLE migration_audit IS 'Auditoria de operações de migração';
COMMENT ON COLUMN migration_audit.migration_data IS 'Snapshot dos dados antes da migração (JSON)';

-- =====================================================
-- 5. MODIFICAR TABELA collections
-- =====================================================

-- Adicionar coluna para indicar se usa nível ou preço customizado
ALTER TABLE collections
ADD COLUMN IF NOT EXISTS uses_tier_pricing BOOLEAN NOT NULL DEFAULT false;

-- Adicionar índice
CREATE INDEX IF NOT EXISTS idx_collections_uses_tier_pricing ON collections(uses_tier_pricing);

-- Comentário
COMMENT ON COLUMN collections.uses_tier_pricing IS 'Se true, usa preço do nível. Se false, usa preço customizado (is_price_custom)';

-- =====================================================
-- 6. HABILITAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_tier_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_audit ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CRIAR POLÍTICAS RLS
-- =====================================================

-- Políticas para pricing_tiers
CREATE POLICY "Usuários autenticados podem visualizar níveis ativos"
  ON pricing_tiers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins podem gerenciar todos os níveis"
  ON pricing_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Políticas para collection_tier_assignments
CREATE POLICY "Usuários autenticados podem visualizar atribuições"
  ON collection_tier_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem gerenciar atribuições"
  ON collection_tier_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Políticas para pricing_history
CREATE POLICY "Admins podem visualizar histórico"
  ON pricing_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Políticas para migration_audit
CREATE POLICY "Admins podem visualizar auditorias de migração"
  ON migration_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
