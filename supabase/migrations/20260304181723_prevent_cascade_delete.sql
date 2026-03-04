-- CRITICAL: Prevent CASCADE DELETE to protect data
-- Change all CASCADE to RESTRICT for critical tables

-- This prevents accidental data loss when deleting users

-- 1. Profiles
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- 2. User Roles
ALTER TABLE user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE user_roles
ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- 3. Subscriptions (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    ALTER TABLE subscriptions
    DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
    
    ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 4. Standalone Purchases (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'standalone_purchases') THEN
    ALTER TABLE standalone_purchases
    DROP CONSTRAINT IF EXISTS standalone_purchases_user_id_fkey;
    
    ALTER TABLE standalone_purchases
    ADD CONSTRAINT standalone_purchases_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 5. Quotes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
    ALTER TABLE quotes
    DROP CONSTRAINT IF EXISTS quotes_user_id_fkey;
    
    ALTER TABLE quotes
    ADD CONSTRAINT quotes_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 6. Wishlist (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wishlist') THEN
    ALTER TABLE wishlist
    DROP CONSTRAINT IF EXISTS wishlist_user_id_fkey;
    
    ALTER TABLE wishlist
    ADD CONSTRAINT wishlist_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE RESTRICT;
  END IF;
END $$;
