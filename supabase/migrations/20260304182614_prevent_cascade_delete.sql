-- CRITICAL: Prevent CASCADE DELETE to protect data
-- Changes ON DELETE CASCADE to ON DELETE RESTRICT

-- Profiles
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- Subscriptions
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- Standalone Purchases
ALTER TABLE standalone_purchases
DROP CONSTRAINT IF EXISTS standalone_purchases_user_id_fkey;

ALTER TABLE standalone_purchases
ADD CONSTRAINT standalone_purchases_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- Quotes
ALTER TABLE quotes
DROP CONSTRAINT IF EXISTS quotes_user_id_fkey;

ALTER TABLE quotes
ADD CONSTRAINT quotes_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- User Roles
ALTER TABLE user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE user_roles
ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

-- Wishlist
ALTER TABLE wishlist
DROP CONSTRAINT IF EXISTS wishlist_user_id_fkey;

ALTER TABLE wishlist
ADD CONSTRAINT wishlist_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;
