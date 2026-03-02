-- ============================================================================
-- MIGRATION CONSOLIDADA: Reestruturação do Sistema de Preços - Fase 1
-- Feature: pricing-system-restructure
-- Data: 2026-03-01
-- ============================================================================
-- 
-- Esta migration implementa a hierarquia correta:
-- Níveis de Preço → Modalidades de Compra (Planos) → Coleções
--
-- IMPORTANTE: Execute esta migration no Supabase Dashboard SQL Editor
-- ============================================================================

-- ============================================================================
-- PARTE 1: Criar tabela purchase_modes
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_key TEXT NOT NULL UNIQUE CHECK (mode_key IN ('standalone', 'trimestral', 'semestral', 'anual')),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuração de preço
  price_multiplier NUMERIC(5,3) NOT NULL DEFAULT 1.000 CHECK (price_multiplier > 0 AND price_multiplier <= 2.0),
  
  -- Configuração de assinatura
  collections_count INTEGER NOT NULL DEFAULT 1 CHECK (collections_count > 0),
  deliveries_total INTEGER NOT NULL DEFAULT 1 CHECK (deliveries_total > 0),
  includes_bonus BOOLEAN NOT NULL DEFAULT false,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_modes_active ON purchase_modes(is_active) WHERE is_active = true;
CREATE INDEX idx_purchase_modes_display_order ON purchase_modes(display_order);

COMMENT ON TABLE purchase_modes IS 'Configuração global de modalidades de compra e seus multiplicadores';
COMMENT ON COLUMN purchase_modes.price_multiplier IS 'Multiplicador aplicado ao preço base do nível (ex: 0.93 para 7% de desconto)';

-- Inserir configurações padrão
INSERT INTO purchase_modes (mode_key, name, description, price_multiplier, collections_count, deliveries_total, includes_bonus, display_order) VALUES
  ('standalone', 'Avulso', 'Compra avulsa de uma coleção', 1.000, 1, 1, false, 1),
  ('trimestral', 'Trimestral', 'Plano de 3 meses com 3 coleções', 0.930, 3, 3, false, 2),
  ('semestral', 'Semestral', 'Plano de 6 meses com bônus', 0.860, 6, 6, true, 3),
  ('anual', 'Anual', 'Plano anual com 12 coleções', 0.790, 12, 12, true, 4)
ON CONFLICT (mode_key) DO NOTHING;

ALTER TABLE purchase_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar modalidades ativas"
  ON purchase_modes FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Usuários anônimos podem visualizar modalidades ativas"
  ON purchase_modes FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Admins podem gerenciar modalidades"
  ON purchase_modes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- PARTE 2: Adicionar colunas de hierarquia em subscription_plans
-- ============================================================================

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES pricing_tiers(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS plan_mode TEXT DEFAULT 'standalone' 
  CHECK (plan_mode IN ('standalone', 'trimestral', 'semestral', 'anual')),
ADD COLUMN IF NOT EXISTS price_multiplier NUMERIC(5,3) DEFAULT 1.000 
  CHECK (price_multiplier > 0 AND price_multiplier <= 2.0);

UPDATE subscription_plans
SET plan_mode = CASE
  WHEN plan_type = 'standalone' THEN 'standalone'
  WHEN plan_type = 'trimestral' OR plan_type = 'quarterly' THEN 'trimestral'
  WHEN plan_type = 'semestral' OR plan_type = 'semiannual' THEN 'semestral'
  WHEN plan_type = 'anual' OR plan_type = 'annual' THEN 'anual'
  ELSE 'standalone'
END
WHERE plan_mode IS NULL;

ALTER TABLE subscription_plans ALTER COLUMN plan_mode SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plans_tier_mode 
ON subscription_plans(tier_id, plan_mode) 
WHERE tier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier_id ON subscription_plans(tier_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_mode ON subscription_plans(plan_mode);

COMMENT ON COLUMN subscription_plans.tier_id IS 'Nível de preço ao qual este plano pertence (NULL para planos legados)';
COMMENT ON COLUMN subscription_plans.plan_mode IS 'Modalidade de compra: standalone (avulso), trimestral, semestral, anual';
COMMENT ON COLUMN subscription_plans.price_multiplier IS 'Multiplicador aplicado ao preço base do nível para calcular preço deste plano';

-- ============================================================================
-- PARTE 3: Criar tabela purchase_mode_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_mode_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_key TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  metadata JSONB
);

CREATE INDEX idx_purchase_mode_history_mode ON purchase_mode_history(mode_key, changed_at DESC);
CREATE INDEX idx_purchase_mode_history_changed_at ON purchase_mode_history(changed_at DESC);
CREATE INDEX idx_purchase_mode_history_changed_by ON purchase_mode_history(changed_by);

COMMENT ON TABLE purchase_mode_history IS 'Histórico de mudanças em configurações de modalidades de compra';

ALTER TABLE purchase_mode_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem visualizar histórico de modalidades"
  ON purchase_mode_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Sistema pode inserir registros de auditoria"
  ON purchase_mode_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- PARTE 4: Criar view pricing_tiers_with_plans
-- ============================================================================

CREATE OR REPLACE VIEW pricing_tiers_with_plans AS
SELECT
  pt.id as tier_id,
  pt.name as tier_name,
  pt.description as tier_description,
  pt.price_full as tier_price_base,
  pt.price_pix as tier_price_pix_base,
  pt.deposit_amount as tier_deposit,
  pt.is_active as tier_is_active,
  pt.is_default as tier_is_default,
  pt.display_order as tier_display_order,
  pt.created_at as tier_created_at,
  pt.updated_at as tier_updated_at,
  
  sp.id as plan_id,
  sp.plan_mode,
  sp.name as plan_name,
  sp.description as plan_description,
  sp.price_full as plan_price_full,
  sp.price_pix as plan_price_pix,
  sp.price_multiplier,
  sp.collections_count,
  sp.deliveries_total,
  sp.is_active as plan_is_active,
  sp.display_order as plan_display_order,
  
  pm.name as mode_name,
  pm.description as mode_description,
  pm.includes_bonus,
  
  (SELECT COUNT(*) FROM collection_tier_assignments WHERE tier_id = pt.id) as assigned_collections_count,
  (SELECT COUNT(*) FROM subscriptions WHERE plan_id = sp.id AND status = 'active') as active_subscriptions_count
  
FROM pricing_tiers pt
LEFT JOIN subscription_plans sp ON sp.tier_id = pt.id
LEFT JOIN purchase_modes pm ON pm.mode_key = sp.plan_mode
ORDER BY pt.display_order, pm.display_order;

COMMENT ON VIEW pricing_tiers_with_plans IS 'View consolidada mostrando níveis de preço com todos os seus planos e estatísticas';

GRANT SELECT ON pricing_tiers_with_plans TO authenticated, anon;

-- ============================================================================
-- PARTE 5: Função create_tier_with_plans
-- ============================================================================

CREATE OR REPLACE FUNCTION create_tier_with_plans(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_price_full NUMERIC DEFAULT 700.00,
  p_deposit_amount NUMERIC DEFAULT 100.00,
  p_pix_discount_percentage NUMERIC DEFAULT 5.00,
  p_is_default BOOLEAN DEFAULT false,
  p_display_order INTEGER DEFAULT 0,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  tier_id UUID,
  plans_created INTEGER
) AS $$
DECLARE
  v_tier_id UUID;
  v_price_pix NUMERIC;
  v_mode RECORD;
  v_plan_price_full NUMERIC;
  v_plan_price_pix NUMERIC;
  v_plans_created INTEGER := 0;
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
  
  v_price_pix := ROUND(p_price_full * (1 - p_pix_discount_percentage / 100), 2);
  
  BEGIN
    v_tier_id := create_pricing_tier(
      p_name, p_description, p_price_full, p_deposit_amount,
      p_pix_discount_percentage, p_is_default, p_display_order, p_created_by
    );
  EXCEPTION
    WHEN undefined_function THEN
      INSERT INTO pricing_tiers (
        name, description, price_full, price_pix, deposit_amount,
        pix_discount_percentage, is_default, display_order, created_at, updated_at
      ) VALUES (
        p_name, p_description, p_price_full, v_price_pix, p_deposit_amount,
        p_pix_discount_percentage, p_is_default, p_display_order, NOW(), NOW()
      ) RETURNING id INTO v_tier_id;
  END;
  
  FOR v_mode IN
    SELECT * FROM purchase_modes WHERE is_active = true ORDER BY display_order
  LOOP
    v_plan_price_full := ROUND(p_price_full * v_mode.price_multiplier, 2);
    v_plan_price_pix := ROUND(v_plan_price_full * (1 - p_pix_discount_percentage / 100), 2);
    
    INSERT INTO subscription_plans (
      tier_id, plan_mode, plan_type, name, description,
      price_full, price_pix, price_multiplier,
      collections_count, deliveries_total, includes_bonus,
      is_active, display_order, created_at, updated_at
    ) VALUES (
      v_tier_id, v_mode.mode_key, v_mode.mode_key,
      p_name || ' - ' || v_mode.name, v_mode.description,
      v_plan_price_full, v_plan_price_pix, v_mode.price_multiplier,
      v_mode.collections_count, v_mode.deliveries_total, v_mode.includes_bonus,
      true, v_mode.display_order, NOW(), NOW()
    );
    
    v_plans_created := v_plans_created + 1;
    
    BEGIN
      INSERT INTO pricing_history (
        tier_id, change_type, new_price_full, new_price_pix,
        changed_by, metadata, changed_at
      ) VALUES (
        v_tier_id, 'tier_created', v_plan_price_full, v_plan_price_pix,
        p_created_by,
        jsonb_build_object(
          'tier_name', p_name,
          'plan_mode', v_mode.mode_key,
          'multiplier', v_mode.price_multiplier
        ),
        NOW()
      );
    EXCEPTION
      WHEN undefined_table THEN NULL;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_tier_id, v_plans_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_tier_with_plans IS 'Cria nível de preço e automaticamente cria planos para todas as modalidades ativas';

-- ============================================================================
-- PARTE 6: Função update_tier_and_recalculate_plans
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tier_and_recalculate_plans(
  p_tier_id UUID,
  p_price_full NUMERIC DEFAULT NULL,
  p_deposit_amount NUMERIC DEFAULT NULL,
  p_pix_discount_percentage NUMERIC DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  plans_updated INTEGER,
  collections_updated INTEGER
) AS $$
DECLARE
  v_old_tier RECORD;
  v_new_price_full NUMERIC;
  v_new_pix_discount NUMERIC;
  v_plan RECORD;
  v_new_plan_price_full NUMERIC;
  v_new_plan_price_pix NUMERIC;
  v_plans_updated INTEGER := 0;
  v_collections_updated INTEGER := 0;
BEGIN
  SELECT * INTO v_old_tier FROM pricing_tiers WHERE id = p_tier_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nível de preço não encontrado';
  END IF;
  
  v_new_price_full := COALESCE(p_price_full, v_old_tier.price_full);
  v_new_pix_discount := COALESCE(p_pix_discount_percentage, v_old_tier.pix_discount_percentage);
  
  BEGIN
    PERFORM update_pricing_tier(
      p_tier_id, NULL, NULL, p_price_full, p_deposit_amount,
      p_pix_discount_percentage, NULL, NULL, NULL, p_updated_by
    );
  EXCEPTION
    WHEN undefined_function THEN
      UPDATE pricing_tiers
      SET
        price_full = COALESCE(p_price_full, price_full),
        price_pix = ROUND(COALESCE(p_price_full, price_full) * (1 - v_new_pix_discount / 100), 2),
        deposit_amount = COALESCE(p_deposit_amount, deposit_amount),
        pix_discount_percentage = v_new_pix_discount,
        updated_at = NOW()
      WHERE id = p_tier_id;
  END;
  
  FOR v_plan IN
    SELECT * FROM subscription_plans WHERE tier_id = p_tier_id
  LOOP
    v_new_plan_price_full := ROUND(v_new_price_full * v_plan.price_multiplier, 2);
    v_new_plan_price_pix := ROUND(v_new_plan_price_full * (1 - v_new_pix_discount / 100), 2);
    
    UPDATE subscription_plans
    SET price_full = v_new_plan_price_full, price_pix = v_new_plan_price_pix, updated_at = NOW()
    WHERE id = v_plan.id;
    
    v_plans_updated := v_plans_updated + 1;
    
    BEGIN
      INSERT INTO pricing_history (
        tier_id, change_type, old_price_full, new_price_full,
        old_price_pix, new_price_pix, changed_by, metadata, changed_at
      ) VALUES (
        p_tier_id, 'price_propagated', v_plan.price_full, v_new_plan_price_full,
        v_plan.price_pix, v_new_plan_price_pix, p_updated_by,
        jsonb_build_object('plan_id', v_plan.id, 'plan_mode', v_plan.plan_mode,
          'multiplier', v_plan.price_multiplier, 'reason', 'tier_price_updated'),
        NOW()
      );
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END LOOP;
  
  BEGIN
    SELECT COUNT(*) INTO v_collections_updated FROM propagate_tier_prices(p_tier_id, p_updated_by);
  EXCEPTION
    WHEN undefined_function THEN
      UPDATE collections c
      SET price_full = v_new_price_full,
          price_pix = ROUND(v_new_price_full * (1 - v_new_pix_discount / 100), 2),
          updated_at = NOW()
      FROM collection_tier_assignments cta
      WHERE cta.collection_id = c.id AND cta.tier_id = p_tier_id AND c.uses_tier_pricing = true;
      GET DIAGNOSTICS v_collections_updated = ROW_COUNT;
  END;
  
  RETURN QUERY SELECT v_plans_updated, v_collections_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_tier_and_recalculate_plans IS 'Atualiza nível e recalcula automaticamente preços de todos os planos e coleções';

-- ============================================================================
-- PARTE 7: Função update_purchase_mode_multiplier
-- ============================================================================

CREATE OR REPLACE FUNCTION update_purchase_mode_multiplier(
  p_mode_key TEXT,
  p_new_multiplier NUMERIC,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  plans_updated INTEGER,
  tiers_affected INTEGER
) AS $$
DECLARE
  v_old_multiplier NUMERIC;
  v_plan RECORD;
  v_new_price_full NUMERIC;
  v_new_price_pix NUMERIC;
  v_plans_updated INTEGER := 0;
  v_tiers_affected INTEGER := 0;
BEGIN
  IF p_new_multiplier <= 0 OR p_new_multiplier > 2.0 THEN
    RAISE EXCEPTION 'Multiplicador deve estar entre 0.1 e 2.0';
  END IF;
  
  SELECT price_multiplier INTO v_old_multiplier FROM purchase_modes WHERE mode_key = p_mode_key;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modalidade não encontrada';
  END IF;
  
  UPDATE purchase_modes SET price_multiplier = p_new_multiplier, updated_at = NOW()
  WHERE mode_key = p_mode_key;
  
  INSERT INTO purchase_mode_history (mode_key, field_name, old_value, new_value, changed_by, changed_at)
  VALUES (p_mode_key, 'price_multiplier', v_old_multiplier::TEXT, p_new_multiplier::TEXT, p_updated_by, NOW());
  
  FOR v_plan IN
    SELECT sp.*, pt.price_full as tier_price_full, pt.pix_discount_percentage
    FROM subscription_plans sp
    JOIN pricing_tiers pt ON pt.id = sp.tier_id
    WHERE sp.plan_mode = p_mode_key
  LOOP
    v_new_price_full := ROUND(v_plan.tier_price_full * p_new_multiplier, 2);
    v_new_price_pix := ROUND(v_new_price_full * (1 - v_plan.pix_discount_percentage / 100), 2);
    
    UPDATE subscription_plans
    SET price_full = v_new_price_full, price_pix = v_new_price_pix,
        price_multiplier = p_new_multiplier, updated_at = NOW()
    WHERE id = v_plan.id;
    
    v_plans_updated := v_plans_updated + 1;
    
    BEGIN
      INSERT INTO pricing_history (
        tier_id, change_type, old_price_full, new_price_full,
        old_price_pix, new_price_pix, changed_by, metadata, changed_at
      ) VALUES (
        v_plan.tier_id, 'price_propagated', v_plan.price_full, v_new_price_full,
        v_plan.price_pix, v_new_price_pix, p_updated_by,
        jsonb_build_object('plan_id', v_plan.id, 'plan_mode', p_mode_key,
          'old_multiplier', v_old_multiplier, 'new_multiplier', p_new_multiplier,
          'reason', 'mode_multiplier_updated'),
        NOW()
      );
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END LOOP;
  
  SELECT COUNT(DISTINCT tier_id) INTO v_tiers_affected
  FROM subscription_plans WHERE plan_mode = p_mode_key;
  
  RETURN QUERY SELECT v_plans_updated, v_tiers_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_purchase_mode_multiplier IS 'Atualiza multiplicador de modalidade e recalcula todos os planos dessa modalidade';

-- ============================================================================
-- PARTE 8: Triggers para auditoria automática
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_purchase_modes_updated_at ON purchase_modes;
CREATE TRIGGER update_purchase_modes_updated_at
  BEFORE UPDATE ON purchase_modes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION audit_purchase_mode_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price_multiplier IS DISTINCT FROM NEW.price_multiplier THEN
    INSERT INTO purchase_mode_history (mode_key, field_name, old_value, new_value, changed_by, changed_at)
    VALUES (NEW.mode_key, 'price_multiplier', OLD.price_multiplier::TEXT, NEW.price_multiplier::TEXT, auth.uid(), NOW());
  END IF;
  
  IF OLD.collections_count IS DISTINCT FROM NEW.collections_count THEN
    INSERT INTO purchase_mode_history (mode_key, field_name, old_value, new_value, changed_by, changed_at)
    VALUES (NEW.mode_key, 'collections_count', OLD.collections_count::TEXT, NEW.collections_count::TEXT, auth.uid(), NOW());
  END IF;
  
  IF OLD.deliveries_total IS DISTINCT FROM NEW.deliveries_total THEN
    INSERT INTO purchase_mode_history (mode_key, field_name, old_value, new_value, changed_by, changed_at)
    VALUES (NEW.mode_key, 'deliveries_total', OLD.deliveries_total::TEXT, NEW.deliveries_total::TEXT, auth.uid(), NOW());
  END IF;
  
  IF OLD.includes_bonus IS DISTINCT FROM NEW.includes_bonus THEN
    INSERT INTO purchase_mode_history (mode_key, field_name, old_value, new_value, changed_by, changed_at)
    VALUES (NEW.mode_key, 'includes_bonus', OLD.includes_bonus::TEXT, NEW.includes_bonus::TEXT, auth.uid(), NOW());
  END IF;
  
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    INSERT INTO purchase_mode_history (mode_key, field_name, old_value, new_value, changed_by, changed_at)
    VALUES (NEW.mode_key, 'is_active', OLD.is_active::TEXT, NEW.is_active::TEXT, auth.uid(), NOW());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_purchase_mode_changes_trigger ON purchase_modes;
CREATE TRIGGER audit_purchase_mode_changes_trigger
  AFTER UPDATE ON purchase_modes
  FOR EACH ROW
  EXECUTE FUNCTION audit_purchase_mode_changes();

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
