# Staging Testing Guide - Production Management System

## Overview

This guide provides comprehensive testing procedures for the Production Management System in the staging environment. All features must be tested and verified before production deployment.

**Estimated Testing Time:** 2-3 hours

## Prerequisites

- [ ] Staging deployment completed successfully
- [ ] Admin test account created
- [ ] Customer test account created
- [ ] Test data available (orders, collections, characters)
- [ ] Browser developer tools ready
- [ ] Network monitoring tools ready

## Testing Checklist

### 1. Database Verification (15 minutes)

#### 1.1 Tables and Schema

```sql
-- Verify all tables exist
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
-- Expected: 6 rows

-- Verify indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('production_queue', 'character_choices', 'production_stages')
ORDER BY tablename, indexname;
-- Expected: Multiple indexes per table

-- Verify RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('production_queue', 'character_choices', 'production_stages')
ORDER BY tablename, policyname;
-- Expected: Multiple policies per table
```

**Test Results:**
- [ ] All tables exist
- [ ] All indexes created
- [ ] All RLS policies active

#### 1.2 Triggers and Functions

```sql
-- Verify triggers
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger 
WHERE tgname LIKE '%production%' OR tgname LIKE '%character%'
ORDER BY tgname;

-- Verify functions
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%production%' OR routine_name LIKE '%character%')
ORDER BY routine_name;

-- Test priority calculation function
SELECT calculate_priority_score('subscription_delivery', NOW() + INTERVAL '1 day', NOW() - INTERVAL '7 days');
-- Expected: High priority score

-- Test deadline calculation function
SELECT calculate_character_choice_deadline(CURRENT_DATE);
-- Expected: Date 7 days from now
```

**Test Results:**
- [ ] All triggers active
- [ ] All functions working
- [ ] Priority calculation correct
- [ ] Deadline calculation correct

#### 1.3 Cron Jobs

```sql
-- Verify cron jobs are scheduled
SELECT jobname, schedule, active, nodename
FROM cron.job
WHERE jobname LIKE '%character_choice%';
-- Expected: 2 jobs (reminders and expiration)

-- Check cron job execution history
SELECT jobid, runid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%character_choice%')
ORDER BY start_time DESC
LIMIT 10;
```

**Test Results:**
- [ ] Reminder cron job scheduled
- [ ] Expiration cron job scheduled
- [ ] Both jobs are active

---

### 2. Realtime Configuration (15 minutes)

#### 2.1 Realtime Enabled

```sql
-- Verify Realtime is enabled for production tables
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('production_queue', 'character_choices', 'production_stages');
-- Expected: 3 rows
```

**Test Results:**
- [ ] production_queue has Realtime enabled
- [ ] character_choices has Realtime enabled
- [ ] production_stages has Realtime enabled

#### 2.2 Realtime Updates Test

**Test Procedure:**
1. Open production dashboard in Browser A
2. Open production dashboard in Browser B
3. In Browser A, update a production item's stage
4. Observe Browser B for automatic update

**Expected Results:**
- Update appears in Browser B within 5 seconds
- No page refresh required
- Update is accurate and complete

**Test Results:**
- [ ] Update received in < 5 seconds
- [ ] Update is accurate
- [ ] No errors in console

---

### 3. Storage Configuration (15 minutes)

#### 3.1 Storage Bucket

```sql
-- Verify storage bucket exists
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'production-photos';
-- Expected: 1 row with correct configuration

-- Verify storage RLS policies
SELECT policyname, definition
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE '%production%';
```

**Test Results:**
- [ ] Bucket exists
- [ ] Bucket is private (public = false)
- [ ] File size limit is 5MB
- [ ] Allowed MIME types correct
- [ ] RLS policies configured

#### 3.2 Photo Upload Test

**Test Procedure:**
1. Login as admin
2. Navigate to production item detail
3. Click "Add Photos" in stage section
4. Upload a test image (< 5MB, JPEG/PNG/WebP)
5. Verify upload success
6. View uploaded photo
7. Delete photo

**Expected Results:**
- Upload completes successfully
- Photo appears in gallery
- Photo is viewable
- Photo can be deleted

**Test Results:**
- [ ] Upload successful
- [ ] Photo viewable
- [ ] Photo deletable
- [ ] No errors in console

---

### 4. Production Dashboard Testing (30 minutes)

#### 4.1 Dashboard Load Performance

**Test Procedure:**
1. Open browser developer tools (Network tab)
2. Navigate to `/admin/production`
3. Measure page load time
4. Check for errors in console

**Expected Results:**
- Page loads in < 2 seconds
- No JavaScript errors
- All data displays correctly

**Test Results:**
- [ ] Load time: _____ seconds (< 2s)
- [ ] No errors in console
- [ ] All data displays correctly

#### 4.2 View Modes

**Test Procedure:**
1. Test Kanban view
   - [ ] Columns display correctly
   - [ ] Items display in correct columns
   - [ ] Drag-and-drop works
   - [ ] Item count per column is accurate

2. Test List view
   - [ ] Table displays all columns
   - [ ] Sorting works on all columns
   - [ ] Row selection works
   - [ ] Pagination works

3. Test Calendar view
   - [ ] Calendar displays correctly
   - [ ] Items appear on correct dates
   - [ ] Day/week/month views work
   - [ ] Click day to see items

**Test Results:**
- [ ] Kanban view working
- [ ] List view working
- [ ] Calendar view working
- [ ] View switching smooth

#### 4.3 Filters and Search

**Test Procedure:**
1. Test collection filter
   - [ ] Filter by single collection
   - [ ] Filter by multiple collections
   - [ ] Clear filter

2. Test priority filter
   - [ ] Filter by Critical
   - [ ] Filter by High
   - [ ] Filter by Normal
   - [ ] Filter by Low

3. Test stage filter
   - [ ] Filter by single stage
   - [ ] Filter by multiple stages

4. Test search
   - [ ] Search by customer name
   - [ ] Search by order number
   - [ ] Search by collection name

**Test Results:**
- [ ] All filters working
- [ ] Search working
- [ ] Clear filters working
- [ ] Results accurate

#### 4.4 Urgent Alerts

**Test Procedure:**
1. Check alert badges
   - [ ] Critical items badge (deadline < 24h)
   - [ ] Pending choices badge
   - [ ] Blocked items badge

2. Click each alert badge
   - [ ] Dashboard filters to show only urgent items
   - [ ] Count is accurate

**Test Results:**
- [ ] Alert badges display correctly
- [ ] Counts are accurate
- [ ] Filtering works

#### 4.5 Metrics Bar

**Test Procedure:**
1. Verify metrics display
   - [ ] Count per stage
   - [ ] Average time per stage
   - [ ] Today's scheduled count
   - [ ] This week's scheduled count

2. Verify real-time updates
   - [ ] Metrics update when items change

**Test Results:**
- [ ] All metrics display
- [ ] Metrics are accurate
- [ ] Real-time updates work

---

### 5. Character Choice Management (30 minutes)

#### 5.1 Admin Choice Management

**Test Procedure:**
1. Navigate to character choice management page
2. Verify pending choices display
3. Test approval workflow:
   - [ ] Click "Approve" on a choice
   - [ ] Verify confirmation dialog
   - [ ] Confirm approval
   - [ ] Verify status changes to "Approved"

4. Test rejection workflow:
   - [ ] Click "Reject" on a choice
   - [ ] Enter rejection reason
   - [ ] Confirm rejection
   - [ ] Verify status changes to "Rejected"

5. Test deadline extension:
   - [ ] Click "Extend Deadline"
   - [ ] Select new deadline
   - [ ] Confirm extension
   - [ ] Verify new deadline saved

**Test Results:**
- [ ] Pending choices display
- [ ] Approval works
- [ ] Rejection works
- [ ] Deadline extension works
- [ ] Notifications sent

#### 5.2 Customer Choice Interface

**Test Procedure:**
1. Login as customer with pending choice
2. Navigate to order progress page
3. Verify "Choose Character" button displays
4. Click "Choose Character"
5. Verify character selection modal opens
6. Select a character
7. Submit choice
8. Verify confirmation message
9. Verify choice appears in order view

**Test Results:**
- [ ] "Choose Character" button displays
- [ ] Modal opens correctly
- [ ] Characters display with images
- [ ] Selection works
- [ ] Submission successful
- [ ] Confirmation displayed

#### 5.3 Choice Change

**Test Procedure:**
1. As customer, click "Change Choice"
2. Select different character
3. Enter reason for change
4. Submit change
5. Verify change count increments
6. Verify new choice displays

**Test Results:**
- [ ] Change modal opens
- [ ] New character selectable
- [ ] Reason required
- [ ] Change count accurate
- [ ] Max 3 changes enforced

---

### 6. Production Stage Tracking (30 minutes)

#### 6.1 Stage Progression

**Test Procedure:**
1. Select a production item
2. Click "Next Stage" button
3. Verify stage transition modal opens
4. Add notes (optional)
5. Upload photo (optional)
6. Confirm transition
7. Verify stage updates
8. Verify customer notification sent

**Test Results:**
- [ ] Stage transition works
- [ ] Notes saved
- [ ] Photos uploaded
- [ ] Stage updated
- [ ] Notification sent

#### 6.2 Stage Validation

**Test Procedure:**
1. Try to skip a stage
2. Verify error message displays
3. Verify stage cannot be skipped

**Test Results:**
- [ ] Stage skipping prevented
- [ ] Error message clear
- [ ] Validation working

#### 6.3 Team Assignment

**Test Procedure:**
1. Click "Assign" on a production item
2. Select team member
3. Confirm assignment
4. Verify assignment displays
5. Verify team member notified

**Test Results:**
- [ ] Assignment modal works
- [ ] Team member list displays
- [ ] Assignment saves
- [ ] Notification sent

#### 6.4 Blocking Issues

**Test Procedure:**
1. Click "Block" on a production item
2. Enter block reason
3. Enter estimated resolution time
4. Confirm block
5. Verify item marked as blocked
6. Verify customer notified
7. Click "Unblock"
8. Enter resolution notes
9. Confirm unblock
10. Verify item unblocked

**Test Results:**
- [ ] Blocking works
- [ ] Block reason saved
- [ ] Customer notified
- [ ] Unblocking works
- [ ] Resolution notes saved

---

### 7. Customer Progress View (20 minutes)

#### 7.1 Progress Timeline

**Test Procedure:**
1. Login as customer
2. Navigate to order progress page
3. Verify timeline displays
4. Verify completed stages show checkmarks
5. Verify current stage highlighted
6. Verify future stages grayed out

**Test Results:**
- [ ] Timeline displays correctly
- [ ] Completed stages marked
- [ ] Current stage highlighted
- [ ] Future stages grayed

#### 7.2 Estimated Dates

**Test Procedure:**
1. Verify estimated dates display:
   - [ ] Production completion date
   - [ ] Shipping date
   - [ ] Delivery date

2. Verify "On Track" or "Delayed" indicator

**Test Results:**
- [ ] All dates display
- [ ] Dates are reasonable
- [ ] Status indicator correct

#### 7.3 Tracking Information

**Test Procedure:**
1. For shipped order, verify:
   - [ ] Tracking code displays
   - [ ] Carrier name displays
   - [ ] Tracking link works
   - [ ] Estimated delivery date displays

**Test Results:**
- [ ] Tracking code displays
- [ ] Carrier name correct
- [ ] Link works
- [ ] Delivery date displays

---

### 8. Integration Testing (20 minutes)

#### 8.1 Orders Integration

**Test Procedure:**
1. Create a new order (subscription or standalone)
2. Approve payment
3. Verify production_queue record created automatically
4. Verify character_choices record created (if applicable)
5. Verify production_stages records initialized

**Test Results:**
- [ ] Auto-population works
- [ ] All records created
- [ ] Data is accurate

#### 8.2 Status Sync

**Test Procedure:**
1. Update production stage to "Shipped"
2. Verify order status updates to "Shipped"
3. Update production stage to "Delivered"
4. Verify order status updates to "Delivered"

**Test Results:**
- [ ] Status sync works
- [ ] Updates are immediate
- [ ] Data is accurate

#### 8.3 Notification Integration

**Test Procedure:**
1. Trigger various notifications:
   - [ ] Character choice reminder
   - [ ] Choice approved
   - [ ] Production started
   - [ ] Stage completed
   - [ ] Item shipped
   - [ ] Production delayed

2. Verify emails received
3. Verify email content correct

**Test Results:**
- [ ] All notifications sent
- [ ] Emails received
- [ ] Content accurate
- [ ] Links work

---

### 9. Performance Testing (20 minutes)

#### 9.1 Dashboard Load with Large Dataset

**Test Procedure:**
1. Ensure staging has 100+ production items
2. Clear browser cache
3. Open developer tools (Network tab)
4. Navigate to production dashboard
5. Measure load time
6. Check for slow queries

**Expected Results:**
- Load time < 2 seconds
- No queries > 500ms
- No memory leaks

**Test Results:**
- [ ] Load time: _____ seconds
- [ ] Query times acceptable
- [ ] No performance issues

#### 9.2 Concurrent User Test

**Test Procedure:**
1. Open dashboard in 5 different browsers/tabs
2. Perform actions simultaneously:
   - Update stages
   - Assign items
   - Filter data
3. Verify no conflicts or errors

**Test Results:**
- [ ] No conflicts
- [ ] All updates successful
- [ ] Real-time updates work

#### 9.3 Real-time Update Latency

**Test Procedure:**
1. Open dashboard in Browser A
2. Open dashboard in Browser B
3. Update item in Browser A
4. Measure time until update appears in Browser B

**Expected Results:**
- Latency < 5 seconds

**Test Results:**
- [ ] Latency: _____ seconds
- [ ] Acceptable performance

---

### 10. Email Service Testing (15 minutes)

#### 10.1 Email Configuration

**Test Procedure:**
1. Run email test script:
   ```bash
   node .kiro/specs/production-management-system/scripts/test-email-service.js your-email@example.com
   ```

2. Verify all tests pass:
   - [ ] Environment variables configured
   - [ ] Email templates found
   - [ ] Edge Functions deployed
   - [ ] Test email sent
   - [ ] Email received

**Test Results:**
- [ ] All tests passed
- [ ] Test email received
- [ ] Email formatted correctly

#### 10.2 Cron Job Email Test

**Test Procedure:**
1. Manually trigger reminder cron job:
   ```sql
   SELECT send_character_choice_reminders();
   ```

2. Check for emails sent
3. Verify email content

**Test Results:**
- [ ] Cron job executed
- [ ] Emails sent
- [ ] Content correct

---

## Issue Tracking

Use this section to document any issues found during testing:

### Issue 1
- **Severity:** Critical / High / Medium / Low
- **Component:** 
- **Description:** 
- **Steps to Reproduce:** 
- **Expected Behavior:** 
- **Actual Behavior:** 
- **Screenshots:** 
- **Status:** Open / In Progress / Resolved

### Issue 2
- **Severity:** 
- **Component:** 
- **Description:** 
- **Steps to Reproduce:** 
- **Expected Behavior:** 
- **Actual Behavior:** 
- **Screenshots:** 
- **Status:** 

---

## Sign-Off

### Testing Completion

- [ ] All database tests passed
- [ ] All Realtime tests passed
- [ ] All storage tests passed
- [ ] All dashboard tests passed
- [ ] All character choice tests passed
- [ ] All stage tracking tests passed
- [ ] All customer view tests passed
- [ ] All integration tests passed
- [ ] All performance tests passed
- [ ] All email tests passed

### Issues Summary

- **Critical Issues:** _____
- **High Priority Issues:** _____
- **Medium Priority Issues:** _____
- **Low Priority Issues:** _____

### Recommendation

- [ ] **Ready for Production** - All tests passed, no critical issues
- [ ] **Ready with Minor Issues** - Minor issues documented, can be fixed post-deployment
- [ ] **Not Ready** - Critical issues must be resolved before production

### Sign-Off

**Tested By:** _________________ **Date:** _________

**Approved By:** _________________ **Date:** _________

---

## Next Steps

After staging testing is complete:

1. **Fix Issues:** Resolve all critical and high-priority issues
2. **Re-test:** Re-run tests for fixed issues
3. **Documentation:** Update documentation based on findings
4. **Production Deployment:** Proceed with production deployment
5. **Monitoring:** Set up monitoring and alerts for production

---

## Appendix: Quick Reference Commands

### Database Queries

```sql
-- Check production queue
SELECT COUNT(*), production_status FROM production_queue GROUP BY production_status;

-- Check character choices
SELECT COUNT(*), status FROM character_choices GROUP BY status;

-- Check cron jobs
SELECT * FROM cron.job WHERE jobname LIKE '%character_choice%';

-- Check Realtime
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

### Supabase CLI Commands

```bash
# Check migration status
supabase db diff

# Execute SQL file
supabase db execute -f script.sql

# View function logs
supabase functions logs cron-send-character-choice-reminders

# Test function
supabase functions invoke cron-send-character-choice-reminders --method POST
```

### Testing URLs

- **Production Dashboard:** `/admin/production`
- **Character Choice Management:** `/admin/character-choices`
- **Customer Order Progress:** `/orders/:orderId`

---

**Last Updated:** 2024-01-01
**Version:** 1.0.0
