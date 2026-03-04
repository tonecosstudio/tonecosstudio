-- Fix: Add RLS policies for public read access

-- Collections (only active)
DROP POLICY IF EXISTS "public_read_active_collections" ON collections;
CREATE POLICY "public_read_active_collections"
ON collections
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Collection Characters
DROP POLICY IF EXISTS "public_read_collection_characters" ON collection_characters;
CREATE POLICY "public_read_collection_characters"
ON collection_characters
FOR SELECT
TO anon, authenticated
USING (true);

-- Subscription Plans (only active)
DROP POLICY IF EXISTS "public_read_active_plans" ON subscription_plans;
CREATE POLICY "public_read_active_plans"
ON subscription_plans
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Cycles
DROP POLICY IF EXISTS "public_read_cycles" ON cycles;
CREATE POLICY "public_read_cycles"
ON cycles
FOR SELECT
TO anon, authenticated
USING (true);

-- System Settings
DROP POLICY IF EXISTS "public_read_system_settings" ON system_settings;
CREATE POLICY "public_read_system_settings"
ON system_settings
FOR SELECT
TO anon, authenticated
USING (true);
