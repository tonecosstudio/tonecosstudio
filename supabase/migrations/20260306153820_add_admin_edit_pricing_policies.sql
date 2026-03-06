-- ============================================================================
-- Migration: Add Admin Edit Pricing Policies
-- Description: Permite admins editarem preços e multiplicadores via interface
-- Date: 2026-03-06 15:38:20
-- ============================================================================

-- ============================================================================
-- PASSO 1: Verificar e criar policies para collection_base_pricing
-- ============================================================================

-- Remover policy antiga se existir
DROP POLICY IF EXISTS "Admins can manage base pricing" ON collection_base_pricing;

-- Criar policy para admins editarem
CREATE POLICY "Admins can update base pricing"
  ON collection_base_pricing FOR UPDATE
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

-- Policy para leitura (já existe, mas garantir)
DROP POLICY IF EXISTS "Anyone can view active base pricing" ON collection_base_pricing;

CREATE POLICY "Anyone can view active base pricing"
  ON collection_base_pricing FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- PASSO 2: Verificar e criar policies para pricing_context_multipliers
-- ============================================================================

-- Remover policy antiga se existir
DROP POLICY IF EXISTS "Admins can manage multipliers" ON pricing_context_multipliers;

-- Criar policy para admins editarem
CREATE POLICY "Admins can update multipliers"
  ON pricing_context_multipliers FOR UPDATE
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

-- Policy para leitura (já existe, mas garantir)
DROP POLICY IF EXISTS "Anyone can view active multipliers" ON pricing_context_multipliers;

CREATE POLICY "Anyone can view active multipliers"
  ON pricing_context_multipliers FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- PASSO 3: Adicionar índices para performance
-- ============================================================================

-- Índice para buscar por collection_type_id (já existe, mas garantir)
CREATE INDEX IF NOT EXISTS idx_base_pricing_type 
  ON collection_base_pricing(collection_type_id);

-- Índice para buscar por is_active
CREATE INDEX IF NOT EXISTS idx_base_pricing_active 
  ON collection_base_pricing(is_active);

-- Índice para buscar por user_context
CREATE INDEX IF NOT EXISTS idx_multipliers_context 
  ON pricing_context_multipliers(user_context);

-- Índice para buscar por is_active
CREATE INDEX IF NOT EXISTS idx_multipliers_active 
  ON pricing_context_multipliers(is_active);

-- ============================================================================
-- PASSO 4: Adicionar comentários
-- ============================================================================

COMMENT ON POLICY "Admins can update base pricing" ON collection_base_pricing IS
  'Permite admins editarem preços base via interface /admin/coins';

COMMENT ON POLICY "Admins can update multipliers" ON pricing_context_multipliers IS
  'Permite admins editarem multiplicadores via interface /admin/coins';

-- ============================================================================
-- PASSO 5: Validação
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLICIES DE EDIÇÃO CRIADAS COM SUCESSO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Admins agora podem editar:';
  RAISE NOTICE '- collection_base_pricing (preços base)';
  RAISE NOTICE '- pricing_context_multipliers (multiplicadores)';
  RAISE NOTICE '';
  RAISE NOTICE 'Interface: /admin/coins → Aba "Configuração"';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
