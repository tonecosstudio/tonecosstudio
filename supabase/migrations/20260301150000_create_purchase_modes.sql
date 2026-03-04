-- Migration: Criar tabela purchase_modes
-- Feature: pricing-system-restructure
-- Requisitos: 3.1, 3.2
-- DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: Cria tabela de configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o global de modalidades de compra

-- Criar tabela purchase_modes
CREATE TABLE IF NOT EXISTS purchase_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_key TEXT NOT NULL UNIQUE CHECK (mode_key IN ('standalone', 'trimestral', 'semestral', 'anual')),
  name TEXT NOT NULL,
  description TEXT,
  
  -- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de preÃƒÆ’Ã‚Â§o
  price_multiplier NUMERIC(5,3) NOT NULL DEFAULT 1.000 CHECK (price_multiplier > 0 AND price_multiplier <= 2.0),
  
  -- ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de assinatura
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

-- Criar ÃƒÆ’Ã‚Â­ndices
CREATE INDEX IF NOT EXISTS idx_purchase_modes_active ON purchase_modes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_purchase_modes_display_order ON purchase_modes(display_order);

-- Adicionar comentÃƒÆ’Ã‚Â¡rios
COMMENT ON TABLE purchase_modes IS 'ConfiguraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o global de modalidades de compra e seus multiplicadores';
COMMENT ON COLUMN purchase_modes.mode_key IS 'Chave ÃƒÆ’Ã‚Âºnica da modalidade: standalone, trimestral, semestral, anual';
COMMENT ON COLUMN purchase_modes.price_multiplier IS 'Multiplicador aplicado ao preÃƒÆ’Ã‚Â§o base do nÃƒÆ’Ã‚Â­vel (ex: 0.93 para 7% de desconto)';
COMMENT ON COLUMN purchase_modes.collections_count IS 'NÃƒÆ’Ã‚Âºmero de coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes incluÃƒÆ’Ã‚Â­das nesta modalidade';
COMMENT ON COLUMN purchase_modes.deliveries_total IS 'NÃƒÆ’Ã‚Âºmero total de entregas (ex: 3 para trimestral, 6 para semestral)';
COMMENT ON COLUMN purchase_modes.includes_bonus IS 'Se esta modalidade inclui bÃƒÆ’Ã‚Â´nus (ex: coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o extra)';

-- Inserir configuraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes padrÃƒÆ’Ã‚Â£o
INSERT INTO purchase_modes (mode_key, name, description, price_multiplier, collections_count, deliveries_total, includes_bonus, display_order) VALUES
  ('standalone', 'Avulso', 'Compra avulsa de uma coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o', 1.000, 1, 1, false, 1),
  ('trimestral', 'Trimestral', 'Plano de 3 meses com 3 coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes', 0.930, 3, 3, false, 2),
  ('semestral', 'Semestral', 'Plano de 6 meses com bÃƒÆ’Ã‚Â´nus', 0.860, 6, 6, true, 3),
  ('anual', 'Anual', 'Plano anual com 12 coleÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes', 0.790, 12, 12, true, 4);

-- Habilitar RLS
ALTER TABLE purchase_modes ENABLE ROW LEVEL SECURITY;

-- PolÃƒÆ’Ã‚Â­ticas RLS: UsuÃƒÆ’Ã‚Â¡rios autenticados podem visualizar modalidades ativas
CREATE POLICY "UsuÃƒÆ’Ã‚Â¡rios autenticados podem visualizar modalidades ativas"
  ON purchase_modes FOR SELECT
  TO authenticated
  USING (is_active = true);

-- PolÃƒÆ’Ã‚Â­ticas RLS: UsuÃƒÆ’Ã‚Â¡rios anÃƒÆ’Ã‚Â´nimos podem visualizar modalidades ativas
CREATE POLICY "UsuÃƒÆ’Ã‚Â¡rios anÃƒÆ’Ã‚Â´nimos podem visualizar modalidades ativas"
  ON purchase_modes FOR SELECT
  TO anon
  USING (is_active = true);

-- PolÃƒÆ’Ã‚Â­ticas RLS: Admins podem gerenciar modalidades
CREATE POLICY "Admins podem gerenciar modalidades"
  ON purchase_modes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
