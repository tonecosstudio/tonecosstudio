-- =====================================================
-- Migration: Create Pricing Context Multipliers
-- Description: Multiplicadores de contexto para precificação dinâmica
-- =====================================================

-- =====================================================
-- PRICING_CONTEXT_MULTIPLIERS - Multiplicadores de preço
-- =====================================================
CREATE TABLE IF NOT EXISTS pricing_context_multipliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  multiplier DECIMAL(5,2) NOT NULL CHECK (multiplier > 0),
  context_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_pricing_context_multipliers_active ON pricing_context_multipliers(is_active);
CREATE INDEX idx_pricing_context_multipliers_type ON pricing_context_multipliers(context_type);
CREATE INDEX idx_pricing_context_multipliers_order ON pricing_context_multipliers(display_order);

-- RLS
ALTER TABLE pricing_context_multipliers ENABLE ROW LEVEL SECURITY;

-- Todos podem ver multiplicadores ativos
CREATE POLICY "Anyone can view active multipliers"
  ON pricing_context_multipliers FOR SELECT
  USING (is_active = true);

-- Admins podem ver todos
CREATE POLICY "Admins can view all multipliers"
  ON pricing_context_multipliers FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage multipliers"
  ON pricing_context_multipliers FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_pricing_context_multipliers
  BEFORE UPDATE ON pricing_context_multipliers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- Dados iniciais - Multiplicadores de contexto
-- =====================================================
INSERT INTO pricing_context_multipliers (name, display_name, description, multiplier, context_type, display_order)
VALUES
  ('size_small', 'Tamanho Pequeno', 'Personagem de tamanho pequeno (até 10cm)', 0.80, 'size', 1),
  ('size_medium', 'Tamanho Médio', 'Personagem de tamanho médio (10-20cm)', 1.00, 'size', 2),
  ('size_large', 'Tamanho Grande', 'Personagem de tamanho grande (20-30cm)', 1.50, 'size', 3),
  ('size_xlarge', 'Tamanho Extra Grande', 'Personagem de tamanho extra grande (30cm+)', 2.00, 'size', 4),
  ('complexity_simple', 'Complexidade Simples', 'Design simples com poucos detalhes', 0.90, 'complexity', 5),
  ('complexity_medium', 'Complexidade Média', 'Design com detalhes moderados', 1.00, 'complexity', 6),
  ('complexity_high', 'Complexidade Alta', 'Design com muitos detalhes', 1.30, 'complexity', 7),
  ('complexity_extreme', 'Complexidade Extrema', 'Design extremamente detalhado', 1.60, 'complexity', 8),
  ('finish_standard', 'Acabamento Padrão', 'Acabamento padrão', 1.00, 'finish', 9),
  ('finish_premium', 'Acabamento Premium', 'Acabamento premium com pintura especial', 1.20, 'finish', 10),
  ('finish_deluxe', 'Acabamento Deluxe', 'Acabamento deluxe com detalhes extras', 1.40, 'finish', 11),
  ('urgency_normal', 'Prazo Normal', 'Prazo de entrega normal', 1.00, 'urgency', 12),
  ('urgency_express', 'Prazo Expresso', 'Entrega em prazo reduzido', 1.50, 'urgency', 13),
  ('urgency_rush', 'Prazo Urgente', 'Entrega urgente', 2.00, 'urgency', 14)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE pricing_context_multipliers IS 'Multiplicadores de contexto para precificação dinâmica';
COMMENT ON COLUMN pricing_context_multipliers.multiplier IS 'Fator multiplicador do preço base (1.0 = sem alteração)';
COMMENT ON COLUMN pricing_context_multipliers.context_type IS 'Tipo de contexto: size, complexity, finish, urgency, etc';
