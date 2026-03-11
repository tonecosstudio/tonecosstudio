-- =====================================================
-- Migration: Create Production Tables
-- Description: Tabelas para gerenciamento de produção
-- =====================================================

-- =====================================================
-- MODELS (Modelos 3D)
-- =====================================================
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_models_is_active ON models(is_active);

-- =====================================================
-- IMAGES_QUEUE (Fila de processamento de imagens)
-- =====================================================
CREATE TABLE images_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  processed_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_images_queue_status ON images_queue(status);
CREATE INDEX idx_images_queue_created_at ON images_queue(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Models: Todos podem ver ativos, admins gerenciam
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "models_select_active"
  ON models FOR SELECT
  USING (is_active = true);

CREATE POLICY "models_select_admin"
  ON models FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "models_modify_admin"
  ON models FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Images Queue: Apenas admins
ALTER TABLE images_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "images_queue_select_admin"
  ON images_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "images_queue_modify_admin"
  ON images_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER set_updated_at_models
  BEFORE UPDATE ON models
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_images_queue
  BEFORE UPDATE ON images_queue
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE models IS 'Modelos 3D disponíveis para produção';
COMMENT ON TABLE images_queue IS 'Fila de processamento de imagens';
