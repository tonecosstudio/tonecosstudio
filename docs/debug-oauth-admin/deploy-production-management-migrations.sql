-- =====================================================
-- PRODUCTION MANAGEMENT SYSTEM - CONSOLIDATED MIGRATIONS
-- =====================================================
-- This script consolidates all Production Management System migrations
-- that need to be applied to the staging/production database.
--
-- Run this script using:
-- supabase db execute --file deploy-production-management-migrations.sql
--
-- Or copy/paste into Supabase SQL Editor
-- =====================================================

-- Start transaction
BEGIN;

-- =====================================================
-- MIGRATION 1: Schedule Character Choice Reminders Cron
-- =====================================================

-- Unschedule existing job (if any)
DO $
BEGIN
  PERFORM cron.unschedule('send-character-choice-reminders');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $;

-- Schedule the job
DO $
BEGIN
  PERFORM cron.schedule(
    'send-character-choice-reminders',
    '0 9 * * *',
    $
    SELECT net.http_post(
      url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-send-character-choice-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
    $
  );
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'Could not schedule reminders job: %', SQLERRM;
END $;

-- =====================================================
-- MIGRATION 2: Schedule Character Choice Expiration Cron
-- =====================================================

-- Unschedule existing job (if any)
DO $
BEGIN
  PERFORM cron.unschedule('expire-character-choices');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $;

-- Schedule the job
DO $
BEGIN
  PERFORM cron.schedule(
    'expire-character-choices',
    '0 * * * *',
    $
    SELECT net.http_post(
      url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-expire-character-choices',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
    $
  );
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'Could not schedule expiration job: %', SQLERRM;
END $;

-- =====================================================
-- MIGRATION 3: Add Expired Status to Character Choices
-- =====================================================

-- Drop existing constraint
ALTER TABLE character_choices 
  DROP CONSTRAINT IF EXISTS character_choices_status_check;

-- Add new constraint with 'expired' status
ALTER TABLE character_choices
  ADD CONSTRAINT character_choices_status_check 
  CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'locked', 'expired'));

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify cron jobs
SELECT 
  'Cron Jobs' as check_type,
  COUNT(*) as count,
  string_agg(jobname, ', ') as jobs
FROM cron.job 
WHERE jobname IN ('send-character-choice-reminders', 'expire-character-choices');

-- Verify constraint
SELECT 
  'Character Choices Constraint' as check_type,
  COUNT(*) as count
FROM pg_constraint 
WHERE conname = 'character_choices_status_check'
  AND pg_get_constraintdef(oid) LIKE '%expired%';

-- Commit transaction
COMMIT;

-- =====================================================
-- SUMMARY
-- =====================================================

SELECT 
  'Production Management System Migrations' as title,
  'Applied successfully' as status,
  NOW() as executed_at;
