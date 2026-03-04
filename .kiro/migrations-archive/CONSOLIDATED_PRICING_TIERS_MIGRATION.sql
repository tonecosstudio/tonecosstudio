-- ============================================
-- MIGRAÇÃO CONSOLIDADA: Sistema de Níveis de Preço
-- Data: 2026-03-01
-- Descrição: Script consolidado com todas as 5 migrações
-- ============================================
-- 
-- INSTRUÇÕES DE APLICAÇÃO:
-- 1. Abra o Supabase Dashboard
-- 2. Vá em SQL Editor
-- 3. Cole este script completo
-- 4. Execute (Run)
-- 5. Verifique se não há erros
-- 
-- ============================================

-- =====================================================
-- PARTE 1: ESTRUTURA DE TABELAS
-- =====================================================

-- 1.1 CRIAR TABELA pricing_tiers
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

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_active ON pricing_tiers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_default ON pricing_tiers(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_display_order ON pricing_tiers(display_order);

COMMENT ON TABLE pricing_tiers IS 'Níveis de preço reutilizáveis para coleções';

-- 1.2 CRIAR TABELA collection_tier_assignments
CREATE TABLE IF NOT EXISTS collection_tier_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES pricing_tiers(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  previous_tier_id UUID REFERENCES pricing_tiers(id),
  
  CONSTRAINT unique_collection_tier UNIQUE(collection_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_tier_assignments_collection ON collection_tier_assignments(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_tier_assignments_tier ON collection_tier_assignments(tier_id);
CREATE INDEX IF NOT EXISTS idx_collection_tier_assignments_assigned_at ON collection_tier_assignments(assigned_at DESC);

COMMENT ON TABLE collection_tier_assignments IS 'Atribuições de coleções a níveis de preço';

-- 1.3 CRIAR TABELA pricing_history
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

CREATE INDEX IF NOT EXISTS idx_pricing_history_tier ON pricing_history(tier_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_history_collection ON pricing_history(collection_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_history_changed_at ON pricing_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_history_changed_by ON pricing_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_pricing_history_change_type ON pricing_history(change_type);

COMMENT ON TABLE pricing_history IS 'Histórico completo de mudanças de preço';

-- 1.4 CRIAR TABELA migration_audit
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

CREATE INDEX IF NOT EXISTS idx_migration_audit_status ON migration_audit(status);
CREATE INDEX IF NOT EXISTS idx_migration_audit_started_at ON migration_audit(started_at DESC);

COMMENT ON TABLE migration_audit IS 'Auditoria de operações de migração';

-- 1.5 MODIFICAR TABELA collections
ALTER TABLE collections
ADD COLUMN IF NOT EXISTS uses_tier_pricing BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_collections_uses_tier_pricing ON collections(uses_tier_pricing);

COMMENT ON COLUMN collections.uses_tier_pricing IS 'Se true, usa preço do nível. Se false, usa preço customizado (is_price_custom)';

-- 1.6 HABILITAR ROW LEVEL SECURITY
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_tier_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_audit ENABLE ROW LEVEL SECURITY;

-- 1.7 CRIAR POLÍTICAS RLS
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar níveis ativos" ON pricing_tiers;
CREATE POLICY "Usuários autenticados podem visualizar níveis ativos"
  ON pricing_tiers FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins podem gerenciar todos os níveis" ON pricing_tiers;
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

DROP POLICY IF EXISTS "Usuários autenticados podem visualizar atribuições" ON collection_tier_assignments;
CREATE POLICY "Usuários autenticados podem visualizar atribuições"
  ON collection_tier_assignments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins podem gerenciar atribuições" ON collection_tier_assignments;
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

DROP POLICY IF EXISTS "Admins podem visualizar histórico" ON pricing_history;
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

DROP POLICY IF EXISTS "Admins podem visualizar auditorias de migração" ON migration_audit;
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
-- PARTE 2: FUNÇÕES DE GERENCIAMENTO DE NÍVEIS
-- =====================================================

-- 2.1 FUNÇÃO: create_pricing_tier
CREATE OR REPLACE FUNCTION create_pricing_tier(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_price_full NUMERIC DEFAULT 500.00,
  p_deposit_amount NUMERIC DEFAULT 100.00,
  p_pix_discount_percentage NUMERIC DEFAULT 5.00,
  p_is_default BOOLEAN DEFAULT false,
  p_display_order INTEGER DEFAULT 0,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_tier_id UUID;
  v_price_pix NUMERIC;
BEGIN
  IF p_price_full <= 0 THEN
    RAISE EXCEPTION 'Preço cheio deve ser maior que zero';
  END IF;
  
  IF p_deposit_amount <= 0 THEN
    RAISE EXCEPTION 'Valor da entrada deve ser maior que zero';
  END IF;
  
  IF p_deposit_amount >= p_price_full THEN
    RAISE EXCEPTION 'Valor da entrada deve ser menor que o preço cheio';
  END IF;
  
  IF p_pix_discount_percentage < 0 OR p_pix_discount_percentage > 100 THEN
    RAISE EXCEPTION 'Desconto PIX deve estar entre 0 e 100';
  END IF;
  
  IF p_is_default THEN
    UPDATE pricing_tiers SET is_default = false WHERE is_default = true;
  END IF;
  
  v_price_pix := ROUND(p_price_full * (1 - p_pix_discount_percentage / 100), 2);
  
  INSERT INTO pricing_tiers (
    name, description, price_full, deposit_amount, 
    pix_discount_percentage, is_default, display_order, created_by
  )
  VALUES (
    p_name, p_description, p_price_full, p_deposit_amount,
    p_pix_discount_percentage, p_is_default, p_display_order, p_created_by
  )
  RETURNING id INTO v_tier_id;
  
  INSERT INTO pricing_history (
    tier_id, change_type, new_price_full, new_price_pix, 
    new_deposit_amount, changed_by, metadata
  )
  VALUES (
    v_tier_id, 'tier_created', p_price_full, v_price_pix,
    p_deposit_amount, p_created_by, 
    jsonb_build_object('tier_name', p_name)
  );
  
  RETURN v_tier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 FUNÇÃO: update_pricing_tier
CREATE OR REPLACE FUNCTION update_pricing_tier(
  p_tier_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_price_full NUMERIC DEFAULT NULL,
  p_deposit_amount NUMERIC DEFAULT NULL,
  p_pix_discount_percentage NUMERIC DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_is_default BOOLEAN DEFAULT NULL,
  p_display_order INTEGER DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_old_tier RECORD;
  v_price_changed BOOLEAN := false;
BEGIN
  SELECT * INTO v_old_tier FROM pricing_tiers WHERE id = p_tier_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nível de preço não encontrado';
  END IF;
  
  IF p_price_full IS NOT NULL AND p_price_full <= 0 THEN
    RAISE EXCEPTION 'Preço cheio deve ser maior que zero';
  END IF;
  
  IF p_deposit_amount IS NOT NULL AND p_deposit_amount <= 0 THEN
    RAISE EXCEPTION 'Valor da entrada deve ser maior que zero';
  END IF;
  
  IF p_is_default = true THEN
    UPDATE pricing_tiers SET is_default = false WHERE is_default = true AND id != p_tier_id;
  END IF;
  
  IF p_price_full IS NOT NULL AND p_price_full != v_old_tier.price_full THEN
    v_price_changed := true;
  END IF;
  
  IF p_deposit_amount IS NOT NULL AND p_deposit_amount != v_old_tier.deposit_amount THEN
    v_price_changed := true;
  END IF;
  
  IF p_pix_discount_percentage IS NOT NULL AND p_pix_discount_percentage != v_old_tier.pix_discount_percentage THEN
    v_price_changed := true;
  END IF;
  
  UPDATE pricing_tiers
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    price_full = COALESCE(p_price_full, price_full),
    deposit_amount = COALESCE(p_deposit_amount, deposit_amount),
    pix_discount_percentage = COALESCE(p_pix_discount_percentage, pix_discount_percentage),
    is_active = COALESCE(p_is_active, is_active),
    is_default = COALESCE(p_is_default, is_default),
    display_order = COALESCE(p_display_order, display_order),
    updated_at = NOW(),
    updated_by = p_updated_by
  WHERE id = p_tier_id;
  
  INSERT INTO pricing_history (
    tier_id, change_type, 
    old_price_full, new_price_full,
    old_price_pix, new_price_pix,
    old_deposit_amount, new_deposit_amount,
    changed_by, metadata
  )
  SELECT
    p_tier_id, 'tier_updated',
    v_old_tier.price_full, COALESCE(p_price_full, v_old_tier.price_full),
    v_old_tier.price_pix, (SELECT price_pix FROM pricing_tiers WHERE id = p_tier_id),
    v_old_tier.deposit_amount, COALESCE(p_deposit_amount, v_old_tier.deposit_amount),
    p_updated_by,
    jsonb_build_object(
      'tier_name', v_old_tier.name,
      'price_changed', v_price_changed
    );
  
  IF v_price_changed THEN
    PERFORM propagate_tier_prices(p_tier_id, p_updated_by);
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 FUNÇÃO: propagate_tier_prices
CREATE OR REPLACE FUNCTION propagate_tier_prices(
  p_tier_id UUID,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  collection_id UUID,
  old_price_full NUMERIC,
  new_price_full NUMERIC,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_tier RECORD;
  v_collection RECORD;
  v_updated_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  SELECT * INTO v_tier FROM pricing_tiers WHERE id = p_tier_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nível de preço não encontrado';
  END IF;
  
  FOR v_collection IN
    SELECT c.id, c.price_full, c.price_pix, c.deposit_amount
    FROM collections c
    INNER JOIN collection_tier_assignments cta ON c.id = cta.collection_id
    WHERE cta.tier_id = p_tier_id AND c.uses_tier_pricing = true
  LOOP
    BEGIN
      UPDATE collections
      SET
        price_full = v_tier.price_full,
        price_pix = v_tier.price_pix,
        deposit_amount = v_tier.deposit_amount,
        updated_at = NOW()
      WHERE id = v_collection.id;
      
      INSERT INTO pricing_history (
        collection_id, tier_id, change_type,
        old_price_full, new_price_full,
        old_price_pix, new_price_pix,
        old_deposit_amount, new_deposit_amount,
        changed_by, metadata
      )
      VALUES (
        v_collection.id, p_tier_id, 'price_propagated',
        v_collection.price_full, v_tier.price_full,
        v_collection.price_pix, v_tier.price_pix,
        v_collection.deposit_amount, v_tier.deposit_amount,
        p_updated_by,
        jsonb_build_object('tier_name', v_tier.name)
      );
      
      v_updated_count := v_updated_count + 1;
      
      RETURN QUERY SELECT 
        v_collection.id,
        v_collection.price_full,
        v_tier.price_full,
        true,
        NULL::TEXT;
      
    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      
      RETURN QUERY SELECT 
        v_collection.id,
        v_collection.price_full,
        v_tier.price_full,
        false,
        SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Propagação concluída: % atualizadas, % falharam', v_updated_count, v_failed_count;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 3: FUNÇÕES DE ATRIBUIÇÃO
-- =====================================================

-- 3.1 FUNÇÃO: assign_collection_to_tier
CREATE OR REPLACE FUNCTION assign_collection_to_tier(
  p_collection_id UUID,
  p_tier_id UUID,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_assignment_id UUID;
  v_previous_tier_id UUID;
  v_tier RECORD;
  v_collection RECORD;
BEGIN
  SELECT * INTO v_tier FROM pricing_tiers WHERE id = p_tier_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nível de preço não encontrado';
  END IF;
  
  IF NOT v_tier.is_active THEN
    RAISE EXCEPTION 'Não é possível atribuir coleções a um nível inativo';
  END IF;
  
  SELECT * INTO v_collection FROM collections WHERE id = p_collection_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coleção não encontrada';
  END IF;
  
  SELECT tier_id INTO v_previous_tier_id
  FROM collection_tier_assignments
  WHERE collection_id = p_collection_id;
  
  IF v_previous_tier_id IS NOT NULL THEN
    DELETE FROM collection_tier_assignments WHERE collection_id = p_collection_id;
    
    INSERT INTO pricing_history (
      collection_id, tier_id, change_type, changed_by,
      old_price_full, old_price_pix, old_deposit_amount,
      metadata
    )
    VALUES (
      p_collection_id, v_previous_tier_id, 'tier_unassigned', p_assigned_by,
      v_collection.price_full, v_collection.price_pix, v_collection.deposit_amount,
      jsonb_build_object('previous_tier_id', v_previous_tier_id)
    );
  END IF;
  
  INSERT INTO collection_tier_assignments (
    collection_id, tier_id, assigned_by, previous_tier_id
  )
  VALUES (
    p_collection_id, p_tier_id, p_assigned_by, v_previous_tier_id
  )
  RETURNING id INTO v_assignment_id;
  
  UPDATE collections
  SET
    uses_tier_pricing = true,
    is_price_custom = false,
    price_full = v_tier.price_full,
    price_pix = v_tier.price_pix,
    deposit_amount = v_tier.deposit_amount,
    updated_at = NOW()
  WHERE id = p_collection_id;
  
  INSERT INTO pricing_history (
    collection_id, tier_id, change_type, changed_by,
    old_price_full, new_price_full,
    old_price_pix, new_price_pix,
    old_deposit_amount, new_deposit_amount,
    metadata
  )
  VALUES (
    p_collection_id, p_tier_id, 'tier_assigned', p_assigned_by,
    v_collection.price_full, v_tier.price_full,
    v_collection.price_pix, v_tier.price_pix,
    v_collection.deposit_amount, v_tier.deposit_amount,
    jsonb_build_object(
      'tier_name', v_tier.name,
      'previous_tier_id', v_previous_tier_id
    )
  );
  
  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 FUNÇÃO: unassign_collection_from_tier
CREATE OR REPLACE FUNCTION unassign_collection_from_tier(
  p_collection_id UUID,
  p_unassigned_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_assignment RECORD;
  v_default_price_full NUMERIC;
  v_default_price_pix NUMERIC;
  v_default_deposit NUMERIC;
  v_collection RECORD;
BEGIN
  SELECT * INTO v_assignment
  FROM collection_tier_assignments
  WHERE collection_id = p_collection_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coleção não está atribuída a nenhum nível';
  END IF;
  
  SELECT * INTO v_collection FROM collections WHERE id = p_collection_id;
  
  SELECT value::NUMERIC INTO v_default_price_full 
  FROM system_settings WHERE key = 'default_price_full';
  
  SELECT value::NUMERIC INTO v_default_price_pix 
  FROM system_settings WHERE key = 'default_price_pix';
  
  SELECT value::NUMERIC INTO v_default_deposit 
  FROM system_settings WHERE key = 'default_deposit_amount';
  
  DELETE FROM collection_tier_assignments WHERE collection_id = p_collection_id;
  
  UPDATE collections
  SET
    uses_tier_pricing = false,
    is_price_custom = false,
    price_full = v_default_price_full,
    price_pix = v_default_price_pix,
    deposit_amount = v_default_deposit,
    updated_at = NOW()
  WHERE id = p_collection_id;
  
  INSERT INTO pricing_history (
    collection_id, tier_id, change_type, changed_by,
    old_price_full, new_price_full,
    old_price_pix, new_price_pix,
    old_deposit_amount, new_deposit_amount,
    metadata
  )
  VALUES (
    p_collection_id, v_assignment.tier_id, 'tier_unassigned', p_unassigned_by,
    v_collection.price_full, v_default_price_full,
    v_collection.price_pix, v_default_price_pix,
    v_collection.deposit_amount, v_default_deposit,
    jsonb_build_object('reverted_to_default', true)
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.3 FUNÇÃO: analyze_pricing_for_migration
CREATE OR REPLACE FUNCTION analyze_pricing_for_migration()
RETURNS TABLE (
  price_full NUMERIC,
  price_pix NUMERIC,
  deposit_amount NUMERIC,
  collection_count BIGINT,
  collection_ids UUID[],
  suggested_tier_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.price_full,
    c.price_pix,
    c.deposit_amount,
    COUNT(*)::BIGINT as collection_count,
    ARRAY_AGG(c.id) as collection_ids,
    'Nível ' || ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, c.price_full) as suggested_tier_name
  FROM collections c
  WHERE 
    c.is_active = true
    AND c.uses_tier_pricing = false
    AND c.is_price_custom = false
  GROUP BY c.price_full, c.price_pix, c.deposit_amount
  HAVING COUNT(*) > 0
  ORDER BY COUNT(*) DESC, c.price_full;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 4: VIEWS E TRIGGERS
-- =====================================================

-- 4.1 VIEW: pricing_tier_stats
CREATE OR REPLACE VIEW pricing_tier_stats AS
SELECT
  pt.id,
  pt.name,
  pt.description,
  pt.price_full,
  pt.price_pix,
  pt.deposit_amount,
  pt.pix_discount_percentage,
  pt.is_active,
  pt.is_default,
  pt.display_order,
  pt.created_at,
  pt.updated_at,
  COUNT(cta.collection_id) as assigned_collections_count,
  COALESCE(SUM(CASE WHEN c.is_active THEN 1 ELSE 0 END), 0) as active_collections_count
FROM pricing_tiers pt
LEFT JOIN collection_tier_assignments cta ON pt.id = cta.tier_id
LEFT JOIN collections c ON cta.collection_id = c.id
GROUP BY pt.id, pt.name, pt.description, pt.price_full, pt.price_pix, 
         pt.deposit_amount, pt.pix_discount_percentage, pt.is_active, 
         pt.is_default, pt.display_order, pt.created_at, pt.updated_at;

GRANT SELECT ON pricing_tier_stats TO authenticated, anon;

-- 4.2 VIEW: collections_with_tier_info
CREATE OR REPLACE VIEW collections_with_tier_info AS
SELECT
  c.id,
  c.name,
  c.slug,
  c.price_full,
  c.price_pix,
  c.deposit_amount,
  c.uses_tier_pricing,
  c.is_price_custom,
  c.is_active,
  cta.tier_id,
  pt.name as tier_name,
  pt.is_default as is_default_tier,
  cta.assigned_at as tier_assigned_at
FROM collections c
LEFT JOIN collection_tier_assignments cta ON c.id = cta.collection_id
LEFT JOIN pricing_tiers pt ON cta.tier_id = pt.id;

GRANT SELECT ON collections_with_tier_info TO authenticated, anon;

-- 4.3 VIEW: collection_effective_pricing
CREATE OR REPLACE VIEW collection_effective_pricing AS
SELECT
  c.id as collection_id,
  c.name as collection_name,
  c.slug,
  c.is_price_custom,
  cta.tier_id as pricing_tier_id,
  pt.name as tier_name,
  CASE
    WHEN c.is_price_custom THEN c.price_full
    WHEN c.uses_tier_pricing AND pt.id IS NOT NULL THEN pt.price_full
    ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_price_full')
  END as effective_price_full,
  CASE
    WHEN c.is_price_custom THEN c.price_pix
    WHEN c.uses_tier_pricing AND pt.id IS NOT NULL THEN pt.price_pix
    ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_price_pix')
  END as effective_price_pix,
  CASE
    WHEN c.is_price_custom THEN c.deposit_amount
    WHEN c.uses_tier_pricing AND pt.id IS NOT NULL THEN pt.deposit_amount
    ELSE (SELECT value::NUMERIC FROM system_settings WHERE key = 'default_deposit_amount')
  END as effective_deposit_amount,
  CASE
    WHEN c.is_price_custom THEN 'custom'
    WHEN c.uses_tier_pricing AND pt.id IS NOT NULL THEN 'tier'
    ELSE 'default'
  END as pricing_source
FROM collections c
LEFT JOIN collection_tier_assignments cta ON c.id = cta.collection_id
LEFT JOIN pricing_tiers pt ON cta.tier_id = pt.id;

GRANT SELECT ON collection_effective_pricing TO authenticated, anon;

-- 4.4 TRIGGER: Garantir apenas um nível padrão
CREATE OR REPLACE FUNCTION validate_single_default_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE pricing_tiers 
    SET is_default = false 
    WHERE is_default = true AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_single_default_tier ON pricing_tiers;
CREATE TRIGGER trigger_validate_single_default_tier
  BEFORE INSERT OR UPDATE ON pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION validate_single_default_tier();

-- 4.5 TRIGGER: Atribuir nível padrão a novas coleções
CREATE OR REPLACE FUNCTION apply_default_tier_to_new_collection()
RETURNS TRIGGER AS $$
DECLARE
  v_default_tier_id UUID;
  v_default_tier RECORD;
BEGIN
  SELECT id INTO v_default_tier_id
  FROM pricing_tiers
  WHERE is_default = true AND is_active = true
  LIMIT 1;
  
  IF v_default_tier_id IS NOT NULL THEN
    SELECT * INTO v_default_tier FROM pricing_tiers WHERE id = v_default_tier_id;
    
    INSERT INTO collection_tier_assignments (collection_id, tier_id)
    VALUES (NEW.id, v_default_tier_id);
    
    NEW.uses_tier_pricing := true;
    NEW.is_price_custom := false;
    NEW.price_full := v_default_tier.price_full;
    NEW.price_pix := v_default_tier.price_pix;
    NEW.deposit_amount := v_default_tier.deposit_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_apply_default_tier_to_new_collection ON collections;
CREATE TRIGGER trigger_apply_default_tier_to_new_collection
  BEFORE INSERT ON collections
  FOR EACH ROW
  EXECUTE FUNCTION apply_default_tier_to_new_collection();

-- 4.6 TRIGGER: Prevenir desativação de nível padrão
CREATE OR REPLACE FUNCTION prevent_default_tier_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default = true AND NEW.is_active = false THEN
    RAISE EXCEPTION 'Não é possível desativar o nível padrão. Defina outro nível como padrão primeiro.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_default_tier_deactivation ON pricing_tiers;
CREATE TRIGGER trigger_prevent_default_tier_deactivation
  BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION prevent_default_tier_deactivation();

-- 4.7 TRIGGER: Remover tier_id quando is_price_custom = true
CREATE OR REPLACE FUNCTION remove_tier_on_custom_pricing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_price_custom = true AND (OLD.is_price_custom IS NULL OR OLD.is_price_custom = false) THEN
    DELETE FROM collection_tier_assignments WHERE collection_id = NEW.id;
    NEW.uses_tier_pricing := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_remove_tier_on_custom_pricing ON collections;
CREATE TRIGGER trigger_remove_tier_on_custom_pricing
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION remove_tier_on_custom_pricing();

-- 4.8 TRIGGER: Atualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION update_pricing_tier_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pricing_tier_timestamp ON pricing_tiers;
CREATE TRIGGER trigger_update_pricing_tier_timestamp
  BEFORE UPDATE ON pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_tier_timestamp();

-- =====================================================
-- PARTE 5: ATUALIZAR FUNÇÃO get_collection_pricing
-- =====================================================

-- Remover função existente primeiro (necessário quando a assinatura muda)
DROP FUNCTION IF EXISTS get_collection_pricing(uuid);

CREATE OR REPLACE FUNCTION get_collection_pricing(p_collection_id UUID)
RETURNS TABLE (
  price_full NUMERIC,
  price_pix NUMERIC,
  deposit_amount NUMERIC,
  remaining_full NUMERIC,
  remaining_pix NUMERIC,
  is_custom BOOLEAN,
  tier_id UUID,
  tier_name TEXT,
  pricing_source TEXT
) AS $$
DECLARE
  v_collection RECORD;
  v_tier RECORD;
  v_default_price_full NUMERIC;
  v_default_price_pix NUMERIC;
  v_default_deposit NUMERIC;
BEGIN
  SELECT 
    c.price_full,
    c.price_pix,
    c.deposit_amount,
    c.is_price_custom,
    c.uses_tier_pricing
  INTO v_collection
  FROM collections c
  WHERE c.id = p_collection_id;
  
  IF NOT FOUND THEN
    SELECT value::NUMERIC INTO v_default_price_full FROM system_settings WHERE key = 'default_price_full';
    SELECT value::NUMERIC INTO v_default_price_pix FROM system_settings WHERE key = 'default_price_pix';
    SELECT value::NUMERIC INTO v_default_deposit FROM system_settings WHERE key = 'default_deposit_amount';
    
    RETURN QUERY SELECT 
      v_default_price_full,
      v_default_price_pix,
      v_default_deposit,
      v_default_price_full - v_default_deposit,
      v_default_price_pix - v_default_deposit,
      false,
      NULL::UUID,
      NULL::TEXT,
      'default'::TEXT;
    RETURN;
  END IF;
  
  IF v_collection.is_price_custom THEN
    RETURN QUERY SELECT 
      v_collection.price_full,
      v_collection.price_pix,
      v_collection.deposit_amount,
      v_collection.price_full - v_collection.deposit_amount,
      v_collection.price_pix - v_collection.deposit_amount,
      true,
      NULL::UUID,
      NULL::TEXT,
      'custom'::TEXT;
    RETURN;
  END IF;
  
  IF v_collection.uses_tier_pricing THEN
    SELECT 
      pt.id,
      pt.name,
      pt.price_full,
      pt.price_pix,
      pt.deposit_amount
    INTO v_tier
    FROM collection_tier_assignments cta
    JOIN pricing_tiers pt ON pt.id = cta.tier_id
    WHERE cta.collection_id = p_collection_id
    AND pt.is_active = true;
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        v_tier.price_full,
        v_tier.price_pix,
        v_tier.deposit_amount,
        v_tier.price_full - v_tier.deposit_amount,
        v_tier.price_pix - v_tier.deposit_amount,
        false,
        v_tier.id,
        v_tier.name,
        'tier'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  SELECT value::NUMERIC INTO v_default_price_full FROM system_settings WHERE key = 'default_price_full';
  SELECT value::NUMERIC INTO v_default_price_pix FROM system_settings WHERE key = 'default_price_pix';
  SELECT value::NUMERIC INTO v_default_deposit FROM system_settings WHERE key = 'default_deposit_amount';
  
  RETURN QUERY SELECT 
    v_default_price_full,
    v_default_price_pix,
    v_default_deposit,
    v_default_price_full - v_default_deposit,
    v_default_price_pix - v_default_deposit,
    false,
    NULL::UUID,
    NULL::TEXT,
    'default'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIM DA MIGRAÇÃO CONSOLIDADA
-- =====================================================

-- Verificar se tudo foi criado corretamente
DO $$
BEGIN
  RAISE NOTICE '✅ Migração consolidada aplicada com sucesso!';
  RAISE NOTICE 'Tabelas criadas: pricing_tiers, collection_tier_assignments, pricing_history, migration_audit';
  RAISE NOTICE 'Funções criadas: create_pricing_tier, update_pricing_tier, propagate_tier_prices, assign_collection_to_tier, unassign_collection_from_tier, analyze_pricing_for_migration, get_collection_pricing';
  RAISE NOTICE 'Views criadas: pricing_tier_stats, collections_with_tier_info, collection_effective_pricing';
  RAISE NOTICE 'Triggers criados: 5 triggers automáticos';
END $$;
