
-- Add missing columns to profiles table to support full profile functionality
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS delivery_address jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preferences_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preference_tags text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cpf text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS birth_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS profile_completion integer DEFAULT 0;
