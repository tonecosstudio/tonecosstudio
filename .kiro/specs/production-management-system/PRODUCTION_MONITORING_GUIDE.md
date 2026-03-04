# Production Monitoring Guide

## Overview

This guide provides comprehensive instructions for monitoring the Production Management System after deployment to production. Proper monitoring ensures early detection of issues and maintains system reliability.

## Monitoring Phases

### Phase 1: Immediate Post-Deployment (0-2 hours)
- **Frequency:** Every 15 minutes
- **Focus:** Critical errors, system availability
- **Team:** Full deployment team on standby

### Phase 2: Short-term Monitoring (2-24 hours)
- **Frequency:** Every 2 hours
- **Focus:** Error rates, performance, user feedback
- **Team:** On-call engineer + support team

### Phase 3: Medium-term Monitoring (1-7 days)
- **Frequency:** Daily
- **Focus:** Trends, optimization opportunities
- **Team:** DevOps + support team

### Phase 4: Ongoing Monitoring (7+ days)
- **Frequency:** Weekly reviews
- **Focus:** Long-term health, improvements
- **Team:** Product team

## Key Metrics to Monitor

### 1. System Availability

**Target:** 99.9% uptime

**Monitoring:**
```bash
# Check if application is responding
curl -I https://your-domain.com/admin/production

# Expected: HTTP 200 OK

# Check database connectivity
supabase db execute -c "SELECT 1;"

# Expected: 1 row returned
```

**Alerts:**
- Critical: System down for > 1 minute
- Warning: Response time > 5 seconds

---

### 2. Error Rate

**Target:** < 1% of requests

**Monitoring:**
```bash
# Check application error logs
# (Platform-specific commands)

# Vercel
vercel logs --follow

# Netlify
netlify logs

# Check database errors
supabase db logs --tail | grep ERROR

# Check Edge Function errors
supabase functions logs cron-send-character-choice-reminders --tail | grep ERROR
```

**Alerts:**
- Critical: Error rate > 10%
- Warning: Error rate > 5%
- Info: Error rate > 1%

**Common Errors to Watch:**

1. **Database Connection Errors:**
   ```
   Error: Connection to database failed
   Error: Too many connections
   Error: Query timeout
   ```
   **Action:** Check database connection pool, verify credentials

2. **Authentication Errors:**
   ```
   Error: Invalid JWT token
   Error: User not authenticated
   Error: Permission denied
   ```
   **Action:** Verify RLS policies, check auth configuration

3. **Realtime Errors:**
   ```
   Error: Realtime connection failed
   Error: Channel subscription failed
   ```
   **Action:** Check Realtime configuration, verify publication settings

4. **Storage Errors:**
   ```
   Error: Failed to upload file
   Error: Storage bucket not found
   Error: File size exceeds limit
   ```
   **Action:** Verify storage bucket exists, check RLS policies

---

### 3. Response Time

**Targets:**
- Dashboard load: < 2 seconds
- API requests: < 500ms
- Realtime updates: < 5 seconds

**Monitoring:**
```bash
# Test dashboard load time
curl -w "@curl-format.txt" -o /dev/null -s "https://your-domain.com/admin/production"

# Create curl-format.txt:
cat > curl-format.txt << 'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF

# Test API response time
time curl -s "https://your-domain.com/api/production/queue" > /dev/null
```

**Alerts:**
- Critical: Response time > 10 seconds
- Warning: Response time > 5 seconds
- Info: Response time > 2 seconds

**Performance Queries:**
```sql
-- Check slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 1000  -- queries taking > 1 second
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('production_queue', 'character_choices', 'production_stages')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('production_queue', 'character_choices', 'production_stages')
ORDER BY idx_scan DESC;
```

---

### 4. Database Health

**Monitoring:**
```sql
-- Check connection count
SELECT 
  count(*) as connections,
  state
FROM pg_stat_activity
GROUP BY state;

-- Check database size
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Check table bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE tablename IN ('production_queue', 'character_choices', 'production_stages');

-- Check for locks
SELECT 
  pid,
  usename,
  pg_blocking_pids(pid) as blocked_by,
  query as blocked_query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

**Alerts:**
- Critical: Connection count > 90% of max
- Warning: Database size growing > 10% per day
- Info: Long-running queries > 30 seconds

---

### 5. Cron Job Execution

**Target:** 100% successful execution

**Monitoring:**
```sql
-- Check cron job status
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
  d.status,
  d.return_message
FROM cron.job j
LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
WHERE j.jobname LIKE '%character_choice%'
ORDER BY d.start_time DESC
LIMIT 20;

-- Check for failed cron jobs
SELECT 
  j.jobname,
  d.start_time,
  d.status,
  d.return_message
FROM cron.job j
LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
WHERE j.jobname LIKE '%character_choice%'
  AND d.status = 'failed'
ORDER BY d.start_time DESC;
```

**Alerts:**
- Critical: Cron job failed 3+ times in a row
- Warning: Cron job failed once
- Info: Cron job execution time > 5 minutes

---

### 6. Email Delivery

**Target:** > 95% delivery rate

**Monitoring:**
```bash
# Check Edge Function logs for email sending
supabase functions logs cron-send-character-choice-reminders --tail

# Look for:
# - "Email sent successfully"
# - "Failed to send email"
# - SMTP errors
```

**Email Delivery Queries:**
```sql
-- If you have email_delivery_logs table
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_emails,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as delivery_rate
FROM email_delivery_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Alerts:**
- Critical: Delivery rate < 90%
- Warning: Delivery rate < 95%
- Info: Delivery rate < 98%

**Common Email Issues:**

1. **SMTP Authentication Failed:**
   ```
   Error: 535 Authentication failed
   ```
   **Action:** Verify SMTP credentials in Edge Function secrets

2. **Rate Limiting:**
   ```
   Error: 450 Too many emails sent
   ```
   **Action:** Implement email queuing, contact email provider

3. **Invalid Recipient:**
   ```
   Error: 550 User not found
   ```
   **Action:** Validate email addresses before sending

---

### 7. Realtime Updates

**Target:** < 5 seconds latency

**Monitoring:**
```sql
-- Check Realtime publication
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('production_queue', 'character_choices', 'production_stages');

-- Check for Realtime errors in logs
-- (Check Supabase Dashboard > Logs > Realtime)
```

**Manual Testing:**
```bash
# Test Realtime updates
# 1. Open dashboard in Browser A
# 2. Open dashboard in Browser B
# 3. Update a production item in Browser A
# 4. Verify update appears in Browser B within 5 seconds
# 5. Measure latency
```

**Alerts:**
- Critical: Realtime not working at all
- Warning: Latency > 10 seconds
- Info: Latency > 5 seconds

---

### 8. Storage Usage

**Monitoring:**
```sql
-- Check storage bucket usage
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
WHERE bucket_id = 'production-photos'
GROUP BY bucket_id;

-- Check recent uploads
SELECT 
  name,
  bucket_id,
  created_at,
  pg_size_pretty((metadata->>'size')::bigint) as size
FROM storage.objects
WHERE bucket_id = 'production-photos'
ORDER BY created_at DESC
LIMIT 20;
```

**Alerts:**
- Warning: Storage usage > 80% of quota
- Info: Large files uploaded (> 4MB)

---

### 9. User Activity

**Monitoring:**
```sql
-- Check active users
SELECT 
  COUNT(DISTINCT user_id) as active_users
FROM auth.sessions
WHERE expires_at > NOW();

-- Check production queue activity
SELECT 
  DATE(updated_at) as date,
  COUNT(*) as updates
FROM production_queue
WHERE updated_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(updated_at)
ORDER BY date DESC;

-- Check character choice submissions
SELECT 
  DATE(submitted_at) as date,
  COUNT(*) as submissions
FROM character_choices
WHERE submitted_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(submitted_at)
ORDER BY date DESC;
```

**Metrics:**
- Active admin users per day
- Production items updated per day
- Character choices submitted per day
- Stage transitions per day

---

### 10. Support Tickets

**Monitoring:**
- Track support tickets related to production system
- Categorize by issue type
- Monitor resolution time

**Categories:**
- Cannot access dashboard
- Character selection not working
- Photos not uploading
- Email notifications not received
- Realtime updates not working
- Performance issues
- Data inconsistencies

**Alerts:**
- Critical: > 10 tickets in first hour
- Warning: > 5 tickets in first 2 hours
- Info: Any critical severity tickets

---

## Monitoring Dashboard

### Recommended Metrics Dashboard

Create a monitoring dashboard with the following panels:

1. **System Health:**
   - Uptime percentage
   - Error rate
   - Response time

2. **Database:**
   - Connection count
   - Query performance
   - Table sizes

3. **Cron Jobs:**
   - Execution status
   - Success rate
   - Execution time

4. **Email:**
   - Delivery rate
   - Failed emails
   - Bounce rate

5. **Realtime:**
   - Connection count
   - Update latency
   - Error rate

6. **User Activity:**
   - Active users
   - Production updates
   - Character choices

7. **Support:**
   - Ticket count
   - Resolution time
   - Issue categories

---

## Monitoring Scripts

### Daily Health Check Script

```bash
#!/bin/bash

# daily-health-check.sh
# Run this script daily to check system health

echo "=== Production Management System - Daily Health Check ==="
echo "Date: $(date)"
echo ""

# 1. Check database connectivity
echo "1. Database Connectivity:"
if supabase db execute -c "SELECT 1;" &>/dev/null; then
  echo "   ✓ Database accessible"
else
  echo "   ✗ Database not accessible"
fi

# 2. Check tables
echo "2. Tables:"
TABLE_COUNT=$(supabase db execute -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('production_queue', 'character_choices', 'production_stages');" 2>/dev/null | tail -1)
echo "   Tables found: $TABLE_COUNT/3"

# 3. Check cron jobs
echo "3. Cron Jobs:"
CRON_COUNT=$(supabase db execute -c "SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%character_choice%' AND active = true;" 2>/dev/null | tail -1)
echo "   Active cron jobs: $CRON_COUNT/2"

# 4. Check recent cron job runs
echo "4. Recent Cron Job Runs:"
supabase db execute -c "
SELECT 
  j.jobname,
  d.start_time,
  d.status
FROM cron.job j
LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
WHERE j.jobname LIKE '%character_choice%'
ORDER BY d.start_time DESC
LIMIT 5;
" 2>/dev/null

# 5. Check Realtime
echo "5. Realtime Configuration:"
REALTIME_COUNT=$(supabase db execute -c "SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename IN ('production_queue', 'character_choices', 'production_stages');" 2>/dev/null | tail -1)
echo "   Realtime tables: $REALTIME_COUNT/3"

# 6. Check storage
echo "6. Storage:"
if supabase db execute -c "SELECT id FROM storage.buckets WHERE id = 'production-photos';" &>/dev/null; then
  echo "   ✓ Storage bucket exists"
else
  echo "   ✗ Storage bucket not found"
fi

# 7. Check Edge Functions
echo "7. Edge Functions:"
supabase functions list 2>/dev/null | grep "character-choice" || echo "   Functions not listed"

echo ""
echo "=== Health Check Complete ==="
```

### Error Monitoring Script

```bash
#!/bin/bash

# monitor-errors.sh
# Run this script to monitor for errors in real-time

echo "=== Monitoring for Errors ==="
echo "Press Ctrl+C to stop"
echo ""

# Monitor database logs
echo "Database Logs:"
supabase db logs --tail | grep -i "error\|fail\|exception" &

# Monitor Edge Function logs
echo "Edge Function Logs:"
supabase functions logs cron-send-character-choice-reminders --tail | grep -i "error\|fail\|exception" &
supabase functions logs cron-expire-character-choices --tail | grep -i "error\|fail\|exception" &

# Wait for user to stop
wait
```

---

## Alert Configuration

### Recommended Alerts

1. **Critical Alerts (Immediate Response):**
   - System down for > 1 minute
   - Error rate > 10%
   - Database connection failed
   - Cron job failed 3+ times
   - Email delivery < 90%

2. **Warning Alerts (Response within 1 hour):**
   - Error rate > 5%
   - Response time > 5 seconds
   - Cron job failed once
   - Email delivery < 95%
   - Realtime latency > 10 seconds

3. **Info Alerts (Review daily):**
   - Error rate > 1%
   - Response time > 2 seconds
   - Email delivery < 98%
   - Realtime latency > 5 seconds
   - Storage usage > 80%

### Alert Channels

- **Critical:** Phone call + SMS + Email + Slack
- **Warning:** Email + Slack
- **Info:** Email (daily digest)

---

## Incident Response

### Incident Severity Levels

**SEV 1 - Critical:**
- System completely down
- Data loss occurring
- Security breach
- **Response Time:** Immediate
- **Team:** Full team

**SEV 2 - Major:**
- Major feature not working
- High error rate (> 10%)
- Performance severely degraded
- **Response Time:** Within 1 hour
- **Team:** On-call engineer + lead

**SEV 3 - Minor:**
- Minor feature not working
- Moderate error rate (5-10%)
- Performance degraded
- **Response Time:** Within 4 hours
- **Team:** On-call engineer

**SEV 4 - Low:**
- Cosmetic issues
- Low error rate (1-5%)
- Minor performance issues
- **Response Time:** Next business day
- **Team:** Assigned engineer

### Incident Response Process

1. **Detect:** Alert triggered or issue reported
2. **Assess:** Determine severity level
3. **Notify:** Alert appropriate team members
4. **Investigate:** Identify root cause
5. **Mitigate:** Implement temporary fix
6. **Resolve:** Implement permanent fix
7. **Document:** Create incident report
8. **Review:** Conduct post-mortem

---

## Reporting

### Daily Report Template

```markdown
# Production System - Daily Report

**Date:** [DATE]
**Reporting Period:** [START] - [END]

## System Health
- Uptime: [PERCENTAGE]
- Error Rate: [PERCENTAGE]
- Average Response Time: [TIME]

## Activity
- Active Users: [COUNT]
- Production Updates: [COUNT]
- Character Choices: [COUNT]
- Stage Transitions: [COUNT]

## Cron Jobs
- Reminders Sent: [COUNT]
- Choices Expired: [COUNT]
- Execution Failures: [COUNT]

## Email Delivery
- Total Sent: [COUNT]
- Delivery Rate: [PERCENTAGE]
- Failed: [COUNT]

## Issues
- Critical: [COUNT]
- Major: [COUNT]
- Minor: [COUNT]

## Action Items
- [List any follow-up actions needed]

**Reported By:** [NAME]
```

### Weekly Report Template

```markdown
# Production System - Weekly Report

**Week:** [WEEK NUMBER]
**Date Range:** [START] - [END]

## Summary
- Overall Health: [Good/Fair/Poor]
- Major Issues: [COUNT]
- User Feedback: [Summary]

## Metrics
- Average Uptime: [PERCENTAGE]
- Average Error Rate: [PERCENTAGE]
- Average Response Time: [TIME]
- Email Delivery Rate: [PERCENTAGE]

## Trends
- [Describe any notable trends]

## Improvements Made
- [List improvements implemented]

## Recommendations
- [List recommendations for next week]

**Reported By:** [NAME]
```

---

## Continuous Improvement

### Performance Optimization

1. **Identify Slow Queries:**
   ```sql
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

2. **Add Missing Indexes:**
   ```sql
   -- Check for sequential scans
   SELECT 
     schemaname,
     tablename,
     seq_scan,
     seq_tup_read,
     idx_scan,
     seq_tup_read / seq_scan as avg_seq_read
   FROM pg_stat_user_tables
   WHERE seq_scan > 0
   ORDER BY seq_tup_read DESC
   LIMIT 10;
   ```

3. **Optimize Queries:**
   - Use EXPLAIN ANALYZE
   - Add appropriate indexes
   - Optimize JOIN operations
   - Use materialized views for complex queries

### Monitoring Improvements

- Add more detailed metrics
- Implement custom dashboards
- Set up automated alerts
- Create runbooks for common issues
- Conduct regular performance reviews

---

**Document Version:** 1.0.0
**Last Updated:** 2024-01-01
**Next Review:** Weekly during first month, then monthly
