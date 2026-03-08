-- Create admin_notification_settings table
CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  sound_enabled boolean NOT NULL DEFAULT true,
  sound_volume integer NOT NULL DEFAULT 50,
  email_enabled boolean NOT NULL DEFAULT true,
  browser_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own notification settings"
  ON public.admin_notification_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add missing columns to character_choices
ALTER TABLE public.character_choices 
  ADD COLUMN IF NOT EXISTS deadline timestamptz,
  ADD COLUMN IF NOT EXISTS character_name text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;