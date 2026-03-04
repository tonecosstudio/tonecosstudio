-- ============================================================================
-- PRODUCTION MANAGEMENT SYSTEM - MIGRATION REVIEW SCRIPT
-- ============================================================================
-- Purpose: Review and verify all production management system migrations
-- Usage: Run this script to check if all required migrations are applied
-- ============================================================================

-- Check if all required tables exist
SELECT 
  'Tables Check' as check_type,
  CASE 
    WHEN COUNT(*) = 3 THEN 'PASS ✓'
    ELSE 'FAIL ✗ - Missing tables'
  END as status,
  COUNT(*) as found_count,
  3 as expected_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'production_queue',
    'character_choices',
    'production_stages'
  );

-- List all production-related tables
SELECT 
  'Production Tables' as info_type,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'production_queue',
    'character_choices',
    'production_stages',
    'production_assignment_logs',
    'stage_transition_logs',
    'production_photo_metadata'
  )
ORDER BY table_name;

-- Check if all required indexes exist
SELECT 
  'Indexes Check' as check_type,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN (
    'production_queue',
    'character_choices',
    'production_stages'
  )
ORDER BY tablename, indexname;

-- Check if all required triggers exist
SELECT 
  'Triggers Check' as check_type,
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    ELSE 'UNKNOWN'
  END as status
FROM pg_trigger 
WHERE tgname LIKE '%production%' 
   OR tgname LIKE '%character%'
   OR tgname LIKE '%stage%'
ORDER BY tgrelid::regclass, tgname;

-- Check if RLS policies are created
SELECT 
  'RLS Policies Check' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN (
  'production_queue',
  'character_choices',
  'production_stages',
  'production_assignment_logs',
  'stage_transition_logs',
  'production_photo_metadata'
)
ORDER BY tablename, policyname;

-- Check if cron jobs are scheduled
SELECT 
  'Cron Jobs Check' as check_type,
  jobname,
  schedule,
  active,
  CASE 
    WHEN active THEN 'ACTIVE ✓'
    ELSE 'INACTIVE ✗'
  END as status
FROM cron.job 
WHERE jobname LIKE '%character_choice%'
ORDER BY jobname;

-- Check if required functions exist
SELECT 
  'Functions Check' as check_type,
  routine_name as function_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%production%'
    OR routine_name LIKE '%character_choice%'
    OR routine_name LIKE '%stage%'
    OR routine_name LIKE '%priority%'
  )
ORDER BY routine_name;

-- Check if storage bucket exists
SELECT 
  'Storage Bucket Check' as check_type,
  id as bucket_id,
  name as bucket_name,
  public,
  file_size_limit,
  allowed_mime_types,
  CASE 
    WHEN id = 'production-photos' THEN 'CONFIGURED ✓'
    ELSE 'CHECK CONFIG'
  END as status
FROM storage.buckets 
WHERE id = 'production-photos';

-- Check Realtime configuration
SELECT 
  'Realtime Check' as check_type,
  schemaname,
  tablename,
  CASE 
    WHEN tablename IN ('production_queue', 'character_choices', 'production_stages') 
    THEN 'ENABLED ✓'
    ELSE 'CHECK CONFIG'
  END as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN (
    'production_queue',
    'character_choices',
    'production_stages'
  );

-- Check for any data in production tables
SELECT 
  'Data Check' as check_type,
  'production_queue' as table_name,
  COUNT(*) as row_count
FROM production_queue
UNION ALL
SELECT 
  'Data Check',
  'character_choices',
  COUNT(*)
FROM character_choices
UNION ALL
SELECT 
  'Data Check',
  'production_stages',
  COUNT(*)
FROM production_stages;

-- Check migration history (if using migration tracking)
SELECT 
  'Migration History' as info_type,
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE version::text LIKE '202604%'
   OR version::text LIKE '202605%'
ORDER BY version DESC
LIMIT 20;

-- Summary Report
SELECT 
  '=== MIGRATION REVIEW SUMMARY ===' as summary,
  NOW() as review_date;

-- Recommendations
SELECT 
  'RECOMMENDATIONS' as section,
  'If any checks show FAIL or MISSING, review the corresponding migration files' as recommendation
UNION ALL
SELECT 
  'RECOMMENDATIONS',
  'Ensure all cron jobs are ACTIVE before deploying to production'
UNION ALL
SELECT 
  'RECOMMENDATIONS',
  'Verify Realtime is enabled for all production tables'
UNION ALL
SELECT 
  'RECOMMENDATIONS',
  'Confirm storage bucket has correct RLS policies'
UNION ALL
SELECT 
  'RECOMMENDATIONS',
  'Test email notifications before production deployment';
