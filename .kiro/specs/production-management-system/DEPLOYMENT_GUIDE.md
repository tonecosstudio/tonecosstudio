# Production Management System - Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Database Migration Steps](#database-migration-steps)
5. [Supabase Configuration](#supabase-configuration)
6. [Edge Functions Deployment](#edge-functions-deployment)
7. [Frontend Deployment](#frontend-deployment)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides step-by-step instructions for deploying the Production Management System to staging and production environments. The system consists of:

- **Database**: PostgreSQL tables, functions, triggers, and cron jobs
- **Backend**: Supabase Edge Functions for automated workflows
- **Frontend**: React application with real-time features
- **Storage**: Supabase Storage for production photos

**Deployment Time Estimate**: 30-45 minutes

**Downtime Required**: None (zero-downtime deployment)

---

## Prerequisites

### Required Access

- Supabase project admin access
- Database connection credentials
- Deployment environment access (Vercel/Netlify)
- Git repository access

### Required Tools

```bash
# Install Supabase CLI
npm install -g supabase

# Verify installation
supabase --version

# Install Node.js dependencies
npm install
```

### Pre-Deployment Checklist

- [ ] Backup current database
- [ ] Review all migration files
- [ ] Test migrations in staging environment
- [ ] Verify environment variables are configured
- [ ] Notify team of deployment window
- [ ] Prepare rollback plan

---

## Environment Variables

### Required Environment Variables

Add the following variables to your `.env` file (or deployment platform):

```bash
# ============================================================================
# SUPABASE CONFIGURATION
# ============================================================================

# Supabase Project URL and Keys
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"

# Service Role Key (Backend only - NEVER expose to frontend)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# ============================================================================
# PRODUCTION MANAGEMENT SYSTEM
# ============================================================================

# Character Choice Deadlines
VITE_CHARACTER_CHOICE_DEADLINE_DAYS=7
VITE_CHARACTER_CHOICE_REMINDER_DAYS_1=5
VITE_CHARACTER_CHOICE_REMINDER_DAYS_2=2
VITE_CHARACTER_CHOICE_REMINDER_DAYS_3=1

# Production Stage Estimated Durations (hours)
VITE_STAGE_AWAITING_CHOICE_HOURS=168  # 7 days
VITE_STAGE_DESIGN_HOURS=48            # 2 days
VITE_STAGE_PRODUCTION_HOURS=120       # 5 days
VITE_STAGE_QUALITY_CHECK_HOURS=24     # 1 day
VITE_STAGE_PACKAGING_HOURS=12         # 12 hours
VITE_STAGE_SHIPPED_HOURS=0            # Instant

# Priority Scoring Weights (must sum to 100)
VITE_PRIORITY_ORDER_TYPE_WEIGHT=40
VITE_PRIORITY_DEADLINE_WEIGHT=40
VITE_PRIORITY_AGE_WEIGHT=20

# Photo Upload Configuration
VITE_MAX_PHOTOS_PER_STAGE=5
VITE_MAX_PHOTO_SIZE_MB=5
VITE_ALLOWED_PHOTO_TYPES="image/jpeg,image/png,image/webp"

# ============================================================================
# EMAIL CONFIGURATION
# ============================================================================

# Email Provider Settings
VITE_EMAIL_PROVIDER="smtp"
VITE_EMAIL_FROM="noreply@ordax.com.br"
VITE_EMAIL_FROM_NAME="ORDAX Production"

# SMTP Configuration (if using SMTP)
VITE_SMTP_HOST="smtp.example.com"
VITE_SMTP_PORT=587
VITE_SMTP_USER="your-smtp-username"
VITE_SMTP_PASSWORD="your-smtp-password"
VITE_SMTP_SECURE=false

# ============================================================================
# REALTIME CONFIGURATION
# ============================================================================

# Supabase Realtime channels
VITE_REALTIME_PRODUCTION_QUEUE_CHANNEL="production_queue_changes"
VITE_REALTIME_CHARACTER_CHOICES_CHANNEL="character_choices_changes"
VITE_REALTIME_PRODUCTION_STAGES_CHANNEL="production_stages_changes"

# Polling intervals (ms) - fallback if Realtime fails
VITE_DASHBOARD_POLLING_INTERVAL=30000
VITE_CUSTOMER_VIEW_POLLING_INTERVAL=60000

# ============================================================================
# STORAGE CONFIGURATION
# ============================================================================

# Supabase Storage bucket for production photos
VITE_PRODUCTION_PHOTOS_BUCKET="production-photos"
```

### Environment-Specific Variables

**Staging Environment:**
```bash
VITE_SUPABASE_URL="https://staging-project.supabase.co"
VITE_ENVIRONMENT="staging"
VITE_ENABLE_DEBUG_LOGS=true
```

**Production Environment:**
```bash
VITE_SUPABASE_URL="https://production-project.supabase.co"
VITE_ENVIRONMENT="production"
VITE_ENABLE_DEBUG_LOGS=false
```

### Verifying Environment Variables

```bash
# Check if all required variables are set
npm run check-env

# Or manually verify
node -e "console.log(process.env.VITE_SUPABASE_URL)"
```

---

## Database Migration Steps

### Step 1: Backup Current Database

**CRITICAL: Always backup before running migrations!**

```bash
# Using Supabase CLI
supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql

# Or using pg_dump directly
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup-$(date +%Y%m%d-%H%M%S).dump
```

### Step 2: Review Migration Files

The Production Management System requires the following migrations in order:

```bash
# Core tables
20260428000000_create_production_queue.sql
20260428000001_create_character_choices.sql
20260428000002_create_production_stages.sql
20260428000003_create_production_views.sql
20260428000004_create_production_functions.sql
20260428000005_add_manual_payment_support.sql

# Cron jobs and automation
20260429000000_schedule_character_choice_reminders_cron.sql
20260429000001_schedule_character_choice_expiration_cron.sql
20260429000002_add_expired_status_to_character_choices.sql

# Sync and triggers
20260429000003_sync_production_status_to_orders.sql
20260429000005_create_stage_transition_logs.sql
20260429000006_create_production_assignment_logs.sql

# Photo management
20260429000007_add_production_photo_metadata.sql

# Notification preferences
20260429000008_add_notification_preferences.sql

# Deadline calculation
20260505000000_create_deadline_calculation_function.sql

# Denormalized fields
20260506000000_add_denormalized_fields_to_character_choices.sql
```

### Step 3: Run Migrations

**Option A: Using Supabase CLI (Recommended)**

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Check migration status
supabase db diff

# Apply all pending migrations
supabase db push

# Verify migrations were applied
supabase db diff --schema public
```

**Option B: Using SQL Editor in Supabase Dashboard**

1. Navigate to Supabase Dashboard → SQL Editor
2. Run each migration file in order
3. Verify each migration completes successfully before proceeding
4. Check the migration summary output at the end of each file

**Option C: Using psql**

```bash
# Connect to database
psql "postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres"

# Run migrations in order
\i supabase/migrations/20260428000000_create_production_queue.sql
\i supabase/migrations/20260428000001_create_character_choices.sql
# ... continue with remaining migrations
```

### Step 4: Verify Migration Success

```sql
-- Check if all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'production_queue',
    'character_choices',
    'production_stages'
  );

-- Check if indexes were created
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN (
  'production_queue',
  'character_choices',
  'production_stages'
);

-- Check if triggers were created
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname LIKE '%production%' 
   OR tgname LIKE '%character%';

-- Check if RLS policies were created
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN (
  'production_queue',
  'character_choices',
  'production_stages'
);

-- Check if cron jobs were scheduled
SELECT jobname, schedule, command 
FROM cron.job 
WHERE jobname LIKE '%character_choice%';
```

### Step 5: Populate Initial Data (Optional)

If deploying to a fresh environment, you may need to populate initial data:

```sql
-- This is handled automatically by triggers when orders are created
-- No manual data population required

-- However, you can verify the auto-population trigger:
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%auto_populate%';
```

---

## Supabase Configuration

### Step 1: Enable Required Extensions

```sql
-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_trgm for fuzzy text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Step 2: Configure Realtime

Enable Realtime for production tables:

1. Navigate to Supabase Dashboard → Database → Replication
2. Enable replication for the following tables:
   - `production_queue`
   - `character_choices`
   - `production_stages`

**Or using SQL:**

```sql
-- Enable Realtime for production tables
ALTER PUBLICATION supabase_realtime ADD TABLE production_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE character_choices;
ALTER PUBLICATION supabase_realtime ADD TABLE production_stages;
```

### Step 3: Configure Storage Bucket

Create storage bucket for production photos:

**Using Supabase Dashboard:**

1. Navigate to Storage → Create Bucket
2. Bucket name: `production-photos`
3. Public: No (private bucket)
4. File size limit: 5MB
5. Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

**Using SQL:**

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'production-photos',
  'production-photos',
  false,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Create RLS policies for storage bucket
CREATE POLICY "Admins can upload production photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'production-photos'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can view production photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'production-photos'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Customers can view their order photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'production-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT order_id::text FROM production_queue
    WHERE customer_id = auth.uid()
  )
);
```

### Step 4: Configure Cron Jobs

Verify cron jobs are scheduled correctly:

```sql
-- List all cron jobs
SELECT * FROM cron.job WHERE jobname LIKE '%character_choice%';

-- Expected output:
-- jobname: send_character_choice_reminders
-- schedule: 0 9 * * * (daily at 9 AM)
-- command: SELECT send_character_choice_reminders();

-- jobname: expire_character_choices
-- schedule: 0 10 * * * (daily at 10 AM)
-- command: SELECT expire_character_choices();
```

**Manual Cron Job Creation (if needed):**

```sql
-- Schedule character choice reminders (daily at 9 AM)
SELECT cron.schedule(
  'send_character_choice_reminders',
  '0 9 * * *',
  $$SELECT send_character_choice_reminders();$$
);

-- Schedule character choice expiration (daily at 10 AM)
SELECT cron.schedule(
  'expire_character_choices',
  '0 10 * * *',
  $$SELECT expire_character_choices();$$
);
```

### Step 5: Configure Email Templates

Ensure email templates are accessible:

```bash
# Email templates are stored in:
src/services/notifications/email-templates/

# Required templates:
- character-choice-reminder-first.html
- character-choice-reminder-second.html
- character-choice-reminder-final.html
- admin-expiration-notice.html
```

Verify email service configuration in Supabase Edge Functions:

```bash
# Navigate to Edge Functions → send-email
# Ensure environment variables are set:
- EMAIL_PROVIDER
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD (if using SMTP)
- SENDGRID_API_KEY (if using SendGrid)
```

---

## Edge Functions Deployment

### Step 1: Deploy Character Choice Reminder Function

```bash
# Deploy the cron function for character choice reminders
supabase functions deploy cron-send-character-choice-reminders \
  --project-ref your-project-ref

# Verify deployment
supabase functions list
```

### Step 2: Deploy Character Choice Expiration Function

```bash
# Deploy the cron function for character choice expiration
supabase functions deploy cron-expire-character-choices \
  --project-ref your-project-ref
```

### Step 3: Set Function Secrets

```bash
# Set email service credentials
supabase secrets set SMTP_HOST=smtp.example.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=your-username
supabase secrets set SMTP_PASSWORD=your-password

# Set Supabase service role key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Verify secrets are set
supabase secrets list
```

### Step 4: Test Edge Functions

```bash
# Test character choice reminder function
supabase functions invoke cron-send-character-choice-reminders \
  --method POST \
  --body '{}'

# Test character choice expiration function
supabase functions invoke cron-expire-character-choices \
  --method POST \
  --body '{}'

# Check function logs
supabase functions logs cron-send-character-choice-reminders
supabase functions logs cron-expire-character-choices
```

---

## Frontend Deployment

### Step 1: Build Frontend Application

```bash
# Install dependencies
npm install

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build

# Verify build output
ls -la dist/
```

### Step 2: Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables in Vercel Dashboard
# Navigate to: Project Settings → Environment Variables
# Add all variables from .env.example
```

### Step 3: Deploy to Netlify (Alternative)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod --dir=dist

# Set environment variables in Netlify Dashboard
# Navigate to: Site Settings → Environment Variables
```

### Step 4: Verify Frontend Deployment

1. **Check Dashboard Access:**
   - Navigate to `/admin/production`
   - Verify production queue loads
   - Test filtering and sorting

2. **Check Customer View:**
   - Navigate to `/orders/:orderId`
   - Verify progress timeline displays
   - Test character selection (if applicable)

3. **Check Realtime Updates:**
   - Open dashboard in two browser windows
   - Update a production item in one window
   - Verify update appears in second window within 5 seconds

---

## Post-Deployment Verification

### Database Verification Checklist

```sql
-- 1. Verify tables exist and have data
SELECT 
  'production_queue' as table_name,
  COUNT(*) as row_count
FROM production_queue
UNION ALL
SELECT 
  'character_choices',
  COUNT(*)
FROM character_choices
UNION ALL
SELECT 
  'production_stages',
  COUNT(*)
FROM production_stages;

-- 2. Verify triggers are working
-- Insert a test order and verify production_queue is auto-populated
-- (This should happen automatically via existing triggers)

-- 3. Verify priority scoring
SELECT 
  id,
  order_type,
  priority,
  priority_score,
  choice_deadline
FROM production_queue
ORDER BY priority_score DESC
LIMIT 10;

-- 4. Verify stage initialization
SELECT 
  pq.id,
  pq.customer_name,
  COUNT(ps.id) as stage_count
FROM production_queue pq
LEFT JOIN production_stages ps ON ps.production_queue_id = pq.id
GROUP BY pq.id, pq.customer_name
HAVING COUNT(ps.id) != 6; -- Should be 0 rows (all items should have 6 stages)

-- 5. Verify RLS policies
SET ROLE authenticated;
SET request.jwt.claims.sub = 'test-user-id';
SELECT COUNT(*) FROM production_queue; -- Should only see own orders
RESET ROLE;

-- 6. Verify cron jobs are scheduled
SELECT 
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
WHERE jobname LIKE '%character_choice%';
```

### Frontend Verification Checklist

- [ ] Dashboard loads in < 2 seconds with 100+ items
- [ ] Kanban view displays correctly
- [ ] List view displays correctly
- [ ] Calendar view displays correctly
- [ ] Filters work correctly (collection, priority, stage)
- [ ] Search functionality works
- [ ] Character choice modal opens and displays characters
- [ ] Character selection submits successfully
- [ ] Stage transition modal works
- [ ] Photo upload works (max 5 photos, 5MB each)
- [ ] Assignment modal works
- [ ] Blocking/unblocking works
- [ ] Customer progress view displays correctly
- [ ] Real-time updates work (test with 2 browser windows)
- [ ] Email notifications are sent correctly
- [ ] Mobile responsive design works

### Performance Verification

```bash
# Run performance tests
npm run test:performance

# Expected results:
# - Dashboard load time: < 2 seconds
# - API response time: < 500ms
# - Realtime update latency: < 5 seconds
```

### Integration Verification

```sql
-- Verify integration with existing orders system
SELECT 
  pq.id,
  pq.order_id,
  pq.order_type,
  CASE 
    WHEN pq.order_type = 'subscription_delivery' THEN 
      (SELECT status FROM subscription_deliveries WHERE id = pq.order_id)
    WHEN pq.order_type = 'standalone_purchase' THEN 
      (SELECT status FROM standalone_purchases WHERE id = pq.order_id)
  END as order_status,
  pq.production_status
FROM production_queue pq
LIMIT 10;
```

---

## Rollback Procedures

### Emergency Rollback (Complete System)

If critical issues are discovered post-deployment:

**Step 1: Rollback Frontend**

```bash
# Vercel
vercel rollback

# Netlify
netlify rollback
```

**Step 2: Rollback Database Migrations**

```bash
# Restore from backup
pg_restore -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -c \
  backup-YYYYMMDD-HHMMSS.dump

# Or using Supabase CLI
supabase db reset --db-url "postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres"
```

**Step 3: Rollback Edge Functions**

```bash
# Delete deployed functions
supabase functions delete cron-send-character-choice-reminders
supabase functions delete cron-expire-character-choices
```

### Partial Rollback (Specific Components)

**Rollback Specific Migration:**

```sql
-- Disable cron jobs
SELECT cron.unschedule('send_character_choice_reminders');
SELECT cron.unschedule('expire_character_choices');

-- Drop specific tables (in reverse order)
DROP TABLE IF EXISTS production_stages CASCADE;
DROP TABLE IF EXISTS character_choices CASCADE;
DROP TABLE IF EXISTS production_queue CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_priority_score CASCADE;
DROP FUNCTION IF EXISTS sync_character_choice_to_production_queue CASCADE;
-- ... continue with other functions
```

**Rollback Realtime Configuration:**

```sql
-- Disable Realtime for production tables
ALTER PUBLICATION supabase_realtime DROP TABLE production_queue;
ALTER PUBLICATION supabase_realtime DROP TABLE character_choices;
ALTER PUBLICATION supabase_realtime DROP TABLE production_stages;
```

**Rollback Storage Bucket:**

```sql
-- Delete storage bucket (WARNING: This deletes all photos!)
DELETE FROM storage.objects WHERE bucket_id = 'production-photos';
DELETE FROM storage.buckets WHERE id = 'production-photos';
```

### Rollback Verification

After rollback, verify:

```sql
-- Check tables are removed
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('production_queue', 'character_choices', 'production_stages');
-- Should return 0 rows

-- Check cron jobs are removed
SELECT * FROM cron.job WHERE jobname LIKE '%character_choice%';
-- Should return 0 rows

-- Check Realtime is disabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('production_queue', 'character_choices', 'production_stages');
-- Should return 0 rows
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Migration Fails with Foreign Key Error

**Error:**
```
ERROR: insert or update on table "production_queue" violates foreign key constraint
```

**Solution:**
```sql
-- Check if referenced tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('subscription_deliveries', 'standalone_purchases', 'collections', 'collection_characters');

-- If missing, ensure previous migrations are applied first
```

#### Issue 2: Cron Jobs Not Running

**Error:**
```
Cron job scheduled but not executing
```

**Solution:**
```sql
-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- If not enabled:
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Check cron job status
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%character_choice%')
ORDER BY start_time DESC
LIMIT 10;

-- Manually trigger cron job to test
SELECT send_character_choice_reminders();
```

#### Issue 3: Realtime Updates Not Working

**Error:**
```
Dashboard not updating in real-time
```

**Solution:**
```sql
-- Verify Realtime is enabled for tables
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- If missing, enable Realtime:
ALTER PUBLICATION supabase_realtime ADD TABLE production_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE character_choices;
ALTER PUBLICATION supabase_realtime ADD TABLE production_stages;

-- Check Realtime connection in browser console:
-- Should see: "Realtime connection established"
```

#### Issue 4: Photo Upload Fails

**Error:**
```
Failed to upload photo: Storage bucket not found
```

**Solution:**
```sql
-- Check if storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'production-photos';

-- If missing, create bucket:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'production-photos',
  'production-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Verify RLS policies exist:
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

#### Issue 5: Email Notifications Not Sending

**Error:**
```
Email notification failed to send
```

**Solution:**
```bash
# Check Edge Function logs
supabase functions logs cron-send-character-choice-reminders --tail

# Verify email service credentials
supabase secrets list

# Test email function manually
supabase functions invoke cron-send-character-choice-reminders \
  --method POST \
  --body '{}'

# Check email delivery logs
SELECT * FROM email_delivery_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

#### Issue 6: Dashboard Performance Issues

**Error:**
```
Dashboard takes > 5 seconds to load
```

**Solution:**
```sql
-- Check if indexes exist
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'production_queue';

-- If missing, create indexes:
CREATE INDEX IF NOT EXISTS idx_production_queue_priority 
ON production_queue(priority_score DESC, choice_deadline ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_production_queue_status 
ON production_queue(production_status);

-- Analyze tables to update statistics
ANALYZE production_queue;
ANALYZE character_choices;
ANALYZE production_stages;

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM production_queue
ORDER BY priority_score DESC
LIMIT 50;
```

### Getting Help

If issues persist:

1. **Check Logs:**
   ```bash
   # Supabase logs
   supabase logs --tail
   
   # Edge Function logs
   supabase functions logs cron-send-character-choice-reminders --tail
   
   # Frontend logs (browser console)
   # Check for errors in Network tab and Console
   ```

2. **Review Documentation:**
   - [Supabase Documentation](https://supabase.com/docs)
   - [PostgreSQL Documentation](https://www.postgresql.org/docs/)
   - Project README.md

3. **Contact Support:**
   - Email: support@ordax.com.br
   - Slack: #production-system-support

---

## Deployment Checklist

Use this checklist to ensure all steps are completed:

### Pre-Deployment
- [ ] Backup current database
- [ ] Review all migration files
- [ ] Test migrations in staging
- [ ] Configure environment variables
- [ ] Notify team of deployment

### Database Deployment
- [ ] Run all migrations in order
- [ ] Verify tables created
- [ ] Verify indexes created
- [ ] Verify triggers created
- [ ] Verify RLS policies created
- [ ] Verify cron jobs scheduled

### Supabase Configuration
- [ ] Enable pg_cron extension
- [ ] Configure Realtime for tables
- [ ] Create storage bucket
- [ ] Configure storage RLS policies
- [ ] Verify cron jobs

### Edge Functions Deployment
- [ ] Deploy character choice reminder function
- [ ] Deploy character choice expiration function
- [ ] Set function secrets
- [ ] Test functions

### Frontend Deployment
- [ ] Build application
- [ ] Deploy to hosting platform
- [ ] Set environment variables
- [ ] Verify deployment

### Post-Deployment Verification
- [ ] Database verification
- [ ] Frontend verification
- [ ] Performance verification
- [ ] Integration verification
- [ ] Email notification test
- [ ] Realtime update test

### Documentation
- [ ] Update deployment log
- [ ] Document any issues encountered
- [ ] Update team on deployment status

---

## Deployment Log Template

Use this template to document each deployment:

```markdown
# Deployment Log - Production Management System

**Date:** YYYY-MM-DD
**Environment:** Staging / Production
**Deployed By:** [Name]
**Version:** [Git commit hash]

## Pre-Deployment
- Database backup: [backup file name]
- Staging test: Pass / Fail
- Team notified: Yes / No

## Deployment Steps
- Migrations applied: [list migration files]
- Edge functions deployed: [list functions]
- Frontend deployed: [deployment URL]

## Issues Encountered
- [List any issues and how they were resolved]

## Post-Deployment Verification
- Database verification: Pass / Fail
- Frontend verification: Pass / Fail
- Performance verification: Pass / Fail
- Integration verification: Pass / Fail

## Rollback Plan
- [Describe rollback plan if needed]

## Notes
- [Any additional notes or observations]
```

---

## Conclusion

This deployment guide provides comprehensive instructions for deploying the Production Management System. Follow each step carefully and verify at each stage to ensure a successful deployment.

For questions or issues, contact the development team or refer to the troubleshooting section.

**Last Updated:** 2026-04-29
**Version:** 1.0.0
