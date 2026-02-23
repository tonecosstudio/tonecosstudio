-- ============================================
-- SQL DEFINITIVO - COPIE E COLE NO SUPABASE
-- ============================================
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- ============================================
-- 1. EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 2. FUNÇÃO set_updated_at (SE NÃO EXISTIR)
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- 3. ADICIONAR COLUNAS EM images_queue
-- ============================================
ALTER TABLE public.images_queue
ADD COLUMN IF NOT EXISTS ai_suggested_name text,
ADD COLUMN IF NOT EXISTS ai_confidence numeric(3,2),
ADD COLUMN IF NOT EXISTS ai_model_used text,
ADD COLUMN IF NOT EXISTS image_hash text;

-- ============================================
-- 4. CRIAR TABELA franchise_rules
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
-- 5. DESABILITAR RLS (TEMPORÁRIO - PARA FUNCIONAR)
-- ============================================
ALTER TABLE public.franchise_rules DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CRIAR ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS images_queue_ai_suggested_name_idx
ON public.images_queue (ai_suggested_name)
WHERE ai_suggested_name IS NULL;

CREATE INDEX IF NOT EXISTS images_queue_image_hash_idx
ON public.images_queue (image_hash)
WHERE image_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS franchise_rules_enabled_priority_idx
ON public.franchise_rules (enabled, priority);

CREATE INDEX IF NOT EXISTS franchise_rules_pattern_trgm_idx
ON public.franchise_rules USING gin (pattern gin_trgm_ops);

CREATE INDEX IF NOT EXISTS franchise_rules_franchise_trgm_idx
ON public.franchise_rules USING gin (franchise_canonical gin_trgm_ops);

-- ============================================
-- 7. CRIAR TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS set_franchise_rules_updated_at ON public.franchise_rules;
CREATE TRIGGER set_franchise_rules_updated_at
BEFORE UPDATE ON public.franchise_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 8. COMENTÁRIOS
-- ============================================
COMMENT ON COLUMN public.images_queue.ai_suggested_name IS 'AI-suggested model name';
COMMENT ON COLUMN public.images_queue.ai_confidence IS 'Confidence score (0.0 to 1.0)';
COMMENT ON COLUMN public.images_queue.ai_model_used IS 'AI model used';
COMMENT ON COLUMN public.images_queue.image_hash IS 'SHA-256 hash for deduplication';
COMMENT ON TABLE public.franchise_rules IS 'Franchise mapping rules';

-- ============================================
-- 9. VERIFICAÇÃO FINAL
-- ============================================
-- Verificar se franchise_rules existe e RLS está desabilitado
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'franchise_rules';

-- Resultado esperado: rls_enabled = false (f)
