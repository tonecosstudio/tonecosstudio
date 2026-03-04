# Production Deployment Verification Checklist

## Overview

This checklist ensures all aspects of the Production Management System are verified after deployment to production. Complete each section before signing off on the deployment.

---

## Pre-Deployment Verification

### Environment Preparation
- [ ] Production environment variables configured
- [ ] .env.production file created and validated
- [ ] Supabase project linked (production)
- [ ] Database backup created and verified
- [ ] Rollback plan documented
- [ ] Team members assigned and ready
- [ ] Stakeholders notified
- [ ] Maintenance window scheduled

### Staging Verification
- [ ] Staging deployment completed successfully
- [ ] All staging tests passed
- [ ] Performance tests passed in staging
- [ ] User acceptance testing completed
- [ ] No critical issues in staging

---

## Database Verification

### Tables
- [ ] production_queue table exists
- [ ] character_choices table exists
- [ ] production_stages table exists
- [ ] All columns have correct data types
- [ ] All foreign keys configured
- [ ] All constraints active

**Verification Query:**
```sql
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('production_queue', 'character_choices', 'production_stages')
ORDER BY table_name, ordinal_position;
```

### Indexes
- [ ] idx_production_queue_priority exists
- [ ] idx_production_queue_status exists
- [ ] idx_production_queue_deadline exists
- [ ] idx_character_choices_deadline exists
- [ ] idx_character_choices_status exists
- [ ] idx_production_stages_queue_id exists
- [ ] All indexes are valid and not corrupted

**Verification Query:**
```sql
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('production_queue', 'character_choices', 'production_stages')
ORDER BY tablename, indexname;
```

### Triggers
- [ ] auto_populate_production_queue trigger exists
- [ ] sync_character_choice_to_production_queue trigger exists
- [ ] sync_production_status_to_orders trigger exists
- [ ] updated_at triggers exist on all tables
- [ ] All triggers are enabled

**Verification Query:**
```sql
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname LIKE '%production%' OR tgname LIKE '%character%'
ORDER BY tgrelid::regclass, tgname;
```

### RLS Policies
- [ ] production_queue policies configured
- [ ] character_choices policies configured
- [ ] production_stages policies configured
- [ ] Admin access policies working
- [ ] Customer access policies working
- [ ] Anonymous access blocked

**Verification Query:**
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('production_queue', 'character_choices', 'production_stages')
ORDER BY tablename, policyname;
```

### Functions
- [ ] calculate_priority_score function exists
- [ ] get_production_metrics function exists
- [ ] check_character_availability function exists
- [ ] send_character_choice_reminders function exists
- [ ] expire_character_choices function exists
- [ ] All functions return expected results

**Verification Query:**
```sql
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname LIKE '%production%' OR proname LIKE '%character%'
ORDER BY proname;
```

### Cron Jobs
- [ ] send_character_choice_reminders job scheduled
- [ ] expire_character_choices job scheduled
- [ ] Both jobs are active
- [ ] Schedules are correct (daily at 9 AM and 10 AM)
- [ ] Jobs have executed successfully at least once

**Verification Query:**
```sql
SELECT 
  jobname,
  schedule,
  command,
  nodename,
  active
FROM cron.job
WHERE jobname LIKE '%character_choice%';

-- Check recent runs
SELECT 
  j.jobname,
  d.start_time,
  d.end_time,
  d.status,
  d.return_message
FROM cron.job j
LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
WHERE j.jobname LIKE '%character_choice%'
ORDER BY d.start_time DESC
LIMIT 10;
```

### Views
- [ ] production_queue_with_details view exists
- [ ] pending_choices_with_countdown view exists
- [ ] production_metrics view exists
- [ ] All views return data correctly

**Verification Query:**
```sql
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE viewname LIKE '%production%' OR viewname LIKE '%character%'
ORDER BY viewname;
```

---

## Realtime Configuration Verification

### Publication
- [ ] supabase_realtime publication exists
- [ ] production_queue added to publication
- [ ] character_choices added to publication
- [ ] production_stages added to publication

**Verification Query:**
```sql
SELECT 
  pubname,
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('production_queue', 'character_choices', 'production_stages');
```

### Realtime Functionality
- [ ] Dashboard updates in real-time (< 5 seconds)
- [ ] Multiple users can see updates simultaneously
- [ ] No connection errors in browser console
- [ ] Reconnection works after network interruption

**Manual Test:**
1. Open dashboard in Browser A
2. Open dashboard in Browser B
3. Update a production item in Browser A
4. Verify update appears in Browser B within 5 seconds
5. Disconnect network, reconnect, verify updates resume

---

## Storage Configuration Verification

### Bucket
- [ ] production-photos bucket exists
- [ ] Bucket is private (not public)
- [ ] File size limit set to 5MB
- [ ] Allowed MIME types configured (jpeg, png, webp)

**Verification Query:**
```sql
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'production-photos';
```

### RLS Policies
- [ ] Admin upload policy exists
- [ ] Admin view policy exists
- [ ] Customer view policy exists (own orders only)
- [ ] Anonymous access blocked

**Verification Query:**
```sql
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';
```

### Storage Functionality
- [ ] Admin can upload photos
- [ ] Photos display in gallery
- [ ] Customer can view their order photos
- [ ] Customer cannot view other orders' photos
- [ ] File size limits enforced
- [ ] MIME type restrictions enforced

**Manual Test:**
1. Login as admin
2. Upload a photo to a production item
3. Verify photo appears in gallery
4. Login as customer (order owner)
5. Verify customer can see the photo
6. Login as different customer
7. Verify they cannot see the photo

---

## Edge Functions Verification

### Deployment
- [ ] cron-send-character-choice-reminders deployed
- [ ] cron-expire-character-choices deployed
- [ ] Both functions show as active
- [ ] Function logs accessible

**Verification Command:**
```bash
supabase functions list
```

### Secrets
- [ ] SMTP_HOST secret set
- [ ] SMTP_PORT secret set
- [ ] SMTP_USER secret set
- [ ] SMTP_PASSWORD secret set
- [ ] SUPABASE_SERVICE_ROLE_KEY secret set

**Verification Command:**
```bash
supabase secrets list
```

### Functionality
- [ ] Reminder function can be invoked manually
- [ ] Expiration function can be invoked manually
- [ ] Functions execute without errors
- [ ] Functions complete in reasonable time (< 30 seconds)

**Test Commands:**
```bash
# Test reminder function
supabase functions invoke cron-send-character-choice-reminders \
  --method POST \
  --body '{}'

# Test expiration function
supabase functions invoke cron-expire-character-choices \
  --method POST \
  --body '{}'

# Check logs
supabase functions logs cron-send-character-choice-reminders --limit 10
supabase functions logs cron-expire-character-choices --limit 10
```

---

## Frontend Verification

### Build
- [ ] Frontend built successfully
- [ ] No build errors
- [ ] No critical TypeScript errors
- [ ] Build size reasonable (< 5MB)
- [ ] dist/ directory contains all assets

**Verification Command:**
```bash
npm run build
ls -lh dist/
```

### Deployment
- [ ] Frontend deployed to production
- [ ] Deployment URL accessible
- [ ] No deployment errors
- [ ] Environment variables set in platform
- [ ] HTTPS enabled
- [ ] Custom domain configured (if applicable)

**Verification:**
- Visit: https://your-domain.com
- Check: HTTPS certificate valid
- Check: No console errors

### Pages
- [ ] Home page loads
- [ ] Admin dashboard accessible (/admin/production)
- [ ] Character choice page accessible
- [ ] Customer order view accessible
- [ ] All routes working
- [ ] 404 page displays for invalid routes

### Components
- [ ] Production dashboard displays
- [ ] Kanban view works
- [ ] List view works
- [ ] Calendar view works
- [ ] Filters work correctly
- [ ] Search functionality works
- [ ] Character selection modal opens
- [ ] Stage transition modal works
- [ ] Photo upload works
- [ ] Assignment modal works

---

## Integration Verification

### Orders System
- [ ] Production queue auto-populates from orders
- [ ] Status updates sync to orders
- [ ] Order detail shows production status
- [ ] No duplicate entries
- [ ] No orphaned records

**Verification Query:**
```sql
-- Check integration
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

-- Check for orphaned records
SELECT COUNT(*) as orphaned_count
FROM production_queue pq
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_deliveries sd WHERE sd.id = pq.order_id AND pq.order_type = 'subscription_delivery'
  UNION
  SELECT 1 FROM standalone_purchases sp WHERE sp.id = pq.order_id AND pq.order_type = 'standalone_purchase'
);
```

### Collections & Characters
- [ ] Character choices limited to collection characters
- [ ] Character availability checked
- [ ] Character images display
- [ ] Collection metadata accessible

**Verification Query:**
```sql
-- Check character choices are valid
SELECT 
  cc.id,
  cc.collection_id,
  cc.character_id,
  c.name as character_name,
  col.name as collection_name
FROM character_choices cc
LEFT JOIN collection_characters c ON c.id = cc.character_id
LEFT JOIN collections col ON col.id = cc.collection_id
WHERE cc.character_id IS NOT NULL
LIMIT 10;
```

### Notification System
- [ ] Email notifications sent on stage changes
- [ ] Character choice reminders sent
- [ ] Expiration notices sent
- [ ] Email templates render correctly
- [ ] Unsubscribe links work

**Manual Test:**
1. Update a production stage
2. Verify customer receives email
3. Check email content and formatting
4. Test unsubscribe link

---

## Performance Verification

### Dashboard Load Time
- [ ] Dashboard loads in < 2 seconds (empty)
- [ ] Dashboard loads in < 2 seconds (100 items)
- [ ] Dashboard loads in < 3 seconds (1000 items)

**Test Command:**
```bash
curl -w "@curl-format.txt" -o /dev/null -s "https://your-domain.com/admin/production"
```

### API Response Time
- [ ] GET /production/queue < 500ms
- [ ] POST /character-choices < 500ms
- [ ] PATCH /production/stage < 500ms
- [ ] GET /production/metrics < 200ms

**Test Commands:**
```bash
time curl -s "https://your-domain.com/api/production/queue" > /dev/null
time curl -s "https://your-domain.com/api/production/metrics" > /dev/null
```

### Database Query Performance
- [ ] Production queue query < 100ms
- [ ] Character choices query < 50ms
- [ ] Production stages query < 50ms
- [ ] No slow queries (> 1 second)

**Verification Query:**
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM production_queue
ORDER BY priority_score DESC
LIMIT 50;

-- Check for slow queries
SELECT 
  query,
  calls,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;
```

### Realtime Latency
- [ ] Updates appear in < 2 seconds
- [ ] Updates appear in < 5 seconds under load
- [ ] No connection drops
- [ ] Reconnection works smoothly

---

## Security Verification

### Authentication
- [ ] Admin routes require authentication
- [ ] Customer routes require authentication
- [ ] Anonymous access blocked to sensitive data
- [ ] Session management working
- [ ] Logout works correctly

### Authorization
- [ ] Admins can access all production data
- [ ] Customers can only access their own orders
- [ ] RLS policies enforced
- [ ] API endpoints check permissions
- [ ] No unauthorized access possible

**Test:**
1. Login as customer
2. Try to access another customer's order
3. Verify access denied
4. Try to access admin dashboard
5. Verify access denied

### Data Protection
- [ ] Customer PII encrypted at rest
- [ ] HTTPS enforced
- [ ] No sensitive data in logs
- [ ] No sensitive data in error messages
- [ ] SQL injection prevented

### Audit Trail
- [ ] All stage transitions logged
- [ ] All character choice changes logged
- [ ] All assignments logged
- [ ] Logs include user ID and timestamp
- [ ] Logs are immutable

**Verification Query:**
```sql
-- Check audit logs exist
SELECT COUNT(*) FROM production_stage_transition_logs;
SELECT COUNT(*) FROM production_assignment_logs;
```

---

## Email Verification

### Configuration
- [ ] Email provider configured
- [ ] SMTP credentials valid
- [ ] Sender email verified
- [ ] Domain authentication set up (SPF, DKIM, DMARC)
- [ ] Email templates accessible

### Delivery
- [ ] Test email sent successfully
- [ ] Email received in inbox (not spam)
- [ ] Email formatting correct
- [ ] Links in email work
- [ ] Unsubscribe link works

### Templates
- [ ] Character choice reminder (first)
- [ ] Character choice reminder (second)
- [ ] Character choice reminder (final)
- [ ] Admin expiration notice
- [ ] Stage update notification
- [ ] All templates render correctly

**Test:**
```bash
node scripts/test-email-service.js your-email@example.com
```

---

## User Acceptance Verification

### Admin Users
- [ ] Can access production dashboard
- [ ] Can view production queue
- [ ] Can filter and search
- [ ] Can update production stages
- [ ] Can assign items to team members
- [ ] Can upload photos
- [ ] Can approve character choices
- [ ] Can block/unblock items

### Customer Users
- [ ] Can view order progress
- [ ] Can select character
- [ ] Can change character choice (if allowed)
- [ ] Can view estimated dates
- [ ] Can view tracking information
- [ ] Receive email notifications

### Mobile Users
- [ ] Dashboard responsive on mobile
- [ ] Customer view works on mobile
- [ ] Touch interactions work
- [ ] No horizontal scrolling
- [ ] Text readable without zooming

---

## Error Handling Verification

### Database Errors
- [ ] Connection errors handled gracefully
- [ ] Query errors logged
- [ ] User sees friendly error message
- [ ] System recovers automatically

### API Errors
- [ ] 400 errors return helpful messages
- [ ] 401 errors redirect to login
- [ ] 403 errors show access denied
- [ ] 500 errors logged and reported
- [ ] Network errors handled

### Realtime Errors
- [ ] Connection loss handled
- [ ] Reconnection automatic
- [ ] User notified of connection status
- [ ] No data loss during reconnection

### Email Errors
- [ ] Failed emails logged
- [ ] Failed emails retried
- [ ] Admin notified of failures
- [ ] User notified if critical

---

## Monitoring Verification

### Logging
- [ ] Application logs accessible
- [ ] Database logs accessible
- [ ] Edge Function logs accessible
- [ ] Error logs captured
- [ ] Logs retained for 30 days

### Alerts
- [ ] Critical alerts configured
- [ ] Warning alerts configured
- [ ] Alert channels working (email, Slack, etc.)
- [ ] Alert escalation configured
- [ ] Test alert sent successfully

### Metrics
- [ ] Uptime monitoring active
- [ ] Error rate monitoring active
- [ ] Response time monitoring active
- [ ] Database monitoring active
- [ ] Email delivery monitoring active

---

## Documentation Verification

### Technical Documentation
- [ ] Deployment guide complete
- [ ] API documentation complete
- [ ] Database schema documented
- [ ] Environment variables documented
- [ ] Rollback procedures documented

### User Documentation
- [ ] Admin user guide complete
- [ ] Customer help articles complete
- [ ] FAQ created
- [ ] Video tutorials (optional)
- [ ] Training materials prepared

### Operational Documentation
- [ ] Monitoring guide complete
- [ ] Incident response procedures documented
- [ ] Escalation contacts documented
- [ ] Maintenance procedures documented

---

## Final Sign-Off

### Deployment Lead
- [ ] All critical items verified
- [ ] No blocking issues
- [ ] Team briefed on monitoring
- [ ] Rollback plan ready
- [ ] Stakeholders notified

**Signature:** _________________ **Date:** _________

### Database Administrator
- [ ] All database items verified
- [ ] Performance acceptable
- [ ] Backup verified
- [ ] Monitoring configured

**Signature:** _________________ **Date:** _________

### DevOps Engineer
- [ ] All infrastructure items verified
- [ ] Deployment successful
- [ ] Monitoring configured
- [ ] Alerts configured

**Signature:** _________________ **Date:** _________

### QA Engineer
- [ ] All functionality tested
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] User acceptance criteria met

**Signature:** _________________ **Date:** _________

### Product Owner
- [ ] All features delivered
- [ ] Acceptance criteria met
- [ ] Ready for production use
- [ ] Approved for release

**Signature:** _________________ **Date:** _________

---

## Post-Verification Actions

After all items are verified and signed off:

1. [ ] Send deployment completion notification
2. [ ] Begin 24-hour monitoring period
3. [ ] Schedule team retrospective
4. [ ] Update project status
5. [ ] Archive deployment artifacts
6. [ ] Celebrate success! 🎉

---

**Document Version:** 1.0.0
**Last Updated:** 2024-01-01
**Deployment Date:** _________
