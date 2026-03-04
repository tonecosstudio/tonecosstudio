# Admin User Guide: Production Management System

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Production Dashboard](#production-dashboard)
4. [Managing Character Choices](#managing-character-choices)
5. [Tracking Production Stages](#tracking-production-stages)
6. [Handling Blocking Issues](#handling-blocking-issues)
7. [Team Management](#team-management)
8. [Best Practices & Tips](#best-practices--tips)
9. [Troubleshooting](#troubleshooting)
10. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Introduction

Welcome to the Production Management System! This comprehensive guide will help you efficiently manage the production lifecycle of collectible figures, from character selection to delivery.

### What is the Production Management System?

The Production Management System is your central hub for:

- **Visualizing Production Queues**: See what needs to be produced at a glance
- **Managing Character Choices**: Track and approve customer character selections
- **Tracking Production Stages**: Monitor orders through 6 sequential production stages
- **Handling Issues**: Quickly identify and resolve blocking issues
- **Team Coordination**: Assign work and balance team workload

### Key Benefits

- ⚡ **80% faster** production planning - no more searching for "what to produce next"
- 📊 **Real-time visibility** into production status
- 🎯 **Priority-based organization** ensures critical orders are handled first
- 🔔 **Proactive alerts** for deadlines and issues
- 📈 **Performance metrics** to optimize production time

---

## Getting Started

### Accessing the System

1. Log in to the admin dashboard at `https://your-domain.com/admin`
2. Navigate to **Production** in the main menu
3. You'll see the Production Dashboard as your default view

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection
- Admin role permissions


### Dashboard Overview

When you first access the Production Dashboard, you'll see:

- **Metrics Bar** (top): Real-time counts of items in each stage
- **Urgent Alerts** (below metrics): Color-coded alerts for items requiring attention
- **View Switcher** (top right): Toggle between Kanban, List, and Calendar views
- **Filters** (left sidebar): Filter by collection, priority, stage, date, and team member
- **Main Content Area**: Your production queue in the selected view

---

## Production Dashboard

The Production Dashboard is your command center. It provides three different views to suit your workflow.

### View Modes

#### 1. Kanban View (Default)

The Kanban view organizes items by production stage in vertical columns.

**Features:**
- **6 Stage Columns**: Awaiting Choice → Design → Production → Quality Check → Packaging → Shipped
- **Drag-and-Drop**: Move items between stages by dragging cards
- **Item Count**: Each column header shows the number of items in that stage
- **Quick Actions**: Right-click or click the menu icon on any card for quick actions

**How to Use:**
1. Scan columns from left to right to see production flow
2. Drag cards to the next column to advance stages
3. Click a card to view full details
4. Use the collapse button to hide columns you don't need

**Best For:** Visual thinkers, teams that prefer board-style workflows

#### 2. List View

The List view displays all items in a sortable table format.

**Features:**
- **Sortable Columns**: Click any column header to sort
- **Bulk Selection**: Select multiple items with checkboxes
- **Bulk Actions**: Assign, update stage, or export selected items
- **Search**: Quick search by customer name or order number

**How to Use:**
1. Click column headers to sort (e.g., sort by Priority to see critical items first)
2. Use checkboxes to select multiple items
3. Click "Bulk Actions" to perform operations on selected items
4. Click any row to open the detail panel

**Best For:** Data-driven users, bulk operations, detailed analysis


#### 3. Calendar View

The Calendar view shows items scheduled by production date.

**Features:**
- **Month/Week/Day Views**: Switch between different time scales
- **Color-Coded Priority**: Critical (red), High (orange), Normal (blue), Low (gray)
- **Drag to Reschedule**: Drag items to different dates
- **Today Button**: Quickly jump to today's date

**How to Use:**
1. Click "Calendar" in the view switcher
2. Use the date navigation to move between months/weeks
3. Click a day to see all items scheduled for that date
4. Drag items to reschedule production dates
5. Click an item to view details

**Best For:** Planning ahead, scheduling production runs, capacity planning

### Understanding Priority Levels

Items are automatically assigned priority based on multiple factors:

| Priority | Color | Criteria | Action Required |
|----------|-------|----------|-----------------|
| **Critical** | 🔴 Red | Deadline < 24 hours | Immediate action |
| **High** | 🟠 Orange | Subscriber orders | Prioritize |
| **Normal** | 🔵 Blue | Standalone purchases | Standard processing |
| **Low** | ⚪ Gray | Future orders | Plan ahead |

**Priority Score Calculation:**
- Order Type (40%): Subscribers get higher priority
- Deadline Proximity (40%): Closer deadlines = higher priority
- Order Date (20%): Older orders get slight priority boost

### Using Filters

Filters help you focus on specific subsets of your production queue.

**Available Filters:**

1. **Collection Filter**
   - Select one or multiple collections
   - Useful for batch production of same collection
   - Example: Filter "Naruto Collection" to produce all Naruto figures together

2. **Priority Filter**
   - Filter by Critical, High, Normal, or Low
   - Combine multiple priorities
   - Example: Show only Critical and High priority items

3. **Stage Filter**
   - Filter by current production stage
   - Select multiple stages
   - Example: Show items in Design and Production stages

4. **Date Range Filter**
   - Filter by scheduled production date
   - Select start and end dates
   - Example: Show items scheduled for this week

5. **Team Member Filter**
   - Filter by assigned team member
   - See workload per person
   - Example: Show all items assigned to Maria

**Filter Tips:**
- Filters are cumulative (AND logic)
- Click "Clear All Filters" to reset
- Your filter preferences are saved per session
- Use "Save Filter Preset" to save commonly used filter combinations


### Urgent Alerts

The Urgent Alerts bar appears below the metrics and highlights items requiring immediate attention.

**Alert Types:**

1. **🔴 Critical Deadlines** (Red Badge)
   - Items with deadline < 24 hours
   - Click to filter dashboard to show only these items
   - Action: Prioritize these orders immediately

2. **🟡 Pending Choices** (Yellow Badge)
   - Customers who haven't chosen character (deadline approaching)
   - Click to view list of pending choices
   - Action: Send reminder or contact customer

3. **🔵 Blocked Items** (Blue Badge)
   - Items blocked in production
   - Click to view all blocked items
   - Action: Resolve blocking issues

4. **🟠 Delayed Items** (Orange Badge)
   - Items exceeding average stage time by 50%
   - Click to view delayed items
   - Action: Investigate bottlenecks

**Alert Best Practices:**
- Check alerts at the start of each shift
- Address Critical alerts first
- Set up browser notifications for new Critical alerts
- Review Delayed items weekly to identify process improvements

### Real-Time Metrics

The Metrics Bar at the top provides live production statistics:

**Metrics Displayed:**

1. **Items per Stage**
   - Count of items in each of the 6 stages
   - Click a metric to filter dashboard to that stage
   - Example: "Design: 12" means 12 items in Design stage

2. **Average Time per Stage**
   - Historical average duration for each stage
   - Helps identify bottlenecks
   - Example: "Production: 6h avg" means production typically takes 6 hours

3. **Today's Schedule**
   - Count of items scheduled for production today
   - Click to view today's items in calendar view

4. **This Week's Schedule**
   - Count of items scheduled for this week
   - Helps with capacity planning

**Metrics Update Frequency:**
- Real-time updates via Supabase Realtime
- Updates appear within 5 seconds of data changes
- Manual refresh button available if needed

---

## Managing Character Choices

Character choice management ensures customers select their preferred character before production begins.

### Character Choice Workflow

The character choice process follows these steps:

1. **Order Placed** → System creates character choice record with 7-day deadline
2. **Reminders Sent** → Automatic reminders at 5 days, 2 days, and 24 hours before deadline
3. **Customer Chooses** → Customer selects character from available options
4. **Admin Approves** → You review and approve the choice
5. **Production Starts** → Choice is locked and production begins


### Accessing Character Choice Management

1. Navigate to **Production** → **Character Choices** in the main menu
2. Or click the **Pending Choices** alert badge on the dashboard

### Choice Status Types

| Status | Description | Your Action |
|--------|-------------|-------------|
| **Pending** | Customer hasn't chosen yet | Monitor deadline, send reminders |
| **Submitted** | Customer submitted choice | Review and approve/reject |
| **Approved** | You approved the choice | No action needed |
| **Rejected** | You rejected the choice | Customer must choose again |
| **Locked** | Production started | Cannot be changed |
| **Expired** | Deadline passed without choice | Manually assign character |

### Approving Character Choices

**Step-by-Step:**

1. **View Submitted Choices**
   - Go to Character Choices page
   - Filter by Status: "Submitted"
   - Sort by deadline (soonest first)

2. **Review Choice Details**
   - Click on a choice to open the approval modal
   - Review:
     - Customer name and order number
     - Collection name
     - Chosen character with image
     - Character stock level
     - Order priority

3. **Approve the Choice**
   - Verify character is in stock
   - Click "Approve" button
   - System automatically:
     - Locks the choice
     - Updates production queue
     - Sends confirmation email to customer
     - Moves order to "Ready for Production"

4. **Reject the Choice** (if necessary)
   - Click "Reject" button
   - Select rejection reason:
     - Out of stock
     - Character discontinued
     - Invalid selection
     - Other (specify)
   - Add optional notes for customer
   - System automatically:
     - Sends rejection email with reason
     - Allows customer to choose again
     - Extends deadline by 3 days

**Approval Tips:**
- Check stock levels before approving
- Approve choices in priority order (Critical → High → Normal → Low)
- If character is low stock, consider suggesting alternatives
- Add internal notes for tracking purposes


### Handling Expired Choices

When a customer doesn't choose by the deadline:

1. **System Notification**
   - You receive an email notification
   - Item appears in "Expired Choices" filter
   - Urgent alert badge shows count

2. **Manual Assignment Options**
   - **Option A: Contact Customer**
     - Click "Extend Deadline" button
     - Select new deadline (e.g., +3 days)
     - Add reason for extension
     - System sends notification to customer
   
   - **Option B: Assign Default Character**
     - Click "Assign Character" button
     - Select most popular character from collection
     - Add note: "Assigned due to expired deadline"
     - System locks choice and proceeds to production

3. **Best Practice**
   - For high-value orders: Contact customer first
   - For standard orders: Assign most popular character
   - Document your decision in notes

### Managing Choice Changes

Customers can change their approved choice up to 3 times before production starts.

**Reviewing Change Requests:**

1. Navigate to **Character Choices** → **Change Requests**
2. Review change details:
   - Original character
   - New character requested
   - Reason for change
   - Number of changes made (max 3)
3. Approve or reject the change
4. If rejecting, provide clear reason

**Change Limits:**
- Maximum 3 changes per order
- Changes not allowed after production starts
- Changes not allowed after deadline expires
- Each change is logged with timestamp and reason

### Choice History

View complete choice history for any order:

1. Click on an order in the Character Choices page
2. Click "View History" button
3. See timeline of:
   - Initial choice submission
   - All changes with reasons
   - Approval/rejection events
   - Deadline extensions
   - Final locked choice

**Use Cases for History:**
- Resolving customer disputes
- Understanding customer preferences
- Identifying problematic characters (frequently changed)
- Training and quality assurance

---

## Tracking Production Stages

Production stage tracking ensures orders progress smoothly through the manufacturing process.

### The 6 Production Stages

Every order goes through these sequential stages:


| Stage | Description | Typical Duration | Key Activities |
|-------|-------------|------------------|----------------|
| **1. Awaiting Choice** | Waiting for customer character selection | 1-7 days | Monitor deadline, send reminders |
| **2. Design** | Creating design specifications | 2-4 hours | Design review, 3D modeling |
| **3. Production** | Manufacturing the figure | 4-8 hours | Molding, painting, assembly |
| **4. Quality Check** | Quality assurance inspection | 1-2 hours | Inspect for defects, verify quality |
| **5. Packaging** | Packaging for shipment | 30-60 minutes | Box, wrap, add documentation |
| **6. Shipped** | Item shipped to customer | N/A | Generate tracking, update customer |

**Important Rules:**
- ✅ Stages must be completed in order (cannot skip)
- ✅ Each stage must be marked complete before moving to next
- ✅ Time spent in each stage is automatically tracked
- ✅ Customers receive notifications on stage changes

### Advancing Production Stages

**Method 1: Drag-and-Drop (Kanban View)**

1. Switch to Kanban view
2. Drag an item card from one column to the next
3. System validates the transition
4. If valid, stage is updated immediately
5. Customer receives notification

**Method 2: Stage Transition Modal**

1. Click on an item to open details
2. Click "Next Stage" button
3. Stage Transition Modal opens:
   - Shows current and next stage
   - Allows adding notes
   - Allows uploading photos (up to 5)
   - Shows estimated time for next stage
4. Click "Complete & Move to Next Stage"
5. System updates stage and notifies customer

**Method 3: Bulk Update (List View)**

1. Switch to List view
2. Select multiple items with checkboxes
3. Click "Bulk Actions" → "Update Stage"
4. Select target stage
5. Confirm bulk update
6. System validates each transition
7. Progress modal shows update status

### Adding Notes and Photos

Documentation helps track production quality and resolve issues.

**Adding Notes:**
- Click item → "Add Note" button
- Enter note text (e.g., "Used special paint for this order")
- Notes are visible to all admins
- Notes are NOT visible to customers
- Use notes for internal communication

**Uploading Photos:**
- Click item → "Upload Photo" button
- Drag-and-drop or select up to 5 photos
- Photos are automatically compressed
- Mark photos as "Customer Visible" if appropriate
- Photos are stored securely in Supabase Storage

**Photo Best Practices:**
- Take photos at Quality Check stage
- Include final product photo for customer
- Document any defects or issues
- Use good lighting for clear images
- Keep file sizes reasonable (< 5MB per photo)


### Viewing Stage History

See complete stage history for any order:

1. Click on an order
2. Click "Stage History" tab
3. View timeline showing:
   - Stage name
   - Start time and end time
   - Duration (actual vs. estimated)
   - Assigned team member
   - Notes and photos
   - Who completed the stage

**Use Cases:**
- Identify bottlenecks (stages taking too long)
- Review team member performance
- Resolve customer inquiries
- Quality assurance audits
- Process improvement analysis

### Estimated Completion Dates

The system automatically calculates estimated completion dates based on:

- Current stage
- Average duration per remaining stage
- Team workload
- Blocked items (if any)

**Viewing Estimates:**
- Hover over any item to see estimated completion
- Click item → "Estimated Dates" section
- Estimates update in real-time as stages progress

**Factors Affecting Estimates:**
- If item is blocked, estimate is extended
- If stage is taking longer than average, estimate adjusts
- If team member is overloaded, estimate may increase

---

## Handling Blocking Issues

Sometimes production cannot proceed due to issues like missing materials, equipment failure, or quality problems.

### When to Block an Item

Block an item when:
- ❌ Materials are out of stock
- ❌ Equipment is broken or unavailable
- ❌ Quality issue requires rework
- ❌ Customer requested a change
- ❌ Design needs revision
- ❌ Waiting for external dependency

**Do NOT block for:**
- ✅ Normal production delays (use time tracking instead)
- ✅ Team member unavailability (reassign instead)
- ✅ Low priority items (adjust priority instead)

### Blocking an Item

**Step-by-Step:**

1. **Open Block Modal**
   - Click on the item
   - Click "Block Production" button
   - Block Production Modal opens

2. **Provide Details**
   - Select block reason from dropdown:
     - Materials out of stock
     - Equipment failure
     - Quality issue
     - Customer request
     - Design revision needed
     - Other (specify)
   - Add detailed notes explaining the issue
   - Estimate resolution time (hours/days)
   - Click "Block Item"

3. **System Actions**
   - Item status changes to "On Hold"
   - Item is highlighted in red on dashboard
   - Estimated completion date is recalculated
   - Customer receives notification with explanation
   - Item appears in "Blocked Items" alert


### Unblocking an Item

When the issue is resolved:

1. **Open Unblock Modal**
   - Navigate to Blocked Items view (click blue alert badge)
   - Click on the blocked item
   - Click "Unblock Production" button

2. **Provide Resolution Details**
   - Review original block reason
   - Add resolution notes (e.g., "Materials arrived, ready to proceed")
   - Verify new estimated completion date
   - Click "Unblock & Resume"

3. **System Actions**
   - Item status returns to "In Production"
   - Red highlighting is removed
   - Production resumes at current stage
   - Customer receives notification that production resumed
   - Item is removed from Blocked Items alert

### Managing Blocked Items

**Blocked Items View:**

Access via: Dashboard → Click "Blocked Items" alert badge

**Features:**
- List of all blocked items
- Sort by: Longest blocked, Priority, Customer
- Shows block reason and duration
- Quick unblock button
- Bulk unblock option

**Best Practices:**
- Review blocked items daily
- Prioritize unblocking Critical and High priority items
- Communicate with customers about delays
- Document resolution steps for future reference
- Analyze blocking patterns to prevent recurrence

**Preventing Blocks:**
- Maintain adequate material inventory
- Schedule regular equipment maintenance
- Implement quality checks at each stage
- Clarify customer requirements upfront
- Review designs before starting production

### Customer Communication

When blocking an item, the system automatically sends a notification to the customer. You can customize the message:

1. In Block Modal, check "Send custom message"
2. Edit the default message template
3. Include:
   - Clear explanation of the issue
   - Expected resolution time
   - Apology for the delay
   - Contact information for questions

**Example Message:**
```
Hi [Customer Name],

We wanted to update you on your order #[Order Number]. 

We've encountered a temporary delay in production due to [reason]. 
We're working to resolve this and expect to resume production by [date].

Your new estimated delivery date is [date].

We apologize for any inconvenience. If you have questions, please 
contact us at support@example.com.

Thank you for your patience!
```

---

## Team Management

Efficiently assign work and balance team workload.


### Assigning Items to Team Members

**Single Assignment:**

1. Click on an item
2. Click "Assign" button
3. Assignment Modal opens showing:
   - List of team members
   - Current workload per member (item count)
   - Average completion time per member
4. Select team member
5. Add optional assignment notes
6. Click "Assign"
7. Team member receives notification

**Bulk Assignment:**

1. Switch to List view
2. Select multiple items with checkboxes
3. Click "Bulk Actions" → "Assign to Team Member"
4. Select team member
5. Confirm bulk assignment
6. All selected items are assigned

**Reassignment:**

1. Click on an assigned item
2. Click "Reassign" button
3. Select new team member
4. Provide reason for reassignment
5. Click "Reassign"
6. Both team members receive notifications

### Team Workload View

Monitor team capacity and balance workload:

**Accessing Workload View:**
- Dashboard → "Team Workload" tab
- Or click team member name in filters

**Features:**
- List of all team members
- Item count per member
- Average completion time per member
- Expandable list showing assigned items
- Color-coded workload indicators:
  - 🟢 Green: 0-5 items (available)
  - 🟡 Yellow: 6-10 items (moderate)
  - 🔴 Red: 11+ items (overloaded)

**Balancing Workload:**

1. Identify overloaded team members (red indicator)
2. Click "Reassign" on items from overloaded members
3. Assign to available team members (green indicator)
4. Consider priority and skills when reassigning
5. Monitor workload indicators to maintain balance

**Best Practices:**
- Aim for even distribution (5-8 items per member)
- Consider team member skills and specialties
- Prioritize Critical items to most experienced members
- Review workload daily
- Adjust assignments based on performance

### Team Performance Metrics

Track team member performance:

**Metrics Available:**
- Total items completed
- Average completion time per stage
- Quality check pass rate
- On-time completion rate
- Customer satisfaction scores

**Accessing Metrics:**
1. Team Workload View → Click team member name
2. View detailed performance dashboard
3. Filter by date range
4. Export metrics to CSV

**Using Metrics for Improvement:**
- Identify top performers for recognition
- Identify training needs
- Optimize team assignments
- Set performance goals
- Reward efficiency improvements


---

## Best Practices & Tips

### Daily Workflow Recommendations

**Start of Shift:**
1. ✅ Check Urgent Alerts (Critical deadlines, Blocked items)
2. ✅ Review Pending Character Choices (approve/reject)
3. ✅ Check Team Workload (balance if needed)
4. ✅ Review Today's Schedule (items scheduled for today)
5. ✅ Address any Critical priority items first

**During Shift:**
1. ✅ Monitor real-time metrics for changes
2. ✅ Respond to team member questions promptly
3. ✅ Update stages as production progresses
4. ✅ Document issues with notes and photos
5. ✅ Communicate delays to customers proactively

**End of Shift:**
1. ✅ Review incomplete items (reassign if needed)
2. ✅ Check for new blocked items
3. ✅ Update stage progress for all active items
4. ✅ Prepare tomorrow's schedule
5. ✅ Document any issues for next shift

### Efficiency Tips

**1. Use Keyboard Shortcuts**
- `Ctrl/Cmd + K`: Quick search
- `Ctrl/Cmd + F`: Open filters
- `Ctrl/Cmd + N`: Create new item
- `Ctrl/Cmd + S`: Save changes
- `Esc`: Close modal
- `Tab`: Navigate between fields

**2. Batch Similar Work**
- Group items by collection for efficient production
- Approve all character choices at once
- Assign multiple items to same team member
- Update stages in bulk when possible

**3. Use Filter Presets**
- Save commonly used filter combinations
- Examples:
  - "Critical Today": Critical priority + Today's date
  - "Pending Approvals": Submitted character choices
  - "My Team": Items assigned to your team
  - "Blocked": All blocked items

**4. Leverage Calendar View for Planning**
- Schedule batch production runs
- Identify capacity gaps
- Plan for holidays and downtime
- Visualize weekly/monthly workload

**5. Proactive Communication**
- Send reminders before deadlines
- Notify customers of delays immediately
- Keep team members informed of changes
- Document decisions for future reference

### Quality Assurance Tips

**1. Photo Documentation**
- Take photos at Quality Check stage
- Include multiple angles
- Document any defects clearly
- Share final product photo with customer

**2. Stage Validation**
- Don't skip stages (even if tempting)
- Verify quality before advancing
- Add notes for unusual situations
- Flag items that need extra attention

**3. Customer Satisfaction**
- Approve character choices quickly
- Communicate delays proactively
- Provide accurate estimated dates
- Follow up on delivered items


### Common Mistakes to Avoid

❌ **Skipping Stages**
- Problem: Breaks workflow, causes confusion
- Solution: Always complete stages in order

❌ **Ignoring Urgent Alerts**
- Problem: Missed deadlines, unhappy customers
- Solution: Check alerts at start of each shift

❌ **Not Documenting Issues**
- Problem: Can't track patterns or resolve disputes
- Solution: Always add notes when blocking or encountering issues

❌ **Overloading Team Members**
- Problem: Burnout, quality issues, delays
- Solution: Monitor workload and balance regularly

❌ **Poor Customer Communication**
- Problem: Support tickets, negative reviews
- Solution: Communicate proactively, especially about delays

❌ **Not Using Filters**
- Problem: Overwhelmed by too much information
- Solution: Use filters to focus on relevant items

❌ **Forgetting to Update Stages**
- Problem: Inaccurate metrics, customer confusion
- Solution: Update stages in real-time as work progresses

### Optimization Strategies

**1. Reduce Production Time**
- Analyze average stage durations
- Identify bottlenecks (stages taking longest)
- Implement process improvements
- Train team members on efficient techniques
- Invest in better equipment if needed

**2. Improve Character Choice Completion Rate**
- Send reminders earlier (7 days, 5 days, 3 days, 1 day)
- Make character selection interface more appealing
- Offer incentives for early selection
- Provide character recommendations
- Simplify the selection process

**3. Minimize Blocking Issues**
- Maintain adequate material inventory
- Schedule preventive equipment maintenance
- Implement quality checks earlier in process
- Clarify customer requirements upfront
- Create standard operating procedures

**4. Enhance Team Performance**
- Provide regular training
- Recognize and reward top performers
- Set clear performance goals
- Offer constructive feedback
- Foster team collaboration

**5. Increase Customer Satisfaction**
- Provide accurate estimated dates
- Communicate proactively about delays
- Share production photos with customers
- Follow up after delivery
- Collect and act on feedback

---

## Troubleshooting

### Common Issues and Solutions


#### Issue: Dashboard Not Loading

**Symptoms:**
- Blank screen or loading spinner
- Error message: "Failed to load production queue"

**Solutions:**
1. Check internet connection
2. Refresh the page (F5 or Ctrl+R)
3. Clear browser cache and cookies
4. Try a different browser
5. Check if Supabase is operational
6. Contact IT support if issue persists

#### Issue: Cannot Drag Items in Kanban View

**Symptoms:**
- Items don't move when dragged
- Drop zones not highlighting

**Solutions:**
1. Ensure you have admin permissions
2. Check if item is blocked (blocked items can't be moved)
3. Verify stage transition is valid (can't skip stages)
4. Refresh the page
5. Try using Stage Transition Modal instead

#### Issue: Character Choice Not Appearing

**Symptoms:**
- Customer says they chose character but it's not showing
- Choice status still shows "Pending"

**Solutions:**
1. Check if customer completed submission (not just selected)
2. Verify customer's internet connection was stable
3. Check character_choices table in database
4. Look for error logs around submission time
5. Ask customer to try again
6. Manually create choice record if needed

#### Issue: Photos Not Uploading

**Symptoms:**
- Upload fails with error
- Photos don't appear after upload

**Solutions:**
1. Check file size (must be < 5MB per photo)
2. Verify file format (JPG, PNG, WebP supported)
3. Check internet connection stability
4. Try compressing image before upload
5. Verify Supabase Storage bucket permissions
6. Try uploading one photo at a time

#### Issue: Notifications Not Sending

**Symptoms:**
- Customers not receiving emails
- Team members not getting assignment notifications

**Solutions:**
1. Check customer's email address is correct
2. Ask customer to check spam folder
3. Verify email service is operational
4. Check notification preferences (customer may have opted out)
5. Manually resend notification
6. Contact IT support to check email logs

#### Issue: Estimated Dates Seem Wrong

**Symptoms:**
- Estimated completion date is too far in future
- Estimated date doesn't update after stage completion

**Solutions:**
1. Check if item is blocked (extends estimate)
2. Verify average stage durations are accurate
3. Check team workload (high workload extends estimates)
4. Manually recalculate estimates (click "Recalculate" button)
5. Review stage history for anomalies
6. Contact IT support if calculation logic seems broken


#### Issue: Real-Time Updates Not Working

**Symptoms:**
- Dashboard doesn't update automatically
- Need to refresh page to see changes

**Solutions:**
1. Check if Supabase Realtime is enabled
2. Verify browser supports WebSockets
3. Check firewall/proxy settings
4. Try a different network
5. Use manual refresh button as workaround
6. Contact IT support to check Realtime configuration

#### Issue: Bulk Actions Failing

**Symptoms:**
- Bulk update shows errors
- Only some items updated, others failed

**Solutions:**
1. Check error messages for specific items
2. Verify all selected items allow the action
3. Try smaller batches (e.g., 10 items at a time)
4. Check for blocked items in selection
5. Verify stage transitions are valid for all items
6. Try updating items individually to identify problem

### Getting Help

**Internal Support:**
- IT Support: support@example.com
- Production Manager: manager@example.com
- Training Resources: /admin/help/training

**Documentation:**
- Requirements: `.kiro/specs/production-management-system/requirements.md`
- Design: `.kiro/specs/production-management-system/design.md`
- API Docs: `/admin/help/api-docs`

**Reporting Bugs:**
1. Document the issue (screenshots helpful)
2. Note steps to reproduce
3. Include error messages
4. Submit ticket at: support.example.com/tickets
5. Mark as "Production System" category

---

## Keyboard Shortcuts

Speed up your workflow with these keyboard shortcuts:

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search (find orders, customers) |
| `Ctrl/Cmd + F` | Open/close filters sidebar |
| `Ctrl/Cmd + /` | Show keyboard shortcuts help |
| `Ctrl/Cmd + R` | Refresh dashboard |
| `Esc` | Close modal or dialog |

### Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| `G then D` | Go to Dashboard |
| `G then C` | Go to Character Choices |
| `G then T` | Go to Team Workload |
| `G then B` | Go to Blocked Items |
| `1-3` | Switch view (1=Kanban, 2=List, 3=Calendar) |

### Action Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | Create new item |
| `A` | Assign selected item |
| `S` | Advance to next stage |
| `B` | Block selected item |
| `U` | Unblock selected item |
| `E` | Edit selected item |
| `Delete` | Delete selected item (with confirmation) |


### List View Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + A` | Select all items |
| `Ctrl/Cmd + D` | Deselect all items |
| `Shift + Click` | Select range of items |
| `Ctrl/Cmd + Click` | Toggle item selection |
| `↑ / ↓` | Navigate between rows |
| `Enter` | Open selected item details |

### Modal Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Move to next field |
| `Shift + Tab` | Move to previous field |
| `Ctrl/Cmd + Enter` | Submit form |
| `Esc` | Close modal without saving |

### Filter Shortcuts

| Shortcut | Action |
|----------|--------|
| `F then P` | Filter by Priority |
| `F then S` | Filter by Stage |
| `F then C` | Filter by Collection |
| `F then T` | Filter by Team Member |
| `F then X` | Clear all filters |

**Tip:** Hover over any button to see its keyboard shortcut in the tooltip.

---

## Quick Reference Card

### Priority Levels
- 🔴 **Critical**: < 24h deadline
- 🟠 **High**: Subscriber orders
- 🔵 **Normal**: Standalone purchases
- ⚪ **Low**: Future orders

### Production Stages
1. Awaiting Choice (1-7 days)
2. Design (2-4 hours)
3. Production (4-8 hours)
4. Quality Check (1-2 hours)
5. Packaging (30-60 min)
6. Shipped

### Choice Status
- **Pending**: Customer hasn't chosen
- **Submitted**: Awaiting your approval
- **Approved**: Ready for production
- **Rejected**: Customer must choose again
- **Locked**: Production started
- **Expired**: Deadline passed

### Alert Colors
- 🔴 Red: Critical deadlines
- 🟡 Yellow: Pending choices
- 🔵 Blue: Blocked items
- 🟠 Orange: Delayed items

### When to Block
- ❌ Materials out of stock
- ❌ Equipment failure
- ❌ Quality issue
- ❌ Customer change request
- ❌ Design revision needed

### Daily Checklist
- [ ] Check urgent alerts
- [ ] Approve character choices
- [ ] Balance team workload
- [ ] Review today's schedule
- [ ] Address critical items
- [ ] Update stage progress
- [ ] Document issues
- [ ] Communicate delays

---

## Appendix: System Specifications

### Performance Targets
- Dashboard load time: < 2 seconds (with 1000 items)
- Real-time update latency: < 5 seconds
- Concurrent users supported: 100+
- Data capacity: 50,000+ active items

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Mobile Support
- Customer progress view: Fully responsive
- Admin dashboard: Desktop/tablet recommended
- Minimum screen width: 768px for optimal experience

### Data Retention
- Production records: Retained indefinitely
- Stage history: Retained indefinitely
- Photos: Retained for 2 years after delivery
- Audit logs: Retained for 2 years
- Notification logs: Retained for 90 days

### Security
- Role-based access control (RBAC)
- Row-level security (RLS) policies
- Encrypted data at rest and in transit
- Audit logging for all changes
- Session timeout: 8 hours

---

## Conclusion

Congratulations! You now have a comprehensive understanding of the Production Management System.

### Key Takeaways

1. **Dashboard is Your Command Center**: Use it to visualize and manage your entire production queue
2. **Priority Matters**: Always address Critical items first
3. **Character Choices Need Attention**: Monitor deadlines and approve promptly
4. **Stages Must Be Sequential**: Don't skip stages, maintain quality
5. **Communication is Key**: Keep customers informed, especially about delays
6. **Team Balance is Important**: Monitor workload and distribute evenly
7. **Document Everything**: Use notes and photos for quality and accountability

### Next Steps

1. **Explore the Dashboard**: Spend time clicking around and familiarizing yourself
2. **Practice Common Tasks**: Try approving choices, advancing stages, assigning items
3. **Set Up Your Preferences**: Configure filters, notifications, and shortcuts
4. **Review Metrics**: Understand your current production performance
5. **Identify Improvements**: Look for bottlenecks and optimization opportunities

### Continuous Improvement

The Production Management System is designed to evolve with your needs:

- Share feedback with the development team
- Suggest new features or improvements
- Report bugs or usability issues
- Participate in training sessions
- Help train new team members

### Support

Remember, help is always available:

- **This Guide**: Bookmark for quick reference
- **IT Support**: support@example.com
- **Training Resources**: /admin/help/training
- **API Documentation**: /admin/help/api-docs

Thank you for using the Production Management System. Here's to efficient, high-quality production! 🎉

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: Production Management Team  
**Feedback**: Please send suggestions to support@example.com
