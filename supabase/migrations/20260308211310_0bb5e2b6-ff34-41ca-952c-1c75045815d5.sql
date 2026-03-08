-- 1. Create admin_notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'info',
  priority text NOT NULL DEFAULT 'low',
  title text NOT NULL,
  message text NOT NULL,
  icon text,
  related_id text,
  related_type text,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  recipient_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admin notifications"
  ON public.admin_notifications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Add missing columns to production_queue
ALTER TABLE public.production_queue 
  ADD COLUMN IF NOT EXISTS current_stage text DEFAULT 'awaiting_choice',
  ADD COLUMN IF NOT EXISTS choice_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS character_name text,
  ADD COLUMN IF NOT EXISTS estimated_completion_date timestamptz,
  ADD COLUMN IF NOT EXISTS production_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS collection_name text,
  ADD COLUMN IF NOT EXISTS tracking_code text,
  ADD COLUMN IF NOT EXISTS internal_flags jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS production_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS production_completed_at timestamptz;