
-- Add missing columns to production_queue that the code expects
ALTER TABLE public.production_queue
  ADD COLUMN IF NOT EXISTS priority_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_production_date date,
  ADD COLUMN IF NOT EXISTS assigned_to_name text,
  ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS choice_made_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS production_notes text,
  ADD COLUMN IF NOT EXISTS customer_notes text;

-- Update existing records: map non-standard stages to valid pipeline stages
UPDATE public.production_queue SET current_stage = 'model_preparation' WHERE current_stage = 'sculpting';
UPDATE public.production_queue SET current_stage = 'printing' WHERE current_stage = 'molding';

-- Set priority_score based on priority value
UPDATE public.production_queue SET priority_score = CASE
  WHEN priority = 0 THEN 100
  WHEN priority = 1 THEN 75
  WHEN priority = 2 THEN 50
  WHEN priority = 3 THEN 25
  ELSE 0
END;
