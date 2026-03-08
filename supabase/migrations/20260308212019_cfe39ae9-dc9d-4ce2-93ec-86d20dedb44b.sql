
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  order_type text NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_by_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage order status history"
  ON public.order_status_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
