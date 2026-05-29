-- Creates the production stage table used by production workflows.
-- Several admin/customer RPC migrations depend on this table.

CREATE TABLE IF NOT EXISTS public.production_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_queue_id uuid NOT NULL REFERENCES public.production_queue(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  stage_order integer,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_name text,
  assigned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  estimated_duration integer NOT NULL DEFAULT 0,
  actual_duration numeric,
  is_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  blocked_at timestamptz,
  unblocked_at timestamptz,
  photos text[] NOT NULL DEFAULT ARRAY[]::text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.production_stages
  ADD COLUMN IF NOT EXISTS production_queue_id uuid REFERENCES public.production_queue(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS stage_name text,
  ADD COLUMN IF NOT EXISTS stage_order integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_name text,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_duration integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_duration numeric,
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS block_reason text,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS unblocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_production_stages_queue_id
  ON public.production_stages(production_queue_id);
CREATE INDEX IF NOT EXISTS idx_production_stages_status
  ON public.production_stages(status);
CREATE INDEX IF NOT EXISTS idx_production_stages_assigned_to
  ON public.production_stages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_stages_blocked
  ON public.production_stages(is_blocked)
  WHERE is_blocked = true;

ALTER TABLE public.production_stages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.production_stages FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_stages TO authenticated, service_role;

DROP POLICY IF EXISTS "production_stages_select_own_or_admin" ON public.production_stages;
CREATE POLICY "production_stages_select_own_or_admin"
  ON public.production_stages
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.production_queue pq
      WHERE pq.id = production_stages.production_queue_id
        AND pq.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "production_stages_manage_admin" ON public.production_stages;
CREATE POLICY "production_stages_manage_admin"
  ON public.production_stages
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP TRIGGER IF EXISTS set_updated_at_production_stages ON public.production_stages;
CREATE TRIGGER set_updated_at_production_stages
  BEFORE UPDATE ON public.production_stages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.production_stages IS
  'Per-stage production workflow state for each production queue item.';

NOTIFY pgrst, 'reload schema';
