-- ============================================================================
-- RLS POLICIES: Contextual Pricing System
-- Descrição: Políticas de segurança para tabelas do sistema de preços contextuais
-- Spec: contextual-pricing-system
-- Task: 4.1, 4.2, 4.3
-- ============================================================================

-- ============================================================================
-- 4.1 Policies para collection_base_pricing
-- ============================================================================

-- Enable RLS
ALTER TABLE collection_base_pricing ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver preços base ativos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collection_base_pricing' 
    AND policyname = 'Anyone can view active base prices'
  ) THEN
    CREATE POLICY "Anyone can view active base prices"
      ON collection_base_pricing
      FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- Policy: Admins podem gerenciar todos os preços base
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collection_base_pricing' 
    AND policyname = 'Admins can manage all base prices'
  ) THEN
    CREATE POLICY "Admins can manage all base prices"
      ON collection_base_pricing
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'admin'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 4.2 Policies para pricing_context_multipliers
-- ============================================================================

-- Enable RLS
ALTER TABLE pricing_context_multipliers ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver multiplicadores ativos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pricing_context_multipliers' 
    AND policyname = 'Anyone can view active multipliers'
  ) THEN
    CREATE POLICY "Anyone can view active multipliers"
      ON pricing_context_multipliers
      FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- Policy: Admins podem gerenciar todos os multiplicadores
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pricing_context_multipliers' 
    AND policyname = 'Admins can manage all multipliers'
  ) THEN
    CREATE POLICY "Admins can manage all multipliers"
      ON pricing_context_multipliers
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'admin'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 4.3 Policies para contextual_pricing_history
-- ============================================================================

-- Enable RLS
ALTER TABLE contextual_pricing_history ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas admins podem ver histórico
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contextual_pricing_history' 
    AND policyname = 'Admins can view pricing history'
  ) THEN
    CREATE POLICY "Admins can view pricing history"
      ON contextual_pricing_history
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'admin'
        )
      );
  END IF;
END $$;

-- Policy: Bloquear UPDATE (histórico é imutável)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contextual_pricing_history' 
    AND policyname = 'Block all updates to history'
  ) THEN
    CREATE POLICY "Block all updates to history"
      ON contextual_pricing_history
      FOR UPDATE
      USING (false);
  END IF;
END $$;

-- Policy: Bloquear DELETE (histórico é imutável)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contextual_pricing_history' 
    AND policyname = 'Block all deletes from history'
  ) THEN
    CREATE POLICY "Block all deletes from history"
      ON contextual_pricing_history
      FOR DELETE
      USING (false);
  END IF;
END $$;

-- ============================================================================
-- 4.1, 4.2, 4.3 Policies para collection_types
-- ============================================================================

-- Enable RLS
ALTER TABLE collection_types ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver tipos ativos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collection_types' 
    AND policyname = 'Anyone can view active collection types'
  ) THEN
    CREATE POLICY "Anyone can view active collection types"
      ON collection_types
      FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- Policy: Admins podem gerenciar todos os tipos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collection_types' 
    AND policyname = 'Admins can manage all collection types'
  ) THEN
    CREATE POLICY "Admins can manage all collection types"
      ON collection_types
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role = 'admin'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- Comentários
-- ============================================================================

COMMENT ON POLICY "Anyone can view active base prices" ON collection_base_pricing IS 
  'Permite que todos vejam preços base ativos (necessário para cálculo de preços)';

COMMENT ON POLICY "Admins can manage all base prices" ON collection_base_pricing IS 
  'Permite que admins gerenciem todos os preços base (CRUD completo)';

COMMENT ON POLICY "Anyone can view active multipliers" ON pricing_context_multipliers IS 
  'Permite que todos vejam multiplicadores ativos (necessário para cálculo de preços)';

COMMENT ON POLICY "Admins can manage all multipliers" ON pricing_context_multipliers IS 
  'Permite que admins gerenciem todos os multiplicadores (CRUD completo)';

COMMENT ON POLICY "Admins can view pricing history" ON contextual_pricing_history IS 
  'Apenas admins podem visualizar histórico de mudanças de preços (auditoria)';

COMMENT ON POLICY "Block all updates to history" ON contextual_pricing_history IS 
  'Histórico é imutável - nenhum UPDATE permitido';

COMMENT ON POLICY "Block all deletes from history" ON contextual_pricing_history IS 
  'Histórico é imutável - nenhum DELETE permitido';

-- Validação
SELECT 'RLS Policies created successfully for contextual pricing system' as status;
