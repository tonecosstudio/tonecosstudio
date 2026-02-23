-- SQL ALTERNATIVO - Caso has_role não exista
-- Use este SQL se o anterior deu erro relacionado a has_role
-- https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

-- Habilitar extensão
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Adicionar colunas de AI
ALTER TABLE public.images_queue
ADD COLUMN IF NOT EXISTS ai_suggested_name text,
ADD COLUMN IF NOT EXISTS ai_confidence numeric(3,2),
ADD COLUMN IF NOT EXISTS ai_model_used text,
ADD COLUMN IF NOT EXISTS image_hash text;

-- Criar tabela franchise_rules
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

-- Criar índices
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

-- Configurar RLS (SEM usar has_role - permite acesso autenticado)
ALTER TABLE public.franchise_rules ENABLE ROW LEVEL SECURITY;

-- Política SIMPLES: qualquer usuário autenticado pode ler
DROP POLICY IF EXISTS "authenticated_select_franchise_rules" ON public.franchise_rules;
CREATE POLICY "authenticated_select_franchise_rules"
ON public.franchise_rules
FOR SELECT
TO authenticated
USING (true);

-- Política SIMPLES: qualquer usuário autenticado pode escrever
DROP POLICY IF EXISTS "authenticated_manage_franchise_rules" ON public.franchise_rules;
CREATE POLICY "authenticated_manage_franchise_rules"
ON public.franchise_rules
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Criar função set_updated_at se não existir
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS set_franchise_rules_updated_at ON public.franchise_rules;
CREATE TRIGGER set_franchise_rules_updated_at
BEFORE UPDATE ON public.franchise_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Adicionar comentários
COMMENT ON COLUMN public.images_queue.ai_suggested_name IS 'AI-suggested model name from vision analysis';
COMMENT ON COLUMN public.images_queue.ai_confidence IS 'Confidence score from AI (0.0 to 1.0)';
COMMENT ON COLUMN public.images_queue.ai_model_used IS 'AI model used for classification (e.g., gpt-4o-mini)';
COMMENT ON COLUMN public.images_queue.image_hash IS 'SHA-256 hash of image content for deduplication';
COMMENT ON TABLE public.franchise_rules IS 'Automatic franchise mapping rules (pattern -> canonical franchise)';
COMMENT ON COLUMN public.franchise_rules.pattern IS 'Pattern to match (case-insensitive). Ex: magneto, tobi, x-men';
COMMENT ON COLUMN public.franchise_rules.franchise_canonical IS 'Canonical franchise name to apply when pattern matches';
