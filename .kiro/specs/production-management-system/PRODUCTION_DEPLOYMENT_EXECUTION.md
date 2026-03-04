# Production Deployment Execution Guide

## Overview

This document provides step-by-step instructions for executing the production deployment of the Production Management System. Follow each step carefully and verify completion before proceeding.

## Pre-Deployment Requirements

### Team Readiness
- [ ] Deployment Lead assigned and available
- [ ] Database Administrator on standby
- [ ] DevOps Engineer ready
- [ ] QA Engineer prepared for testing
- [ ] Support team briefed and monitoring

### Environment Preparation
- [ ] Staging deployment completed successfully
- [ ] All staging tests passed
- [ ] Production environment variables configured
- [ ] Database backup procedures verified
- [ ] Rollback plan documented and reviewed

### Stakeholder Communication
- [ ] Maintenance window scheduled
- [ ] Stakeholders notified (1 week advance)
- [ ] Customer notification sent
- [ ] Support team briefed
- [ ] Emergency contacts confirmed

## Deployment Steps

### Step 1: Pre-Deployment Checklist (T-30 minutes)

**Time:** 30 minutes before deployment start

**Actions:**
```bash
# 1. Team standup
# - Confirm all team members present
# - Review deployment plan
# - Confirm roles and responsibilities

# 2. Verify prerequisites
./scripts/deploy-production.sh --check-only

# 3. Verify Supabase connection
supabase projects list
supabase link --project-ref your-production-project-ref

# 4. Verify environment variables
cat .env.production | grep -v "PASSWORD\|SECRET\|KEY"

# 5. Test database connection
supabase db execute -c "SELECT version();"
```

**Verification:**
- [ ] All team members confirmed ready
- [ ] All prerequisites met
- [ ] Database connection successful
- [ ] Environment variables configured

**Go/No-Go Decision:**
- Review all checklist items
- Deployment Lead makes final decision
- Document decision in deployment log

---

### Step 2: Create Database Backup (T+0)

**Time:** 5-10 minutes

**Actions:**
```bash
# Create backup directory
mkdir -p ./backups

# Create database backup
supabase db dump -f ./backups/production-backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
ls -lh ./backups/production-backup-*.sql

# Test backup integrity (optional but recommended)
# pg_restore --list ./backups/production-backup-*.sql
```

**Verification:**
- [ ] Backup file created
- [ ] Backup file size > 0
- [ ] Backup file readable
- [ ] Backup location documented

**Critical:** Do not proceed without a successful backup!

---

### Step 3: Run Database Migrations (T+10)

**Time:** 10-15 minutes

**Actions:**
```bash
# Review migrations to be applied
ls -la supabase/migrations/

# Apply migrations using script
./scripts/apply-migrations.sh production

# Or apply manually
supabase db push

# Verify migrations applied
supabase db execute -f scripts/review-migrations.sql
```

**Verification Queries:**
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('production_queue', 'character_choices', 'production_stages');

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('production_queue', 'character_choices', 'production_stages');

-- Check triggers
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname LIKE '%production%' OR tgname LIKE '%character%';

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('production_queue', 'character_choices', 'production_stages');

-- Check cron jobs
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE '%character_choice%';
```

**Verification:**
- [ ] All migrations applied successfully
- [ ] All tables created
- [ ] All indexes created
- [ ] All triggers created
- [ ] All RLS policies created
- [ ] All cron jobs scheduled

**Rollback Trigger:** If any migration fails, restore from backup immediately

---

### Step 4: Configure Realtime (T+20)

**Time:** 5 minutes

**Actions:**
```bash
# Enable Realtime for production tables
supabase db execute -f scripts/configure-realtime.sql

# Verify Realtime configuration
supabase db execute -c "
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('production_queue', 'character_choices', 'production_stages');
"
```

**Verification:**
- [ ] Realtime enabled for production_queue
- [ ] Realtime enabled for character_choices
- [ ] Realtime enabled for production_stages

---

### Step 5: Setup Storage Bucket (T+25)

**Time:** 5 minutes

**Actions:**
```bash
# Create storage bucket
supabase db execute -f scripts/setup-storage.sql

# Verify storage bucket
supabase db execute -c "
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'production-photos';
"

# Verify RLS policies
supabase db execute -c "
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';
"
```

**Verification:**
- [ ] Storage bucket created
- [ ] Bucket is private (public = false)
- [ ] File size limit set (5MB)
- [ ] RLS policies configured

---

### Step 6: Deploy Edge Functions (T+30)

**Time:** 10 minutes

**Actions:**
```bash
# Deploy character choice reminder function
supabase functions deploy cron-send-character-choice-reminders --no-verify-jwt

# Deploy character choice expiration function
supabase functions deploy cron-expire-character-choices --no-verify-jwt

# Set Edge Function secrets
supabase secrets set SMTP_HOST=smtp.example.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=your-username
supabase secrets set SMTP_PASSWORD=your-password
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Verify secrets set
supabase secrets list

# Test Edge Functions
supabase functions invoke cron-send-character-choice-reminders --method POST --body '{}'
supabase functions invoke cron-expire-character-choices --method POST --body '{}'
```

**Verification:**
- [ ] Both Edge Functions deployed
- [ ] All secrets configured
- [ ] Test invocations successful
- [ ] No errors in function logs

---

### Step 7: Build Frontend (T+40)

**Time:** 10 minutes

**Actions:**
```bash
# Install dependencies
npm ci --production=false

# Run type check
npm run type-check

# Run linter
npm run lint

# Build for production
NODE_ENV=production npm run build

# Verify build output
ls -la dist/
du -sh dist/
```

**Verification:**
- [ ] Dependencies installed
- [ ] Type check passed
- [ ] Linting passed (or acceptable warnings)
- [ ] Build completed successfully
- [ ] dist/ directory exists and has content

---

### Step 8: Deploy Frontend (T+50)

**Time:** 10 minutes

**Actions:**

**For Vercel:**
```bash
# Deploy to production
vercel --prod --yes

# Verify deployment
vercel ls
```

**For Netlify:**
```bash
# Deploy to production
netlify deploy --prod --dir=dist

# Verify deployment
netlify status
```

**For Manual Deployment:**
- Upload dist/ contents to hosting provider
- Verify deployment URL
- Check deployment logs

**Verification:**
- [ ] Frontend deployed successfully
- [ ] Deployment URL accessible
- [ ] No deployment errors
- [ ] Environment variables set in platform

---

### Step 9: Verify Deployment (T+60)

**Time:** 20 minutes

#### 9.1 Database Verification

```sql
-- Verify data integrity
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

-- Verify cron jobs are active
SELECT 
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
WHERE jobname LIKE '%character_choice%';

-- Check recent cron job runs
SELECT 
  j.jobname,
  d.start_time,
  d.end_time,
  d.status
FROM cron.job j
LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
WHERE j.jobname LIKE '%character_choice%'
ORDER BY d.start_time DESC
LIMIT 5;
```

**Verification:**
- [ ] All tables accessible
- [ ] Cron jobs active
- [ ] No errors in recent runs

#### 9.2 Frontend Verification

**Manual Testing Checklist:**

1. **Dashboard Access:**
   - [ ] Navigate to /admin/production
   - [ ] Dashboard loads in < 2 seconds
   - [ ] Production queue displays
   - [ ] Filters work correctly

2. **Character Selection:**
   - [ ] Customer can view character selection modal
   - [ ] Characters display with images
   - [ ] Selection submits successfully
   - [ ] Confirmation message appears

3. **Stage Transitions:**
   - [ ] Admin can transition stages
   - [ ] Stage history displays
   - [ ] Notes and photos can be added
   - [ ] Validation works correctly

4. **Realtime Updates:**
   - [ ] Open dashboard in two browsers
   - [ ] Update item in one browser
   - [ ] Verify update appears in second browser within 5 seconds

5. **Photo Upload:**
   - [ ] Admin can upload photos
   - [ ] Photos display in gallery
   - [ ] Customer can view allowed photos
   - [ ] Upload size limits enforced

6. **Email Notifications:**
   - [ ] Test character choice reminder
   - [ ] Test stage update notification
   - [ ] Verify email delivery
   - [ ] Check email content and formatting

#### 9.3 Integration Verification

```sql
-- Verify integration with orders system
SELECT 
  pq.id,
  pq.order_id,
  pq.order_type,
  pq.production_status,
  CASE 
    WHEN pq.order_type = 'subscription_delivery' THEN 
      (SELECT status FROM subscription_deliveries WHERE id = pq.order_id)
    WHEN pq.order_type = 'standalone_purchase' THEN 
      (SELECT status FROM standalone_purchases WHERE id = pq.order_id)
  END as order_status
FROM production_queue pq
LIMIT 10;
```

**Verification:**
- [ ] Production queue syncs with orders
- [ ] Status updates propagate correctly
- [ ] No data inconsistencies

#### 9.4 Performance Verification

```bash
# Test dashboard load time
curl -w "@curl-format.txt" -o /dev/null -s "https://your-domain.com/admin/production"

# Expected: < 2 seconds

# Test API response time
curl -w "@curl-format.txt" -o /dev/null -s "https://your-domain.com/api/production/queue"

# Expected: < 500ms
```

**Verification:**
- [ ] Dashboard loads in < 2 seconds
- [ ] API responds in < 500ms
- [ ] No performance degradation
- [ ] Realtime latency < 5 seconds

---

### Step 10: Monitor for Errors (T+80)

**Time:** Ongoing (minimum 2 hours)

**Monitoring Commands:**

```bash
# Monitor database logs
supabase db logs --tail

# Monitor Edge Function logs
supabase functions logs cron-send-character-choice-reminders --tail
supabase functions logs cron-expire-character-choices --tail

# Check error rates
# Monitor application logs in deployment platform

# Check email delivery
# Monitor email service dashboard
```

**Key Metrics to Watch:**

1. **Error Rate:**
   - Target: < 1%
   - Alert: > 5%
   - Critical: > 10%

2. **Response Time:**
   - Target: < 500ms
   - Alert: > 2 seconds
   - Critical: > 5 seconds

3. **Email Delivery:**
   - Target: > 98%
   - Alert: < 95%
   - Critical: < 90%

4. **Realtime Latency:**
   - Target: < 2 seconds
   - Alert: > 5 seconds
   - Critical: > 10 seconds

**Verification:**
- [ ] No critical errors in logs
- [ ] Error rate within acceptable range
- [ ] Response times acceptable
- [ ] Email delivery successful
- [ ] Realtime updates working

---

## Post-Deployment Activities

### Immediate (0-2 hours)

**Actions:**
- [ ] Send deployment completion notification
- [ ] Continue monitoring error rates
- [ ] Respond to any user reports
- [ ] Document any issues encountered
- [ ] Update deployment report

**Notification Template:**
```
Subject: Production Management System - Deployment Complete

Team,

The Production Management System has been successfully deployed to production.

Deployment Time: [TIME]
Status: Successful
Downtime: None

New Features Available:
✓ Production dashboard at /admin/production
✓ Character selection for customers
✓ Real-time order tracking
✓ Production stage management

Monitoring:
- All systems operational
- No critical errors detected
- Performance within acceptable range

Next Steps:
- Continue monitoring for 24 hours
- Training sessions scheduled for [DATE]
- User guides available in documentation

Please report any issues to: [SUPPORT EMAIL]

Thank you,
[DEPLOYMENT LEAD]
```

### Short-term (2-24 hours)

**Actions:**
- [ ] Continuous monitoring
- [ ] Review error logs every 2 hours
- [ ] Check email delivery rates
- [ ] Monitor support tickets
- [ ] Respond to user feedback
- [ ] Create bug fix tickets for any issues

**Monitoring Schedule:**
- Hour 2: Check all metrics
- Hour 4: Check all metrics
- Hour 8: Check all metrics
- Hour 12: Check all metrics
- Hour 24: Full system review

### Medium-term (1-7 days)

**Actions:**
- [ ] Analyze performance metrics
- [ ] Review user feedback
- [ ] Optimize slow queries
- [ ] Address minor issues
- [ ] Conduct team retrospective
- [ ] Update documentation
- [ ] Plan improvements

## Rollback Procedures

### When to Rollback

**Immediate Rollback Triggers:**
- Database corruption detected
- Data loss occurring
- System completely unavailable
- Security breach detected
- Critical functionality broken

**Monitored Issues (May trigger rollback):**
- Error rate > 10%
- Response time > 10 seconds
- Email delivery < 90%
- User complaints > 20 in first hour

### Rollback Steps

**1. Announce Rollback:**
```bash
# Notify team immediately
# Post status update
# Prepare rollback commands
```

**2. Rollback Frontend:**
```bash
# Vercel
vercel rollback

# Netlify
netlify rollback

# Manual: Redeploy previous version
```

**3. Rollback Database:**
```bash
# Restore from backup
BACKUP_FILE=$(cat ./backups/latest-production-backup.txt)
pg_restore -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -c \
  $BACKUP_FILE
```

**4. Rollback Edge Functions:**
```bash
# Delete deployed functions
supabase functions delete cron-send-character-choice-reminders
supabase functions delete cron-expire-character-choices
```

**5. Verify Rollback:**
```bash
# Check system status
# Verify functionality restored
# Monitor error rates
# Confirm with team
```

**6. Post-Rollback:**
```bash
# Notify stakeholders
# Document issues encountered
# Plan corrective actions
# Schedule new deployment
```

## Success Criteria

Deployment is considered successful when:

- [ ] All migrations applied successfully
- [ ] All features accessible and working
- [ ] No critical errors in logs
- [ ] Performance within acceptable range (< 2s dashboard load)
- [ ] Email notifications working (> 95% delivery)
- [ ] Realtime updates working (< 5s latency)
- [ ] Integration tests passing
- [ ] User feedback positive
- [ ] Support tickets minimal (< 5 in first 24 hours)
- [ ] Team sign-off completed

## Deployment Report Template

After deployment, complete the deployment report:

```markdown
# Production Deployment Report

**Date:** [DATE]
**Time:** [START TIME] - [END TIME]
**Duration:** [DURATION]
**Deployed By:** [NAME]

## Summary
- Status: [Success/Partial/Failed]
- Downtime: [DURATION or "None"]
- Issues Encountered: [COUNT]

## Metrics
- Dashboard Load Time: [TIME]
- API Response Time: [TIME]
- Error Rate: [PERCENTAGE]
- Email Delivery: [PERCENTAGE]

## Issues
1. [Issue description and resolution]
2. [Issue description and resolution]

## Lessons Learned
- What went well: [LIST]
- What could be improved: [LIST]
- Action items: [LIST]

## Sign-Off
- Deployment Lead: [NAME] - [DATE]
- Database Admin: [NAME] - [DATE]
- QA Engineer: [NAME] - [DATE]
```

## Emergency Contacts

### Internal Team
- **Deployment Lead:** [NAME] - [PHONE] - [EMAIL]
- **Database Admin:** [NAME] - [PHONE] - [EMAIL]
- **DevOps Engineer:** [NAME] - [PHONE] - [EMAIL]
- **QA Engineer:** [NAME] - [PHONE] - [EMAIL]
- **Support Lead:** [NAME] - [PHONE] - [EMAIL]

### External Contacts
- **Supabase Support:** support@supabase.com
- **Hosting Provider:** [CONTACT]
- **Email Provider:** [CONTACT]

---

**Document Version:** 1.0.0
**Last Updated:** 2024-01-01
**Next Review:** After production deployment
