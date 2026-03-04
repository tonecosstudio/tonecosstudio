# Staging Deployment Execution Guide

## Quick Start

This guide provides the exact commands you need to run to deploy the Production Management System to staging.

**Estimated Time:** 30-45 minutes

---

## Prerequisites Check

Before starting, verify you have:

```bash
# 1. Check Supabase CLI
supabase --version
# If not installed: npm install -g supabase

# 2. Check Node.js
node --version
# Required: v18 or higher

# 3. Check npm
npm --version

# 4. Verify you're in the project root
pwd
# Should show your project directory

# 5. Check if .env file exists
ls -la .env
# If not, copy from template: cp .env.example .env
```

---

## Step 1: Database Migrations (10 minutes)

### 1.1 Create Backup

```bash
# Create backup directory
mkdir -p backups

# Backup current database
supabase db dump -f backups/staging-backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup was created
ls -lh backups/
```

### 1.2 Link to Supabase Project

```bash
# Link to your staging project
supabase link --project-ref YOUR_STAGING_PROJECT_REF

# Verify connection
supabase db diff
```

### 1.3 Apply Migrations

```bash
# Option A: Use the apply-migrations script (recommended)
bash .kiro/specs/production-management-system/scripts/apply-migrations.sh staging

# Option B: Use Supabase CLI directly
supabase db push

# Verify migrations were applied
supabase db diff --schema public
# Should show "No schema changes detected"
```

### 1.4 Verify Database Setup

```bash
# Run verification queries
supabase db execute -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'production_queue',
    'character_choices',
    'production_stages',
    'stage_transition_logs',
    'production_assignment_logs',
    'production_photo_metadata'
  );
"
# Expected: 6 rows

# Check cron jobs
supabase db execute -c "
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE '%character_choice%';
"
# Expected: 2 rows (reminders and expiration)
```

---

## Step 2: Configure Realtime (5 minutes)

### 2.1 Enable Realtime for Tables

```bash
# Apply Realtime configuration
supabase db execute -f .kiro/specs/production-management-system/scripts/configure-realtime.sql

# Verify Realtime is enabled
supabase db execute -c "
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('production_queue', 'character_choices', 'production_stages');
"
# Expected: 3 rows
```

---

## Step 3: Setup Storage (5 minutes)

### 3.1 Create Storage Bucket

```bash
# Apply storage configuration
supabase db execute -f .kiro/specs/production-management-system/scripts/setup-storage.sql

# Verify bucket was created
supabase db execute -c "
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'production-photos';
"
# Expected: 1 row
```

---

## Step 4: Deploy Edge Functions (10 minutes)

### 4.1 Deploy Character Choice Reminder Function

```bash
# Deploy the function
supabase functions deploy cron-send-character-choice-reminders

# Verify deployment
supabase functions list
# Should show: cron-send-character-choice-reminders
```

### 4.2 Deploy Character Choice Expiration Function

```bash
# Deploy the function
supabase functions deploy cron-expire-character-choices

# Verify deployment
supabase functions list
# Should show: cron-expire-character-choices
```

### 4.3 Set Function Secrets

```bash
# Set email service credentials
supabase secrets set SMTP_HOST=your-smtp-host
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=your-smtp-username
supabase secrets set SMTP_PASSWORD=your-smtp-password

# Set Supabase service role key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Verify secrets are set
supabase secrets list
```

### 4.4 Test Edge Functions

```bash
# Test character choice reminder function
supabase functions invoke cron-send-character-choice-reminders --method POST --body '{}'

# Check logs
supabase functions logs cron-send-character-choice-reminders --tail

# Test character choice expiration function
supabase functions invoke cron-expire-character-choices --method POST --body '{}'

# Check logs
supabase functions logs cron-expire-character-choices --tail
```

---

## Step 5: Build and Deploy Frontend (10 minutes)

### 5.1 Install Dependencies

```bash
# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

### 5.2 Run Type Check

```bash
# Run TypeScript type checking
npm run type-check

# If errors, fix them before proceeding
```

### 5.3 Build Application

```bash
# Build for production
npm run build

# Verify build output
ls -lh dist/
# Should show dist/ directory with built files
```

### 5.4 Deploy to Hosting Platform

**Option A: Vercel**

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to staging
vercel --prod

# Note the deployment URL
```

**Option B: Netlify**

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to staging
netlify deploy --prod --dir=dist

# Note the deployment URL
```

**Option C: Manual Upload**

```bash
# If using manual upload, zip the dist folder
cd dist
zip -r ../staging-build-$(date +%Y%m%d-%H%M%S).zip .
cd ..

# Upload the zip file to your hosting platform
```

---

## Step 6: Verify Deployment (15 minutes)

### 6.1 Database Verification

```bash
# Run comprehensive database check
supabase db execute -c "
-- Check table counts
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
"

# Check indexes
supabase db execute -c "
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('production_queue', 'character_choices', 'production_stages')
ORDER BY tablename, indexname;
"

# Check RLS policies
supabase db execute -c "
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('production_queue', 'character_choices', 'production_stages')
ORDER BY tablename, policyname;
"
```

### 6.2 Frontend Verification

Open your staging URL and verify:

1. **Dashboard Access:**
   - Navigate to `/admin/production`
   - [ ] Dashboard loads in < 2 seconds
   - [ ] Production queue displays
   - [ ] Filters work
   - [ ] No console errors

2. **Character Choice:**
   - Navigate to `/admin/character-choices`
   - [ ] Pending choices display
   - [ ] Approval/rejection works
   - [ ] No console errors

3. **Customer View:**
   - Navigate to `/orders/:orderId` (use a test order ID)
   - [ ] Progress timeline displays
   - [ ] Character selection works (if applicable)
   - [ ] No console errors

4. **Realtime Updates:**
   - Open dashboard in two browser windows
   - Update an item in one window
   - [ ] Update appears in second window within 5 seconds

### 6.3 Integration Verification

```bash
# Test email service
node .kiro/specs/production-management-system/scripts/test-email-service.js your-email@example.com

# Check email delivery
# You should receive a test email within 1-2 minutes
```

---

## Step 7: Run Staging Tests (30 minutes)

Follow the comprehensive testing guide:

```bash
# Open the testing guide
cat .kiro/specs/production-management-system/STAGING_TESTING_GUIDE.md

# Or open in your editor
code .kiro/specs/production-management-system/STAGING_TESTING_GUIDE.md
```

Complete all sections of the testing guide:
- [ ] Database Verification
- [ ] Realtime Configuration
- [ ] Storage Configuration
- [ ] Production Dashboard Testing
- [ ] Character Choice Management
- [ ] Production Stage Tracking
- [ ] Customer Progress View
- [ ] Integration Testing
- [ ] Performance Testing
- [ ] Email Service Testing

---

## Step 8: Generate Deployment Report

```bash
# Create deployment report
cat > deployment-report-staging-$(date +%Y%m%d-%H%M%S).md << 'EOF'
# Staging Deployment Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Environment:** Staging
**Deployed By:** $(whoami)
**Deployment URL:** [Your staging URL]

## Deployment Summary

### Database
- [x] Migrations applied successfully
- [x] Tables created: production_queue, character_choices, production_stages
- [x] Indexes created
- [x] RLS policies configured
- [x] Cron jobs scheduled

### Supabase Configuration
- [x] Realtime enabled for production tables
- [x] Storage bucket created: production-photos
- [x] Edge Functions deployed: 2 functions

### Frontend
- [x] Build successful
- [x] Deployed to: [Platform name]
- [x] Environment variables configured

### Testing
- [ ] Database verification: Pass/Fail
- [ ] Frontend verification: Pass/Fail
- [ ] Integration verification: Pass/Fail
- [ ] Performance verification: Pass/Fail

## Issues Encountered

[List any issues and how they were resolved]

## Next Steps

1. Complete comprehensive testing using STAGING_TESTING_GUIDE.md
2. Document any issues found
3. Fix critical issues before production deployment
4. Schedule production deployment

## Sign-Off

- [ ] All features tested and working
- [ ] Performance acceptable
- [ ] No critical issues found
- [ ] Ready for production deployment

**Signed:** _________________ **Date:** _________
EOF

# View the report
cat deployment-report-staging-*.md
```

---

## Troubleshooting

### Issue: Supabase CLI not connected

```bash
# Re-link to project
supabase link --project-ref YOUR_PROJECT_REF

# Verify connection
supabase projects list
```

### Issue: Migration fails

```bash
# Check migration status
supabase db diff

# View migration history
supabase migration list

# If needed, rollback and retry
supabase db reset
supabase db push
```

### Issue: Edge Function deployment fails

```bash
# Check function logs
supabase functions logs cron-send-character-choice-reminders --tail

# Verify function exists locally
ls -la supabase/functions/

# Re-deploy with verbose output
supabase functions deploy cron-send-character-choice-reminders --debug
```

### Issue: Frontend build fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check

# Check for linting errors
npm run lint

# Try building again
npm run build
```

### Issue: Realtime not working

```bash
# Verify Realtime is enabled
supabase db execute -c "
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
"

# If missing, re-apply configuration
supabase db execute -f .kiro/specs/production-management-system/scripts/configure-realtime.sql
```

---

## Rollback Procedure

If critical issues are found:

### 1. Rollback Frontend

```bash
# Vercel
vercel rollback

# Netlify
netlify rollback
```

### 2. Rollback Database

```bash
# Restore from backup
pg_restore -h db.YOUR_PROJECT.supabase.co \
  -U postgres \
  -d postgres \
  -c \
  backups/staging-backup-YYYYMMDD-HHMMSS.dump
```

### 3. Rollback Edge Functions

```bash
# Delete deployed functions
supabase functions delete cron-send-character-choice-reminders
supabase functions delete cron-expire-character-choices
```

---

## Post-Deployment Checklist

- [ ] Database migrations applied successfully
- [ ] Realtime configured and working
- [ ] Storage bucket created and accessible
- [ ] Edge Functions deployed and tested
- [ ] Frontend built and deployed
- [ ] Environment variables configured
- [ ] All features tested manually
- [ ] Performance tests passed
- [ ] Integration tests passed
- [ ] Email notifications working
- [ ] Deployment report generated
- [ ] Team notified of deployment
- [ ] Issues documented (if any)

---

## Next Steps

1. **Complete Testing:**
   - Follow STAGING_TESTING_GUIDE.md
   - Document all test results
   - Fix any issues found

2. **Performance Monitoring:**
   - Monitor dashboard load times
   - Check database query performance
   - Verify Realtime update latency

3. **User Acceptance Testing:**
   - Invite test users to staging
   - Collect feedback
   - Document improvement suggestions

4. **Production Preparation:**
   - Review all test results
   - Fix critical issues
   - Schedule production deployment
   - Prepare production environment

---

## Support

If you encounter issues:

1. Check the DEPLOYMENT_GUIDE.md troubleshooting section
2. Review Supabase logs: `supabase logs --tail`
3. Check Edge Function logs: `supabase functions logs [function-name] --tail`
4. Review browser console for frontend errors
5. Contact the development team

---

**Last Updated:** $(date '+%Y-%m-%d')
**Version:** 1.0.0
