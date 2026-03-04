-- =====================================================
-- PRODUCTION MANAGEMENT SYSTEM - DEPLOYMENT VERIFICATION
-- =====================================================

-- Check cron jobs
SELECT 
  'Cron Jobs' as check_type,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname IN ('send-character-choice-reminders', 'expire-character-choices')
ORDER BY jobname;

-- Check character_choices table status constraint
SELECT 
  'Character Choices Status Constraint' as check_type,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'character_choices_status_check';

-- Check if character_choices table exists
SELECT 
  'Character Choices Table' as check_type,
  COUNT(*) as exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'character_choices';

-- Check production_queue table
SELECT 
  'Production Queue Table' as check_type,
  COUNT(*) as exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'production_queue';

-- Check Edge Functions (via pg_net if available)
SELECT 
  'Edge Functions Status' as check_type,
  'Check Supabase Dashboard' as note;
