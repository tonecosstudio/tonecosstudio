-- ============================================
-- SQL PARA APLICAR NO SUPABASE REMOTO
-- ============================================
-- Copie e cole este SQL no SQL Editor do Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- ============================================
-- 0. HABILITAR EXTENSÃO pg_trgm
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1. ADICIONAR COLUNAS DE AI À TABELA images_queue
-- ============================================

-- Adicionar colunas se não existirem
ALTER TABLE public.images_queue
ADD COLUMN IF NOT EXISTS ai_suggested_name text,
ADD COLUMN IF NOT EXISTS ai_confidence numeric(3,2),
ADD COLUMN IF NOT EXISTS ai_model_used text,
ADD COLUMN IF NOT EXISTS image_hash text;

-- ============================================
-- 2. CRIAR TABELA franchise_rules (SE NÃO EXISTIR)
-- ============================================

CREATE TABLE IF NOT EXISTS public.franchise_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 100,
  pattern text NOT NULL,
  franchise_canonical text NOT NULL,
  note text NULL
);

-- ============================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices para images_queue
CREATE INDEX IF NOT EXISTS images_queue_ai_suggested_name_idx
ON public.images_queue (ai_suggested_name)
WHERE ai_suggested_name IS NULL;

CREATE INDEX IF NOT EXISTS images_queue_image_hash_idx
ON public.images_queue (image_hash)
WHERE image_hash IS NOT NULL;

-- Índices para franchise_rules
CREATE INDEX IF NOT EXISTS franchise_rules_enabled_priority_idx
ON public.franchise_rules (enabled, priority);

CREATE INDEX IF NOT EXISTS franchise_rules_pattern_trgm_idx
ON public.franchise_rules USING gin (pattern gin_trgm_ops);

CREATE INDEX IF NOT EXISTS franchise_rules_franchise_trgm_idx
ON public.franchise_rules USING gin (franchise_canonical gin_trgm_ops);

-- ============================================
-- 4. CONFIGURAR RLS (Row Level Security)
-- ============================================

ALTER TABLE public.franchise_rules ENABLE ROW LEVEL SECURITY;

-- Políticas para franchise_rules (apenas se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'franchise_rules' 
    AND policyname = 'admins_select_franchise_rules'
  ) THEN
    CREATE POLICY "admins_select_franchise_rules"
    ON public.franchise_rules
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'franchise_rules' 
    AND policyname = 'admins_manage_franchise_rules'
  ) THEN
    CREATE POLICY "admins_manage_franchise_rules"
    ON public.franchise_rules
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ============================================
-- 5. CRIAR TRIGGER PARA updated_at
-- ============================================

-- Trigger para franchise_rules (apenas se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_franchise_rules_updated_at'
  ) THEN
    CREATE TRIGGER set_franchise_rules_updated_at
    BEFORE UPDATE ON public.franchise_rules
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ============================================
-- 6. ADICIONAR COMENTÁRIOS (DOCUMENTAÇÃO)
-- ============================================

COMMENT ON COLUMN public.images_queue.ai_suggested_name IS 'AI-suggested model name from vision analysis';
COMMENT ON COLUMN public.images_queue.ai_confidence IS 'Confidence score from AI (0.0 to 1.0)';
COMMENT ON COLUMN public.images_queue.ai_model_used IS 'AI model used for classification (e.g., gpt-4o-mini)';
COMMENT ON COLUMN public.images_queue.image_hash IS 'SHA-256 hash of image content for deduplication';

COMMENT ON TABLE public.franchise_rules IS 'Automatic franchise mapping rules (pattern -> canonical franchise)';
COMMENT ON COLUMN public.franchise_rules.pattern IS 'Pattern to match (case-insensitive). Ex: magneto, tobi, x-men';
COMMENT ON COLUMN public.franchise_rules.franchise_canonical IS 'Canonical franchise name to apply when pattern matches';

-- ============================================
-- 7. VERIFICAR SE FOI APLICADO CORRETAMENTE
-- ============================================

-- Execute esta query para verificar as colunas de images_queue:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'images_queue'
--   AND column_name IN ('ai_suggested_name', 'ai_confidence', 'ai_model_used', 'image_hash');

-- Execute esta query para verificar se franchise_rules existe:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'franchise_rules';

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- ✅ CREATE EXTENSION (ou já existe)
-- ✅ ALTER TABLE
-- ✅ CREATE TABLE (ou já existe)
-- ✅ CREATE INDEX (6x)
-- ✅ ALTER TABLE (RLS)
-- ✅ DO (políticas)
-- ✅ DO (trigger)
-- ✅ COMMENT (6x)
