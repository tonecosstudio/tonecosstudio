-- Fix: Add RLS policies for admin to see all data

-- Profiles - Admin can see all
DROP POLICY IF EXISTS "admins_select_all_profiles" ON profiles;
CREATE POLICY "admins_select_all_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Subscriptions - Admin can see all
DROP POLICY IF EXISTS "admins_select_all_subscriptions" ON subscriptions;
CREATE POLICY "admins_select_all_subscriptions"
ON subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Standalone Purchases - Admin can see all (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'standalone_purchases') THEN
    DROP POLICY IF EXISTS "admins_select_all_standalone" ON standalone_purchases;
    CREATE POLICY "admins_select_all_standalone"
    ON standalone_purchases
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
      )
    );
  END IF;
END $$;

-- Quotes - Admin can see all
DROP POLICY IF EXISTS "admins_select_all_quotes" ON quotes;
CREATE POLICY "admins_select_all_quotes"
ON quotes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- User Roles - Admin can see all
DROP POLICY IF EXISTS "admins_select_all_roles" ON user_roles;
CREATE POLICY "admins_select_all_roles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);
