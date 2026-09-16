-- Authenticated visitors use the same public catalog fallback as anonymous visitors.
-- RLS keeps ordinary users limited to public catalog rows and admins can read all rows.
GRANT SELECT ON public.models TO authenticated;
