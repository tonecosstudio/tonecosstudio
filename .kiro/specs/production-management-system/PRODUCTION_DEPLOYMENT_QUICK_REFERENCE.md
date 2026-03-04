# Production Deployment - Quick Reference Guide

## Overview

This quick reference provides essential commands and procedures for production deployment. For detailed instructions, refer to the full deployment guides.

---

## Pre-Deployment

### Safety Checks
```bash
# Verify you're connected to PRODUCTION
supabase projects list
supabase link --project-ref YOUR-PRODUCTION-PROJECT-REF

# Create backup FIRST
mkdir -p ./backups
supabase db dump -f ./backups/production-backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
ls -lh ./backups/production-backup-*.sql
```

---

## Deployment Commands

### 1. Database Migrations
```bash
# Apply all migrations
./scripts/apply-migrations.sh production

# Or manually
supabase db push

# Verify
supabase db execute -c "SELECT COUNT(*) FROM production_queue;"
supabase db execute -c "SELECT COUNT(*) FROM character_choices;"
supabase db execute -c "SELECT COUNT(*) FROM production_stages;"
```

### 2. Configure Realtime
```bash
# Enable Realtime
supabase db execute -f scripts/configure-realtime.sql

# Verify
supabase db execute -c "
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('production_queue', 'character_choices', 'production_stages');
"
```

### 3. Setup Storage
```bash
# Create storage bucket
supabase db execute -f scripts/setup-storage.sql

# Verify
supabase db execute -c "SELECT id FROM storage.buckets WHERE id = 'production-photos';"
```

### 4. Deploy Edge Functions
```bash
# Deploy functions
supabase functions deploy cron-send-character-choice-reminders --no-verify-jwt
supabase functions deploy cron-expire-character-choices --no-verify-jwt

# Set secrets
supabase secrets set SMTP_HOST=smtp.example.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=your-username
supabase secrets set SMTP_PASSWORD=your-password
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key

# Verify
supabase functions list
supabase secrets list
```

### 5. Build & Deploy Frontend
```bash
# Build
npm ci --production=false
npm run type-check
npm run build

# Deploy (Vercel)
vercel --prod --yes

# Deploy (Netlify)
netlify deploy --prod --dir=dist
```

---

## Verification Commands

### Database
```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('production_queue', 'character_choices', 'production_stages');

-- Check cron jobs
SELECT jobname, schedule, active FROM cron.job 
WHERE jobname LIKE '%character_choice%';

-- Check Realtime
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Check storage
SELECT id, name FROM storage.buckets WHERE id = 'production-photos';
```

### Application
```bash
# Test dashboard load time
curl -w "@curl-format.txt" -o /dev/null -s "https://your-domain.com/admin/production"

# Test API
curl -s "https://your-domain.com/api/production/queue" | jq

# Check logs
supabase db logs --tail
supabase functions logs cron-send-character-choice-reminders --tail
```

---

## Monitoring Commands

### Real-time Monitoring
```bash
# Database logs
supabase db logs --tail | grep -i "error\|fail"

# Edge Function logs
supabase functions logs cron-send-character-choice-reminders --tail
supabase functions logs cron-expire-character-choices --tail

# Application logs (platform-specific)
vercel logs --follow
# or
netlify logs
```

### Health Checks
```sql
-- Check cron job runs
SELECT j.jobname, d.start_time, d.status, d.return_message
FROM cron.job j
LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
WHERE j.jobname LIKE '%character_choice%'
ORDER BY d.start_time DESC LIMIT 10;

-- Check error rates
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
FROM application_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at);

-- Check performance
SELECT 
  query,
  calls,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC LIMIT 10;
```

---

## Rollback Commands

### Emergency Rollback
```bash
# 1. Rollback frontend
vercel rollback
# or
netlify rollback

# 2. Restore database
BACKUP_FILE=$(cat ./backups/latest-production-backup.txt)
pg_restore -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  -c \
  $BACKUP_FILE

# 3. Delete Edge Functions
supabase functions delete cron-send-character-choice-reminders
supabase functions delete cron-expire-character-choices

# 4. Notify team
echo "ROLLBACK COMPLETED - Notify stakeholders"
```

---

## Common Issues & Solutions

### Issue: Migration Failed
```bash
# Check error
supabase db logs --tail | grep ERROR

# Rollback to backup
pg_restore -h HOST -U postgres -d postgres -c backup-file.sql

# Fix migration and retry
```

### Issue: Realtime Not Working
```sql
-- Check publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Re-enable if needed
ALTER PUBLICATION supabase_realtime ADD TABLE production_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE character_choices;
ALTER PUBLICATION supabase_realtime ADD TABLE production_stages;
```

### Issue: Cron Jobs Not Running
```sql
-- Check if active
SELECT * FROM cron.job WHERE jobname LIKE '%character_choice%';

-- Check recent runs
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%character_choice%')
ORDER BY start_time DESC LIMIT 10;

-- Manually trigger
SELECT send_character_choice_reminders();
SELECT expire_character_choices();
```

### Issue: Email Not Sending
```bash
# Check Edge Function logs
supabase functions logs cron-send-character-choice-reminders --tail

# Verify secrets
supabase secrets list

# Test manually
supabase functions invoke cron-send-character-choice-reminders \
  --method POST \
  --body '{}'
```

### Issue: Photos Not Uploading
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'production-photos';

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Recreate bucket if needed
-- (Run scripts/setup-storage.sql)
```

---

## Key Metrics Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Uptime | 99.9% | < 99.5% | < 99% |
| Error Rate | < 1% | > 5% | > 10% |
| Dashboard Load | < 2s | > 5s | > 10s |
| API Response | < 500ms | > 2s | > 5s |
| Realtime Latency | < 2s | > 5s | > 10s |
| Email Delivery | > 98% | < 95% | < 90% |

---

## Emergency Contacts

### Internal Team
- **Deployment Lead:** [NAME] - [PHONE]
- **Database Admin:** [NAME] - [PHONE]
- **DevOps Engineer:** [NAME] - [PHONE]
- **On-Call Engineer:** [NAME] - [PHONE]

### External Support
- **Supabase:** support@supabase.com
- **Hosting Provider:** [CONTACT]
- **Email Provider:** [CONTACT]

---

## Quick Links

### Documentation
- [Full Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Execution Guide](./PRODUCTION_DEPLOYMENT_EXECUTION.md)
- [Monitoring Guide](./PRODUCTION_MONITORING_GUIDE.md)
- [Verification Checklist](./PRODUCTION_VERIFICATION_CHECKLIST.md)
- [Maintenance Window Planning](./PRODUCTION_MAINTENANCE_WINDOW.md)

### Dashboards
- Supabase Dashboard: https://app.supabase.com
- Deployment Platform: [URL]
- Monitoring Dashboard: [URL]
- Error Tracking: [URL]

### Scripts
- `./scripts/deploy-production.sh` - Full deployment script
- `./scripts/apply-migrations.sh` - Database migrations
- `./scripts/configure-realtime.sql` - Realtime setup
- `./scripts/setup-storage.sql` - Storage setup
- `./scripts/test-email-service.js` - Email testing

---

## Deployment Checklist (Minimal)

### Pre-Deployment
- [ ] Backup created
- [ ] Team ready
- [ ] Stakeholders notified

### Deployment
- [ ] Migrations applied
- [ ] Realtime configured
- [ ] Storage setup
- [ ] Edge Functions deployed
- [ ] Frontend deployed

### Verification
- [ ] All tables exist
- [ ] Cron jobs active
- [ ] Realtime working
- [ ] Storage accessible
- [ ] Frontend accessible

### Post-Deployment
- [ ] Monitoring active
- [ ] No critical errors
- [ ] Team notified
- [ ] Documentation updated

---

## One-Line Deployment

**WARNING:** Only use if you understand each step!

```bash
# Full automated deployment (use with caution)
./scripts/deploy-production.sh
```

---

**Document Version:** 1.0.0
**Last Updated:** 2024-01-01
**For:** Production Management System
