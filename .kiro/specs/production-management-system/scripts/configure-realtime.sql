-- ============================================================================
-- PRODUCTION MANAGEMENT SYSTEM - REALTIME CONFIGURATION
-- ============================================================================
-- Purpose: Configure Supabase Realtime for production management tables
-- Usage: Run this script to enable real-time updates for the dashboard
-- ============================================================================

-- Enable Realtime for production_queue table
-- This allows the dashboard to receive live updates when production items change
ALTER PUBLICATION supabase_realtime ADD TABLE production_queue;

-- Enable Realtime for character_choices table
-- This allows real-time updates when customers submit character choices
ALTER PUBLICATION supabase_realtime ADD TABLE character_choices;

-- Enable Realtime for production_stages table
-- This allows real-time updates when production stages change
ALTER PUBLICATION supabase_realtime ADD TABLE production_stages;

-- Optional: Enable Realtime for audit log tables (if needed for admin monitoring)
-- Uncomment if you want real-time updates for these tables
-- ALTER PUBLICATION supabase_realtime ADD TABLE stage_transition_logs;
-- ALTER PUBLICATION supabase_realtime ADD TABLE production_assignment_logs;

-- Verify Realtime configuration
SELECT 
  'Realtime Configuration' as check_type,
  schemaname,
  tablename,
  'ENABLED ✓' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN (
    'production_queue',
    'character_choices',
    'production_stages'
  )
ORDER BY tablename;

-- Check if all expected tables are enabled
SELECT 
  CASE 
    WHEN COUNT(*) = 3 THEN 'All production tables have Realtime enabled ✓'
    ELSE 'WARNING: Not all tables have Realtime enabled ✗'
  END as realtime_status,
  COUNT(*) as enabled_tables,
  3 as expected_tables
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN (
    'production_queue',
    'character_choices',
    'production_stages'
  );

-- ============================================================================
-- REALTIME FILTERS (Optional)
-- ============================================================================
-- You can configure filters to limit which changes are broadcast
-- This is useful for reducing bandwidth and improving performance

-- Example: Only broadcast changes for active production items
-- Note: This requires Supabase Realtime filters feature
-- Configure in Supabase Dashboard > Database > Replication

-- ============================================================================
-- TESTING REALTIME
-- ============================================================================
-- To test if Realtime is working:
-- 1. Open the production dashboard in a browser
-- 2. Run the following update in SQL editor:
--    UPDATE production_queue SET production_status = 'in_production' WHERE id = 'some-id';
-- 3. Verify the dashboard updates within 5 seconds

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If Realtime is not working, check:

-- 1. Verify Realtime is enabled for the publication
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 2. Check if tables are in the publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 3. Verify RLS policies allow the user to SELECT from these tables
-- (Realtime requires SELECT permission)
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('production_queue', 'character_choices', 'production_stages')
  AND cmd = 'SELECT';

-- 4. Check Supabase Realtime logs in Dashboard > Logs > Realtime

-- ============================================================================
-- DISABLING REALTIME (if needed)
-- ============================================================================
-- To disable Realtime for a table:
-- ALTER PUBLICATION supabase_realtime DROP TABLE production_queue;
-- ALTER PUBLICATION supabase_realtime DROP TABLE character_choices;
-- ALTER PUBLICATION supabase_realtime DROP TABLE production_stages;

-- ============================================================================
-- PERFORMANCE CONSIDERATIONS
-- ============================================================================
-- Realtime broadcasts all changes to subscribed clients
-- For high-traffic tables, consider:
-- 1. Using filters to limit broadcasts
-- 2. Implementing client-side throttling/debouncing
-- 3. Using polling as a fallback for non-critical updates

-- Current configuration is optimized for:
-- - Up to 100 concurrent admin users
-- - Up to 1000 production items
-- - Updates every 1-5 seconds

-- ============================================================================
-- COMPLETION CHECKLIST
-- ============================================================================
-- [ ] Realtime enabled for production_queue
-- [ ] Realtime enabled for character_choices
-- [ ] Realtime enabled for production_stages
-- [ ] Verification query shows all 3 tables enabled
-- [ ] Test update triggers real-time change in dashboard
-- [ ] RLS policies allow SELECT for authenticated users
-- [ ] Performance is acceptable (< 5 second latency)

SELECT 'Realtime configuration complete! ✓' as status;
