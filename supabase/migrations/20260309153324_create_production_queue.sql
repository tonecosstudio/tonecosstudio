-- =====================================================
-- Migration: Create Production Queue
-- Description: Fila de produção de personagens
-- =====================================================

-- =====================================================
-- PRODUCTION_QUEUE - Fila de produção
-- =====================================================
CREATE TYPE production_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled',
  'on_hold'
);

CREATE TABLE IF NOT EXISTS production_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  cycle_id UUID REFERENCES cycles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  
  -- Informações do item
  character_name TEXT NOT NULL,
  collection_name TEXT,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  
  -- Status e prioridade
  status production_status DEFAULT 'pending' NOT NULL,
  priority_score INTEGER DEFAULT 0,
  
  -- Datas
  estimated_start_date TIMESTAMPTZ,
  estimated_completion_date TIMESTAMPTZ,
  actual_start_date TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,
  
  -- Notas e observações
  notes TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_production_queue_status ON production_queue(status);
CREATE INDEX idx_production_queue_priority ON production_queue(priority_score DESC);
CREATE INDEX idx_production_queue_character ON production_queue(character_id);
CREATE INDEX idx_production_queue_cycle ON production_queue(cycle_id);
CREATE INDEX idx_production_queue_user ON production_queue(user_id);
CREATE INDEX idx_production_queue_created ON production_queue(created_at DESC);

-- RLS
ALTER TABLE production_queue ENABLE ROW LEVEL SECURITY;

-- Usuários veem próprios itens
CREATE POLICY "Users can view own production items"
  ON production_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Admins veem todos
CREATE POLICY "Admins can view all production items"
  ON production_queue FOR SELECT
  USING (public.current_user_role() IN ('admin', 'super_admin'));

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage production queue"
  ON production_queue FOR ALL
  USING (public.current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.current_user_role() IN ('admin', 'super_admin'));

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_production_queue
  BEFORE UPDATE ON production_queue
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE production_queue IS 'Fila de produção de personagens';
COMMENT ON COLUMN production_queue.priority_score IS 'Score de prioridade (maior = mais prioritário)';
COMMENT ON COLUMN production_queue.status IS 'Status: pending, in_progress, completed, cancelled, on_hold';
