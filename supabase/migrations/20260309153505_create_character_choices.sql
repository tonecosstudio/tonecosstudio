-- =====================================================
-- Migration: Create Character Choices
-- Description: Escolhas de personagens pelos usuários
-- =====================================================

-- =====================================================
-- CHARACTER_CHOICES - Escolhas de personagens
-- =====================================================
CREATE TYPE choice_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'expired'
);

CREATE TABLE IF NOT EXISTS character_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES cycles(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Escolha do personagem
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  character_name TEXT NOT NULL,
  collection_name TEXT,
  
  -- Status e prazo
  status choice_status DEFAULT 'pending' NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Aprovação/Rejeição
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  
  -- Notas
  user_notes TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_character_choices_user ON character_choices(user_id);
CREATE INDEX idx_character_choices_cycle ON character_choices(cycle_id);
CREATE INDEX idx_character_choices_status ON character_choices(status);
CREATE INDEX idx_character_choices_deadline ON character_choices(deadline);
CREATE INDEX idx_character_choices_character ON character_choices(character_id);

-- RLS
ALTER TABLE character_choices ENABLE ROW LEVEL SECURITY;

-- Usuários veem próprias escolhas
CREATE POLICY "Users can view own choices"
  ON character_choices FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem criar próprias escolhas
CREATE POLICY "Users can create own choices"
  ON character_choices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar próprias escolhas pendentes
CREATE POLICY "Users can update own pending choices"
  ON character_choices FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Admins veem todas
CREATE POLICY "Admins can view all choices"
  ON character_choices FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Admins podem modificar todas
CREATE POLICY "Admins can manage all choices"
  ON character_choices FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_character_choices
  BEFORE UPDATE ON character_choices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE character_choices IS 'Escolhas de personagens pelos usuários para cada ciclo';
COMMENT ON COLUMN character_choices.deadline IS 'Prazo limite para fazer a escolha';
COMMENT ON COLUMN character_choices.status IS 'Status: pending, approved, rejected, expired';
