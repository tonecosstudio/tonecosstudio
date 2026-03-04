# Supabase Realtime Testing Guide

## Overview

This guide provides step-by-step instructions for testing Supabase Realtime functionality in the Production Management System.

## Prerequisites

- [ ] Realtime configuration script has been run (`configure-realtime.sql`)
- [ ] Production dashboard is deployed and accessible
- [ ] You have admin access to both the dashboard and Supabase SQL editor
- [ ] Browser developer console is open (F12)

## Test 1: Production Queue Updates

### Setup
1. Open the production dashboard in Browser Window 1
2. Open Supabase SQL Editor in Browser Window 2
3. Arrange windows side-by-side

### Test Steps

**Step 1: Verify Realtime Connection**
```javascript
// In Browser Window 1 console, check for Realtime connection
// You should see a message like: "Realtime connection established"
```

**Step 2: Subscribe to Changes**
```javascript
// The dashboard should automatically subscribe to production_queue changes
// Check console for: "Subscribed to production_queue_changes"
```

**Step 3: Trigger an Update**
```sql
-- In Browser Window 2 (SQL Editor), run:
UPDATE production_queue 
SET production_status = 'in_production',
    updated_at = NOW()
WHERE id = (SELECT id FROM production_queue LIMIT 1);
```

**Step 4: Verify Update Appears**
- [ ] Dashboard updates within 5 seconds
- [ ] No page refresh required
- [ ] Updated item shows new status
- [ ] Console shows: "Received realtime update: production_queue"

### Expected Results
✓ Dashboard updates automatically  
✓ Update latency < 5 seconds  
✓ No errors in console  
✓ Visual feedback shows change  

### Troubleshooting
If update doesn't appear:
1. Check browser console for errors
2. Verify Realtime is enabled: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'production_queue';`
3. Check RLS policies allow SELECT
4. Verify network tab shows WebSocket connection

## Test 2: Character Choice Updates

### Test Steps

**Step 1: Open Character Choice Manager**
```
Navigate to: /admin/character-choices
```

**Step 2: Trigger a Choice Submission**
```sql
-- In SQL Editor, simulate a customer submitting a choice:
UPDATE character_choices 
SET status = 'submitted',
    chosen_character_id = (SELECT id FROM collection_characters LIMIT 1),
    submitted_at = NOW(),
    updated_at = NOW()
WHERE id = (SELECT id FROM character_choices WHERE status = 'pending' LIMIT 1);
```

**Step 3: Verify Update Appears**
- [ ] Character choice list updates automatically
- [ ] Status changes from "pending" to "submitted"
- [ ] Notification badge updates (if applicable)
- [ ] No page refresh required

### Expected Results
✓ Character choice updates in real-time  
✓ Status badge updates  
✓ Notification appears (if configured)  

## Test 3: Production Stage Updates

### Test Steps

**Step 1: Open Production Stage Tracker**
```
Navigate to: /admin/production/[orderId]
```

**Step 2: Trigger a Stage Change**
```sql
-- In SQL Editor, simulate stage completion:
UPDATE production_stages 
SET status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
WHERE production_queue_id = 'YOUR_QUEUE_ID'
  AND stage_name = 'design';
```

**Step 3: Verify Update Appears**
- [ ] Stage tracker updates automatically
- [ ] Stage shows as completed with checkmark
- [ ] Timeline updates
- [ ] Estimated dates recalculate

### Expected Results
✓ Stage tracker updates in real-time  
✓ Visual indicators update  
✓ Dates recalculate automatically  

## Test 4: Multiple Concurrent Users

### Setup
1. Open dashboard in 3 different browsers (Chrome, Firefox, Edge)
2. Log in as admin in all browsers
3. Navigate to production dashboard in all browsers

### Test Steps

**Step 1: Make Changes in Browser 1**
```
- Update a production item status
- Assign an item to a team member
- Move an item to a different stage
```

**Step 2: Verify Updates in Browsers 2 & 3**
- [ ] All changes appear in all browsers
- [ ] Updates appear within 5 seconds
- [ ] No conflicts or race conditions
- [ ] All browsers show consistent data

### Expected Results
✓ All browsers receive updates  
✓ No data inconsistencies  
✓ No performance degradation  

## Test 5: Realtime Performance Under Load

### Test Steps

**Step 1: Generate Multiple Updates**
```sql
-- In SQL Editor, update multiple items:
UPDATE production_queue 
SET updated_at = NOW()
WHERE id IN (
  SELECT id FROM production_queue LIMIT 10
);
```

**Step 2: Monitor Performance**
- [ ] Check browser console for update timing
- [ ] Monitor network tab for WebSocket messages
- [ ] Check CPU usage in browser task manager
- [ ] Verify no memory leaks

### Expected Results
✓ All 10 updates received  
✓ No dropped messages  
✓ CPU usage < 50%  
✓ Memory stable  

## Test 6: Realtime Reconnection

### Test Steps

**Step 1: Simulate Network Interruption**
```
1. Open browser DevTools > Network tab
2. Set throttling to "Offline"
3. Wait 5 seconds
4. Set throttling back to "Online"
```

**Step 2: Verify Reconnection**
- [ ] Console shows "Realtime connection lost"
- [ ] Console shows "Reconnecting..."
- [ ] Console shows "Realtime connection restored"
- [ ] Dashboard resumes receiving updates

### Expected Results
✓ Automatic reconnection  
✓ No data loss  
✓ User notified of connection status  

## Test 7: Realtime Filtering (Optional)

If you've configured Realtime filters:

### Test Steps

**Step 1: Configure Filter**
```javascript
// In dashboard code, subscribe with filter:
supabase
  .channel('production_queue_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'production_queue',
    filter: 'production_status=eq.in_production'
  }, handleChange)
  .subscribe();
```

**Step 2: Test Filter**
```sql
-- Update item with matching filter:
UPDATE production_queue SET production_status = 'in_production' WHERE id = 'test-id-1';

-- Update item NOT matching filter:
UPDATE production_queue SET production_status = 'completed' WHERE id = 'test-id-2';
```

**Step 3: Verify Filtering**
- [ ] Only matching updates received
- [ ] Non-matching updates ignored
- [ ] Console shows filtered updates

### Expected Results
✓ Only filtered updates received  
✓ Reduced bandwidth usage  
✓ Improved performance  

## Common Issues and Solutions

### Issue 1: No Realtime Updates Received

**Symptoms:**
- Dashboard doesn't update automatically
- Console shows no Realtime messages

**Solutions:**
1. Check Realtime is enabled:
   ```sql
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime' 
   AND tablename = 'production_queue';
   ```

2. Verify RLS policies:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'production_queue' 
   AND cmd = 'SELECT';
   ```

3. Check WebSocket connection in Network tab
4. Verify Supabase project has Realtime enabled

### Issue 2: Slow Update Latency (> 5 seconds)

**Symptoms:**
- Updates take longer than 5 seconds to appear

**Solutions:**
1. Check network latency
2. Reduce number of subscribed channels
3. Implement client-side throttling
4. Consider using filters to reduce message volume

### Issue 3: Memory Leaks

**Symptoms:**
- Browser memory usage increases over time
- Dashboard becomes slow after extended use

**Solutions:**
1. Ensure proper cleanup of subscriptions:
   ```javascript
   useEffect(() => {
     const subscription = supabase.channel('...');
     return () => {
       subscription.unsubscribe();
     };
   }, []);
   ```

2. Limit number of items in state
3. Implement pagination
4. Use React.memo for expensive components

### Issue 4: Connection Drops Frequently

**Symptoms:**
- Realtime connection disconnects often
- Console shows repeated reconnection attempts

**Solutions:**
1. Check network stability
2. Verify Supabase project status
3. Implement exponential backoff for reconnection
4. Add connection status indicator to UI

## Performance Benchmarks

Expected performance metrics:

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Update Latency | < 2s | < 5s | > 5s |
| Reconnection Time | < 3s | < 10s | > 10s |
| CPU Usage | < 30% | < 50% | > 50% |
| Memory Growth | < 10MB/hr | < 50MB/hr | > 50MB/hr |
| Message Loss | 0% | < 1% | > 1% |

## Realtime Configuration Checklist

- [ ] Realtime enabled for production_queue
- [ ] Realtime enabled for character_choices
- [ ] Realtime enabled for production_stages
- [ ] RLS policies allow SELECT for authenticated users
- [ ] WebSocket connection established successfully
- [ ] Test 1: Production queue updates - PASSED
- [ ] Test 2: Character choice updates - PASSED
- [ ] Test 3: Production stage updates - PASSED
- [ ] Test 4: Multiple concurrent users - PASSED
- [ ] Test 5: Performance under load - PASSED
- [ ] Test 6: Reconnection - PASSED
- [ ] Test 7: Filtering (optional) - PASSED/SKIPPED
- [ ] No console errors
- [ ] Performance metrics within acceptable range
- [ ] User experience is smooth and responsive

## Sign-Off

**Tested By:** _________________  
**Date:** _________________  
**Environment:** Staging / Production  
**Result:** PASS / FAIL  
**Notes:** _________________

## Next Steps

After Realtime testing is complete:
1. ✓ Configure Storage bucket (see setup-storage.sql)
2. ✓ Configure email service (see configure-email.md)
3. ✓ Run full integration tests
4. ✓ Deploy to production
