-- =====================================================
-- MIGRATION: Apply profile relationship fix
-- Date: 2026-04-23
-- Description: Actually applies the FK changes that were marked as applied
-- =====================================================

-- Fix standalone_purchases relationship
ALTER TABLE standalone_purchases DROP CONSTRAINT IF EXISTS standalone_purchases_user_id_fkey;
ALTER TABLE standalone_purchases ADD CONSTRAINT standalone_purchases_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix manual_payments relationship  
ALTER TABLE manual_payments DROP CONSTRAINT IF EXISTS manual_payments_user_id_fkey;
ALTER TABLE manual_payments ADD CONSTRAINT manual_payments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Verify changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'standalone_purchases_user_id_fkey' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'standalone_purchases FK not fixed';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'manual_payments_user_id_fkey' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'manual_payments FK not fixed';
  END IF;
  
  RAISE NOTICE 'Profile relationships fixed successfully!';
END $$;
