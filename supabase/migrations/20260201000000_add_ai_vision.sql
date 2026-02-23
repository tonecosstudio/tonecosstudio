-- AI Vision Classification System
-- Creates tables for caching AI vision results and tracking processing jobs

-- ============================================================================
-- 1. Create ai_vision_cache table
-- ============================================================================
-- Stores AI vision classification results to avoid reprocessing same images

CREATE TABLE IF NOT EXISTS public.ai_vision_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Image identification
  image_hash text NOT NULL UNIQUE,  -- SHA-256 hash of image content
  image_url text NOT NULL,
  
  -- AI result
  model_used text NOT NULL,  -- 'gpt-4o-mini', 'gpt-4o'
  confidence float,  -- 0-100 (how confident the AI is)
  
  -- Classification results
  name text,
  franchise text,
  category text,
  subcategory text,
  tags text[],
  
  -- Metrics
  tokens_used int,
  cost_usd decimal(10, 6),
  processing_time_ms int,
  
  -- Validation (feedback from admin)
  accepted boolean DEFAULT null,  -- Did admin accept without changes?
  admin_edited boolean DEFAULT null  -- Did admin edit before accepting?
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_vision_cache_hash 
  ON public.ai_vision_cache(image_hash);

CREATE INDEX IF NOT EXISTS idx_ai_vision_cache_model 
  ON public.ai_vision_cache(model_used);

CREATE INDEX IF NOT EXISTS idx_ai_vision_cache_created 
  ON public.ai_vision_cache(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_vision_cache_accepted 
  ON public.ai_vision_cache(accepted) 
  WHERE accepted IS NOT NULL;

-- ============================================================================
-- 2. Create ai_processing_jobs table
-- ============================================================================
-- Tracks batch processing jobs for monitoring and progress

CREATE TABLE IF NOT EXISTS public.ai_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Job info
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_selected text NOT NULL,  -- 'gpt-4o-mini', 'gpt-4o'
  
  -- Progress tracking
  status text NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  total_images int NOT NULL,
  processed_images int NOT NULL DEFAULT 0,
  failed_images int NOT NULL DEFAULT 0,
  
  -- Statistics
  total_cost_usd decimal(10, 6) DEFAULT 0,
  total_tokens int DEFAULT 0,
  avg_processing_time_ms int,
  avg_confidence float,
  
  -- Error tracking
  last_error text,
  error_count int DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status 
  ON public.ai_processing_jobs(status);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_by 
  ON public.ai_processing_jobs(created_by);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at 
  ON public.ai_processing_jobs(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_ai_jobs_updated_at ON public.ai_processing_jobs;
CREATE TRIGGER trg_ai_jobs_updated_at
  BEFORE UPDATE ON public.ai_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.ai_vision_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_processing_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies for ai_vision_cache
-- ============================================================================

-- Admins can read all cache entries
DROP POLICY IF EXISTS "admins_select_vision_cache" ON public.ai_vision_cache;
CREATE POLICY "admins_select_vision_cache"
  ON public.ai_vision_cache
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert cache entries
DROP POLICY IF EXISTS "admins_insert_vision_cache" ON public.ai_vision_cache;
CREATE POLICY "admins_insert_vision_cache"
  ON public.ai_vision_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update cache entries (for feedback)
DROP POLICY IF EXISTS "admins_update_vision_cache" ON public.ai_vision_cache;
CREATE POLICY "admins_update_vision_cache"
  ON public.ai_vision_cache
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete cache entries
DROP POLICY IF EXISTS "admins_delete_vision_cache" ON public.ai_vision_cache;
CREATE POLICY "admins_delete_vision_cache"
  ON public.ai_vision_cache
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5. RLS Policies for ai_processing_jobs
-- ============================================================================

-- Admins can read all jobs
DROP POLICY IF EXISTS "admins_select_jobs" ON public.ai_processing_jobs;
CREATE POLICY "admins_select_jobs"
  ON public.ai_processing_jobs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can create jobs
DROP POLICY IF EXISTS "admins_insert_jobs" ON public.ai_processing_jobs;
CREATE POLICY "admins_insert_jobs"
  ON public.ai_processing_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

-- Admins can update jobs (for progress tracking)
DROP POLICY IF EXISTS "admins_update_jobs" ON public.ai_processing_jobs;
CREATE POLICY "admins_update_jobs"
  ON public.ai_processing_jobs
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete jobs
DROP POLICY IF EXISTS "admins_delete_jobs" ON public.ai_processing_jobs;
CREATE POLICY "admins_delete_jobs"
  ON public.ai_processing_jobs
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 6. Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.ai_vision_cache IS 
  'Caches AI vision classification results to avoid reprocessing identical images';

COMMENT ON COLUMN public.ai_vision_cache.image_hash IS 
  'SHA-256 hash of image content for deduplication';

COMMENT ON COLUMN public.ai_vision_cache.confidence IS 
  'AI confidence score (0-100) for the classification';

COMMENT ON COLUMN public.ai_vision_cache.accepted IS 
  'Whether admin accepted the suggestion without any edits';

COMMENT ON TABLE public.ai_processing_jobs IS 
  'Tracks batch AI processing jobs for monitoring and statistics';

COMMENT ON COLUMN public.ai_processing_jobs.status IS 
  'Job status: pending, processing, completed, or failed';
