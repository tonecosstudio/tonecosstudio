-- Migration: Criar tabela purchase_modes
-- Feature: pricing-system-restructure
-- Requisitos: 3.1, 3.2
-- Descrição: Cria tabela de configuração global de modalidades de compra

-- Criar tabela purchase_modes
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

-- Criar índices
CREATE INDEX idx_purchase_modes_active ON purchase_modes(is_active) WHERE is_active = true;
CREATE INDEX idx_purchase_modes_display_order ON purchase_modes(display_order);

-- Adicionar comentários
COMMENT ON TABLE purchase_modes IS 'Configuração global de modalidades de compra e seus multiplicadores';
COMMENT ON COLUMN purchase_modes.mode_key IS 'Chave única da modalidade: standalone, trimestral, semestral, anual';
COMMENT ON COLUMN purchase_modes.price_multiplier IS 'Multiplicador aplicado ao preço base do nível (ex: 0.93 para 7% de desconto)';
COMMENT ON COLUMN purchase_modes.collections_count IS 'Número de coleções incluídas nesta modalidade';
COMMENT ON COLUMN purchase_modes.deliveries_total IS 'Número total de entregas (ex: 3 para trimestral, 6 para semestral)';
COMMENT ON COLUMN purchase_modes.includes_bonus IS 'Se esta modalidade inclui bônus (ex: coleção extra)';

-- Inserir configurações padrão
INSERT INTO purchase_modes (mode_key, name, description, price_multiplier, collections_count, deliveries_total, includes_bonus, display_order) VALUES
  ('standalone', 'Avulso', 'Compra avulsa de uma coleção', 1.000, 1, 1, false, 1),
  ('trimestral', 'Trimestral', 'Plano de 3 meses com 3 coleções', 0.930, 3, 3, false, 2),
  ('semestral', 'Semestral', 'Plano de 6 meses com bônus', 0.860, 6, 6, true, 3),
  ('anual', 'Anual', 'Plano anual com 12 coleções', 0.790, 12, 12, true, 4);

-- Habilitar RLS
ALTER TABLE purchase_modes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Usuários autenticados podem visualizar modalidades ativas
CREATE POLICY "Usuários autenticados podem visualizar modalidades ativas"
  ON purchase_modes FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Políticas RLS: Usuários anônimos podem visualizar modalidades ativas
CREATE POLICY "Usuários anônimos podem visualizar modalidades ativas"
  ON purchase_modes FOR SELECT
  TO anon
  USING (is_active = true);

-- Políticas RLS: Admins podem gerenciar modalidades
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
