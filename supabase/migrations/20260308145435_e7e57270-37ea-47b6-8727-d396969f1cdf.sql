
-- message_templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage message templates" ON public.message_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- scheduled_messages
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  message text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage scheduled messages" ON public.scheduled_messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- production_stages
CREATE TABLE IF NOT EXISTS public.production_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_queue_id uuid NOT NULL REFERENCES public.production_queue(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  is_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  blocked_at timestamptz,
  unblocked_at timestamptz,
  notes text,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.production_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage production stages" ON public.production_stages FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own production stages" ON public.production_stages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.production_queue pq WHERE pq.id = production_stages.production_queue_id AND pq.user_id = auth.uid())
);

-- Add assigned_to column to production_queue
ALTER TABLE public.production_queue ADD COLUMN IF NOT EXISTS assigned_to uuid;
