# Staging Verification Checklist

## Quick Reference

Use this checklist to verify the staging deployment is complete and working correctly.

**Estimated Time:** 30-45 minutes

---

## 1. Database Verification (10 minutes)

### Tables and Schema
- [ ] production_queue table exists
- [ ] character_choices table exists
- [ ] production_stages table exists
- [ ] stage_transition_logs table exists
- [ ] production_assignment_logs table exists
- [ ] production_photo_metadata table exists

### Indexes
- [ ] idx_production_queue_priority exists
- [ ] idx_production_queue_status exists
- [ ] idx_production_queue_deadline exists
- [ ] idx_character_choices_deadline exists
- [ ] idx_production_stages_queue_id exists

### RLS Policies
- [ ] production_queue has admin-only policies
- [ ] character_choices has customer + admin policies
- [ ] production_stages has admin-only policies
- [ ] storage.objects has photo upload policies

### Functions and Triggers
- [ ] calculate_priority_score() function exists
- [ ] calculate_character_choice_deadline() function exists
- [ ] auto_populate_production_queue() trigger exists
- [ ] sync_production_status_to_orders() trigger exists

### Cron Jobs
- [ ] send_character_choice_reminders cron job scheduled
- [ ] expire_character_choices cron job scheduled
- [ ] Both cron jobs are active

---

## 2. Supabase Configuration (5 minutes)

### Realtime
- [ ] production_queue has Realtime enabled
- [ ] character_choices has Realtime enabled
- [ ] production_stages has Realtime enabled

### Storage
- [ ] production-photos bucket exists
- [ ] Bucket is private (public = false)
- [ ] File size limit is 5MB
- [ ] Allowed MIME types: image/jpeg, image/png, image/webp
- [ ] Storage RLS policies configured

### Edge Functions
- [ ] cron-send-character-choice-reminders deployed
- [ ] cron-expire-character-choices deployed
- [ ] Function secrets configured (SMTP, etc.)

---

## 3. Frontend Verification (10 minutes)

### Dashboard Access
- [ ] /admin/production loads successfully
- [ ] Dashboard loads in < 2 seconds
- [ ] No JavaScript errors in console
- [ ] No network errors in Network tab

### View Modes
- [ ] Kanban view displays correctly
- [ ] List view displays correctly
- [ ] Calendar view displays correctly
- [ ] View switching works smoothly

### Filters and Search
- [ ] Collection filter works
- [ ] Priority filter works
- [ ] Stage filter works
- [ ] Date range filter works
- [ ] Search by customer name works
- [ ] Clear filters button works

### Metrics Bar
- [ ] Count per stage displays
- [ ] Average time per stage displays
- [ ] Today's scheduled count displays
- [ ] This week's scheduled count displays

### Urgent Alerts
- [ ] Critical items alert badge displays
- [ ] Pending choices alert badge displays
- [ ] Blocked items alert badge displays
- [ ] Clicking alert filters dashboard

---

## 4. Character Choice Management (10 minutes)

### Admin Interface
- [ ] /admin/character-choices loads successfully
- [ ] Pending choices display correctly
- [ ] Deadline countdown displays
- [ ] Approval button works
- [ ] Rejection button works
- [ ] Deadline extension works

### Customer Interface
- [ ] "Choose Character" button displays (when applicable)
- [ ] Character selection modal opens
- [ ] Characters display with images
- [ ] Character selection works
- [ ] Submission successful
- [ ] Confirmation message displays

### Choice Change
- [ ] "Change Choice" button displays (when allowed)
- [ ] Change modal opens
- [ ] New character selectable
- [ ] Reason for change required
- [ ] Change count increments
- [ ] Max 3 changes enforced

---

## 5. Production Stage Tracking (10 minutes)

### Stage Progression
- [ ] Stage transition modal opens
- [ ] Notes can be added
- [ ] Photos can be uploaded (max 5)
- [ ] Stage transition works
- [ ] Stage validation prevents skipping
- [ ] Customer notification sent

### Team Assignment
- [ ] Assignment modal opens
- [ ] Team member list displays
- [ ] Assignment saves correctly
- [ ] Team member notified
- [ ] Workload view displays correctly

### Blocking Issues
- [ ] Block modal opens
- [ ] Block reason required
- [ ] Item marked as blocked
- [ ] Customer notified of delay
- [ ] Unblock modal opens
- [ ] Resolution notes can be added
- [ ] Item unblocked successfully

### Photo Management
- [ ] Photo upload works (< 5MB)
- [ ] Photo preview displays
- [ ] Photo gallery displays
- [ ] Photos can be deleted
- [ ] Customer visibility flag works

---

## 6. Customer Progress View (5 minutes)

### Progress Timeline
- [ ] Timeline displays correctly
- [ ] Completed stages show checkmarks
- [ ] Current stage highlighted
- [ ] Future stages grayed out
- [ ] Completion dates display

### Estimated Dates
- [ ] Production completion date displays
- [ ] Shipping date displays
- [ ] Delivery date displays
- [ ] "On Track" or "Delayed" indicator displays

### Tracking Information
- [ ] Tracking code displays (when shipped)
- [ ] Carrier name displays
- [ ] Tracking link works
- [ ] Estimated delivery date displays

---

## 7. Integration Testing (10 minutes)

### Orders Integration
- [ ] New order creates production_queue record
- [ ] character_choices record created (if applicable)
- [ ] production_stages records initialized (6 stages)
- [ ] Order status syncs with production status

### Status Sync
- [ ] Production stage "Shipped" updates order to "Shipped"
- [ ] Production stage "Delivered" updates order to "Delivered"
- [ ] Tracking code syncs to order
- [ ] Estimated dates sync to order

### Notification Integration
- [ ] Character choice reminder emails sent
- [ ] Choice approved email sent
- [ ] Production started email sent
- [ ] Stage completed email sent
- [ ] Item shipped email sent
- [ ] Production delayed email sent

---

## 8. Performance Testing (5 minutes)

### Dashboard Performance
- [ ] Dashboard loads in < 2 seconds with 100+ items
- [ ] No queries take > 500ms
- [ ] No memory leaks detected
- [ ] Smooth scrolling and interactions

### Realtime Performance
- [ ] Updates appear within 5 seconds
- [ ] No lag or delays
- [ ] Multiple browser windows sync correctly

### Concurrent Users
- [ ] 5+ concurrent users can work simultaneously
- [ ] No conflicts or errors
- [ ] All updates successful

---

## 9. Email Service Testing (5 minutes)

### Email Configuration
- [ ] Email service credentials configured
- [ ] Email templates found
- [ ] Test email sent successfully
- [ ] Test email received

### Email Content
- [ ] Email formatting correct
- [ ] Links work correctly
- [ ] Images display correctly
- [ ] Unsubscribe link works

### Cron Job Emails
- [ ] Reminder emails sent on schedule
- [ ] Expiration emails sent on schedule
- [ ] Email content accurate
- [ ] No duplicate emails

---

## 10. Security Verification (5 minutes)

### Access Control
- [ ] Admin-only pages require admin role
- [ ] Customers can only see their own orders
- [ ] RLS policies prevent unauthorized access
- [ ] API endpoints require authentication

### Data Protection
- [ ] Customer PII not exposed in logs
- [ ] Photos stored in private bucket
- [ ] Signed URLs expire correctly
- [ ] No sensitive data in frontend code

### Audit Trail
- [ ] Stage transitions logged
- [ ] Character choice changes logged
- [ ] Assignment changes logged
- [ ] All logs include user ID and timestamp

---

## Issues Found

Document any issues discovered during verification:

### Critical Issues
1. _____________________________________
2. _____________________________________

### High Priority Issues
1. _____________________________________
2. _____________________________________

### Medium Priority Issues
1. _____________________________________
2. _____________________________________

### Low Priority Issues
1. _____________________________________
2. _____________________________________

---

## Overall Assessment

### Deployment Status
- [ ] **PASS** - All checks passed, ready for production
- [ ] **PASS WITH MINOR ISSUES** - Minor issues documented, can proceed
- [ ] **FAIL** - Critical issues must be resolved before production

### Performance Assessment
- [ ] Dashboard load time: _____ seconds (target: < 2s)
- [ ] API response time: _____ ms (target: < 500ms)
- [ ] Realtime latency: _____ seconds (target: < 5s)

### Recommendation
- [ ] Ready for production deployment
- [ ] Ready with minor fixes
- [ ] Not ready - requires fixes

---

## Sign-Off

**Verified By:** _________________ **Date:** _________

**Approved By:** _________________ **Date:** _________

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Next Steps

Based on verification results:

### If PASS:
1. Document deployment in project log
2. Notify team of successful staging deployment
3. Schedule production deployment
4. Prepare production environment

### If PASS WITH MINOR ISSUES:
1. Document all issues
2. Create tickets for minor issues
3. Fix issues in next sprint
4. Proceed with production deployment

### If FAIL:
1. Document all critical issues
2. Create high-priority tickets
3. Fix critical issues immediately
4. Re-run verification checklist
5. Do not proceed to production

---

**Last Updated:** 2026-04-29
**Version:** 1.0.0
