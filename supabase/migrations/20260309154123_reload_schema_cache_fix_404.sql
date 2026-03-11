-- =====================================================
-- Migration: Reload Schema Cache and Fix 404 Errors
-- Description: Force PostgREST to reload schema cache for new tables
-- =====================================================

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- Verify all tables are accessible
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'character_choices',
    'pricing_context_multipliers',
    'production_queue',
    'coin_exchange_rate'
  );
  
  RAISE NOTICE 'Tables found: %', table_count;
  
  IF table_count < 4 THEN
    RAISE EXCEPTION 'Missing tables! Expected 4, found %', table_count;
  END IF;
END $$;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Refresh permissions for anon role (for public access where allowed by RLS)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON SCHEMA public IS 'Standard public schema with proper permissions';
