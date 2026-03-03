-- Fix standalone_purchases relationship
ALTER TABLE standalone_purchases DROP CONSTRAINT IF EXISTS standalone_purchases_user_id_fkey;
ALTER TABLE standalone_purchases ADD CONSTRAINT standalone_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix manual_payments relationship  
ALTER TABLE manual_payments DROP CONSTRAINT IF EXISTS manual_payments_user_id_fkey;
ALTER TABLE manual_payments ADD CONSTRAINT manual_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Verify changes
SELECT 'standalone_purchases FK fixed' AS status WHERE EXISTS (
  SELECT 1 FROM information_schema.constraint_column_usage
  WHERE constraint_name = 'standalone_purchases_user_id_fkey' AND table_name = 'profiles'
);

SELECT 'manual_payments FK fixed' AS status WHERE EXISTS (
  SELECT 1 FROM information_schema.constraint_column_usage
  WHERE constraint_name = 'manual_payments_user_id_fkey' AND table_name = 'profiles'
);
