-- ============================================================================
-- Migration: Create user_characters for Coin Purchases
-- Description: Cria tabela para rastrear personagens adquiridos por usuários
-- Spec: contextual-pricing-system (RN006)
-- Author: System
-- Date: 2026-05-12
-- ============================================================================

-- ============================================================================
-- TABELA: user_characters
-- Descrição: Personagens adquiridos por usuários (compras com coins)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES collection_characters(id) ON DELETE CASCADE,
  acquisition_type TEXT NOT NULL CHECK (acquisition_type IN (
    'coin_purchase',        -- Compra com coins
    'subscription',         -- Incluído na assinatura
    'gift',                 -- Presente/bônus
    'admin_grant',          -- Concedido pelo admin
    'promotion'             -- Promoção especial
  )),
  price_paid INTEGER CHECK (price_paid >= 0),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: usuário não pode ter o mesmo personagem duplicado
  UNIQUE (user_id, character_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_characters_user ON user_characters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_characters_character ON user_characters(character_id);
CREATE INDEX IF NOT EXISTS idx_user_characters_acquisition_type ON user_characters(acquisition_type);
CREATE INDEX IF NOT EXISTS idx_user_characters_acquired_at ON user_characters(acquired_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_characters_user_acquired ON user_characters(user_id, acquired_at DESC);

-- Comentários explicativos
COMMENT ON TABLE user_characters IS 
  'Personagens adquiridos por usuários através de compras com coins ou outros meios';

COMMENT ON COLUMN user_characters.acquisition_type IS 
  'Tipo de aquisição: coin_purchase, subscription, gift, admin_grant, promotion';

COMMENT ON COLUMN user_characters.price_paid IS 
  'Preço pago em coins no momento da compra (NULL se não foi compra)';

COMMENT ON COLUMN user_characters.acquired_at IS 
  'Data/hora em que o personagem foi adquirido';

-- ============================================================================
-- RLS POLICIES: user_characters
-- ============================================================================

ALTER TABLE user_characters ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios personagens
CREATE POLICY "Users can view own characters"
  ON user_characters FOR SELECT
  USING (auth.uid() = user_id);

-- Admins podem ver todos os personagens
CREATE POLICY "Admins can view all characters"
  ON user_characters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Apenas sistema pode inserir (via funções)
CREATE POLICY "Only system can insert characters"
  ON user_characters FOR INSERT
  WITH CHECK (false);

-- Admins podem deletar (para correções)
CREATE POLICY "Admins can delete characters"
  ON user_characters FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- Migração de dados existentes (se houver)
-- ============================================================================

-- Nota: Tabela já foi criada acima com todos os campos necessários

-- ============================================================================
-- SUCESSO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ user_characters table created successfully';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '✅ Ready for coin purchases!';
END $$;
