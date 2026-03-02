# Tasks: Production Management System

## Phase 1: Database Schema & Core Infrastructure (Week 1)

### 1.1 Database Schema Design

- [x] 1.1.1 Create `production_queue` table migration
  - [x] Define all columns with proper types and constraints
  - [x] Add foreign key relationships to subscription_deliveries and standalone_purchases
  - [x] Create indexes for performance (status, priority_score, choice_deadline)
  - [x] Add RLS policies for admin-only access
  - [x] Add triggers for updated_at timestamp

- [x] 1.1.2 Create `character_choices` table migration
  - [ ] Define all columns with proper types and constraints
  - [x] Add foreign key relationships to orders and characters
  - [x] Create indexes for deadline queries and status filtering
  - [x] Add RLS policies (customers see own, admins see all)
  - [ ] Add triggers for updated_at timestamp
  - [x] Add constraint: max 3 changes per order

- [x] 1.1.3 Create `production_stages` table migration
  - [ ] Define all columns with proper types and constraints
  - [x] Add foreign key to production_queue
  - [x] Create indexes for production_queue_id and status
  - [ ] Add RLS policies for admin-only access
  - [ ] Add triggers for updated_at timestamp
  - [x] Add check constraint: startedAt <= completedAt

- [x] 1.1.4 Create database views for optimized queries
  - [x] Create `production_queue_with_details` view (joins customer, collection, character)
  - [x] Create `pending_choices_with_countdown` view (calculates time remaining)
  - [x] Create `production_metrics` view (aggregates stage durations)
  - [x] Add indexes on views for performance

- [x] 1.1.5 Create database functions
  - [x] Function: `calculate_priority_score(order_type, deadline, order_date)` → number
  - [x] Function: `get_production_metrics()` → JSON with counts per stage
  - [x] Function: `check_character_availability(character_id)` → boolean
  - [x] Function: `auto_populate_production_queue()` → trigger on order approval

### 1.2 API Service Layer

- [x] 1.2.1 Create production service (`src/services/admin/production-service.ts`)
  - [x] `fetchProductionQueue(filters, pagination)` → PaginatedResponse<ProductionQueueItem>
  - [x] `fetchProductionMetrics()` → ProductionMetrics
  - [x] `updateProductionStage(id, newStage)` → ProductionQueueItem
  - [x] `assignProduction(id, userId)` → ProductionQueueItem
  - [x] `blockProduction(id, reason)` → ProductionQueueItem
  - [x] `unblockProduction(id)` → ProductionQueueItem

- [x] 1.2.2 Create character choice service (`src/services/admin/choice-service.ts`)
  - [x] `fetchPendingChoices(filters)` → CharacterChoice[]
  - [x] `approveChoice(choiceId)` → CharacterChoice
  - [x] `rejectChoice(choiceId, reason)` → CharacterChoice
  - [x] `extendDeadline(choiceId, newDeadline)` → CharacterChoice
  - [x] `getChoiceHistory(orderId)` → CharacterChoice[]

- [x] 1.2.3 Create customer choice service (`src/services/customer/choice-service.ts`)
  - [x] `getAvailableCharacters(collectionId)` → Character[]
  - [x] `submitCharacterChoice(orderId, characterId)` → CharacterChoice
  - [x] `changeCharacterChoice(choiceId, newCharacterId, reason)` → CharacterChoice
  - [x] `getMyChoice(orderId)` → CharacterChoice | null

- [x] 1.2.4 Create production stage service (`src/services/admin/stage-service.ts`)
  - [x] `getStageHistory(productionQueueId)` → ProductionStageRecord[]
  - [x] `completeStage(stageId, notes, photos)` → ProductionStageRecord
  - [x] `uploadStagePhoto(stageId, file)` → string (URL)
  - [x] `calculateEstimatedCompletion(productionQueueId)` → Date

## Phase 2: Production Dashboard (Week 2-3)

### 2.1 Dashboard Layout & Navigation

- [x] 2.1.1 Create ProductionDashboardPage component
  - [x] Set up page layout with header and metrics bar
  - [x] Add view switcher (Kanban / List / Calendar)
  - [x] Add filter sidebar
  - [x] Implement responsive design

- [ ] 2.1.2 Create ProductionMetricsBar component
  - [ ] Display count per stage with icons
  - [ ] Display average time per stage
  - [ ] Display today's scheduled count
  - [ ] Display this week's scheduled count
  - [ ] Add real-time updates with Supabase Realtime

- [ ] 2.1.3 Create ProductionFilters component
  - [ ] Collection multi-select filter
  - [ ] Priority filter (Critical / High / Normal / Low)
  - [ ] Stage filter (multi-select)
  - [ ] Date range picker
  - [ ] Assigned team member filter
  - [ ] "Clear all filters" button

### 2.2 Kanban View

- [ ] 2.2.1 Create ProductionKanbanBoard component
  - [ ] Create column for each stage
  - [ ] Display item count per column
  - [ ] Implement drag-and-drop with @dnd-kit
  - [ ] Add column collapse/expand
  - [ ] Add "Add to stage" button per column

- [ ] 2.2.2 Create ProductionKanbanCard component
  - [ ] Display customer name and order number
  - [ ] Display collection name with icon
  - [ ] Display priority badge
  - [ ] Display deadline countdown (if applicable)
  - [ ] Display assigned team member avatar
  - [ ] Add quick actions menu (assign, block, view details)

- [ ] 2.2.3 Implement drag-and-drop logic
  - [ ] Validate stage transitions before drop
  - [ ] Show error message for invalid transitions
  - [ ] Optimistic UI update
  - [ ] Rollback on API error
  - [ ] Trigger notification on successful move

### 2.3 List View

- [ ] 2.3.1 Create ProductionListView component
  - [ ] Reuse OrdersTable component structure
  - [ ] Add columns: Customer, Collection, Character, Stage, Priority, Deadline, Assigned To
  - [ ] Implement sorting by any column
  - [ ] Add row selection for bulk actions
  - [ ] Add row click to open detail panel

- [ ] 2.3.2 Implement bulk actions
  - [ ] Bulk assign to team member
  - [ ] Bulk update stage (with validation)
  - [ ] Bulk export to CSV
  - [ ] Show progress modal during bulk operations

### 2.4 Calendar View

- [ ] 2.4.1 Create ProductionCalendarView component
  - [ ] Display month calendar with react-big-calendar
  - [ ] Show items on scheduled production date
  - [ ] Color-code by priority
  - [ ] Add day/week/month view switcher
  - [ ] Add "Today" button

- [ ] 2.4.2 Implement calendar interactions
  - [ ] Click day to see items scheduled for that day
  - [ ] Drag item to reschedule
  - [ ] Add item to calendar from sidebar
  - [ ] Show tooltip on hover with item details

### 2.5 Urgent Alerts

- [ ] 2.5.1 Create UrgentAlertsBar component
  - [ ] Alert: Items with deadline < 24h (red badge)
  - [ ] Alert: Pending choices approaching deadline (yellow badge)
  - [ ] Alert: Blocked items (blue badge)
  - [ ] Alert: Items exceeding average stage time (orange badge)
  - [ ] Click alert to filter dashboard

- [ ] 2.5.2 Implement alert notifications
  - [ ] Browser notification for new critical items
  - [ ] Sound notification (optional, user preference)
  - [ ] Email digest of daily alerts to admins

## Phase 3: Character Choice Management (Week 3-4)

### 3.1 Admin Choice Management Interface

- [ ] 3.1.1 Create CharacterChoiceManagerPage component
  - [ ] Display table of all choices with status
  - [ ] Add filters: Status, Collection, Deadline range
  - [ ] Add search by customer name/email
  - [ ] Show deadline countdown with color coding

- [ ] 3.1.2 Create ChoiceApprovalModal component
  - [ ] Display customer name and order details
  - [ ] Show chosen character with image
  - [ ] Add "Approve" and "Reject" buttons
  - [ ] Add rejection reason textarea
  - [ ] Show character stock level
  - [ ] Add "Suggest alternative" feature if out of stock

- [ ] 3.1.3 Create ChoiceHistoryPanel component
  - [ ] Display all choice changes for an order
  - [ ] Show timestamps and reasons for changes
  - [ ] Show who approved/rejected
  - [ ] Add timeline visualization

- [ ] 3.1.4 Implement deadline management
  - [ ] Add "Extend deadline" button
  - [ ] Show modal to select new deadline
  - [ ] Log deadline extension with reason
  - [ ] Send notification to customer

### 3.2 Customer Choice Interface

- [ ] 3.2.1 Create CharacterSelectionModal component
  - [ ] Display all available characters in grid
  - [ ] Show character images, names, descriptions
  - [ ] Indicate low stock or unavailable characters
  - [ ] Add character preview on hover
  - [ ] Show deadline countdown prominently

- [ ] 3.2.2 Implement character selection logic
  - [ ] Check character availability before submission
  - [ ] Show confirmation dialog with chosen character
  - [ ] Submit choice to API
  - [ ] Show success message
  - [ ] Disable selection after submission

- [ ] 3.2.3 Create ChoiceChangeModal component
  - [ ] Show current choice
  - [ ] Allow selecting new character
  - [ ] Require reason for change
  - [ ] Show remaining changes allowed (max 3)
  - [ ] Disable if already approved or deadline passed

- [ ] 3.2.4 Add choice status to customer order view
  - [ ] Show "Choose Character" button if pending
  - [ ] Show "Choice Submitted - Awaiting Approval" if submitted
  - [ ] Show "Choice Approved" with character image if approved
  - [ ] Show "Change Choice" button if allowed

### 3.3 Deadline & Reminder System

- [ ] 3.3.1 Create deadline calculation function
  - [ ] Set deadline to 7 days after payment approval
  - [ ] Store deadline in character_choices table
  - [ ] Update production_queue with deadline

- [ ] 3.3.2 Create reminder job (runs daily)
  - [ ] Query choices with deadline in 5 days → send first reminder
  - [ ] Query choices with deadline in 2 days → send second reminder
  - [ ] Query choices with deadline in 1 day → send final reminder
  - [ ] Log reminder sent with timestamp

- [ ] 3.3.3 Create deadline expiration job (runs hourly)
  - [ ] Query choices with expired deadline and status = 'pending'
  - [ ] Send notification to admin
  - [ ] Update choice status to 'expired'
  - [ ] Add to urgent alerts

- [ ] 3.3.4 Create reminder email templates
  - [ ] First reminder: "Don't forget to choose your character!"
  - [ ] Second reminder: "Only 2 days left to choose!"
  - [ ] Final reminder: "Last chance - 24 hours remaining!"
  - [ ] Expiration notice to admin: "Customer X didn't choose - action required"

## Phase 4: Production Stage Tracking (Week 4-5)

### 4.1 Stage Progression Interface

- [ ] 4.1.1 Create ProductionStageTracker component
  - [ ] Display all stages in horizontal timeline
  - [ ] Highlight current stage
  - [ ] Show checkmarks for completed stages
  - [ ] Show time spent in each stage
  - [ ] Add "Next Stage" button

- [ ] 4.1.2 Create StageTransitionModal component
  - [ ] Show current and next stage
  - [ ] Add notes textarea
  - [ ] Add photo upload (up to 5 photos)
  - [ ] Show estimated time for next stage
  - [ ] Add "Complete & Move to Next Stage" button

- [ ] 4.1.3 Implement stage validation
  - [ ] Check stages are completed in order
  - [ ] Prevent skipping stages
  - [ ] Allow admin override with justification
  - [ ] Log all stage transitions

- [ ] 4.1.4 Create StageHistoryPanel component
  - [ ] Display all stages with completion times
  - [ ] Show notes and photos for each stage
  - [ ] Calculate and display duration per stage
  - [ ] Highlight stages that took longer than average

### 4.2 Team Assignment

- [ ] 4.2.1 Create AssignmentModal component
  - [ ] Display list of team members
  - [ ] Show current workload per team member
  - [ ] Add search/filter team members
  - [ ] Add "Assign" button

- [ ] 4.2.2 Implement assignment logic
  - [ ] Update production_queue with assigned_to
  - [ ] Send notification to assigned team member
  - [ ] Log assignment with timestamp
  - [ ] Allow reassignment with reason

- [ ] 4.2.3 Create TeamWorkloadView component
  - [ ] Display team members with assigned item count
  - [ ] Show items per team member in expandable list
  - [ ] Add "Reassign" button for load balancing
  - [ ] Show average completion time per team member

### 4.3 Blocking & Issue Management

- [ ] 4.3.1 Create BlockProductionModal component
  - [ ] Add reason textarea (required)
  - [ ] Add estimated resolution time
  - [ ] Add "Block" button
  - [ ] Show impact on estimated completion date

- [ ] 4.3.2 Implement blocking logic
  - [ ] Update production_stages.is_blocked = true
  - [ ] Update production_queue.production_status = 'on_hold'
  - [ ] Recalculate estimated completion date
  - [ ] Send notification to customer with explanation
  - [ ] Add to urgent alerts

- [ ] 4.3.3 Create UnblockProductionModal component
  - [ ] Show original block reason
  - [ ] Add resolution notes
  - [ ] Add "Unblock & Resume" button
  - [ ] Show new estimated completion date

- [ ] 4.3.4 Create BlockedItemsView component
  - [ ] Display all blocked items
  - [ ] Show block reason and duration
  - [ ] Add "Unblock" button
  - [ ] Sort by longest blocked first

### 4.4 Photo & Documentation

- [ ] 4.4.1 Create PhotoUploadComponent
  - [ ] Drag-and-drop file upload
  - [ ] Image preview before upload
  - [ ] Compress images before upload
  - [ ] Upload to Supabase Storage
  - [ ] Store URLs in production_stages.photos

- [ ] 4.4.2 Create PhotoGalleryComponent
  - [ ] Display photos in grid
  - [ ] Click to view full-size
  - [ ] Add lightbox for navigation
  - [ ] Add delete button (admin only)
  - [ ] Show upload date and uploader

- [ ] 4.4.3 Implement photo permissions
  - [ ] Admins can see all photos
  - [ ] Customers can see final product photos only
  - [ ] Photos marked as "customer_visible" flag

## Phase 5: Customer Progress View (Week 5-6)

### 5.1 Customer Order Progress Page

- [ ] 5.1.1 Create CustomerOrderProgressPage component
  - [ ] Display order summary (collection, order number)
  - [ ] Show visual progress timeline
  - [ ] Display estimated dates
  - [ ] Add character selection section (if applicable)
  - [ ] Show tracking information (if shipped)

- [ ] 5.1.2 Create ProgressTimeline component
  - [ ] Display all stages horizontally
  - [ ] Show completed stages with checkmarks
  - [ ] Highlight current stage with animation
  - [ ] Show completion dates for completed stages
  - [ ] Show estimated dates for future stages

- [ ] 5.1.3 Create EstimatedDatesCard component
  - [ ] Display estimated production completion
  - [ ] Display estimated shipping date
  - [ ] Display estimated delivery date
  - [ ] Show "On Track" or "Delayed" indicator
  - [ ] Add explanation for delays

- [ ] 5.1.4 Create CharacterChoiceCard component
  - [ ] Show "Choose Character" button if pending
  - [ ] Show deadline countdown
  - [ ] Display chosen character if selected
  - [ ] Show approval status
  - [ ] Add "Change Choice" button if allowed

### 5.2 Real-Time Updates

- [ ] 5.2.1 Implement Supabase Realtime subscription
  - [ ] Subscribe to production_queue changes for user's orders
  - [ ] Subscribe to character_choices changes
  - [ ] Update UI automatically on changes
  - [ ] Show toast notification on stage change

- [ ] 5.2.2 Create ProgressNotification component
  - [ ] Show toast when stage changes
  - [ ] Show toast when choice is approved/rejected
  - [ ] Show toast when item is shipped
  - [ ] Add sound notification (optional)

### 5.3 Tracking & Delivery

- [ ] 5.3.1 Create TrackingCard component
  - [ ] Display tracking code
  - [ ] Add "Copy" button for tracking code
  - [ ] Link to carrier tracking page
  - [ ] Show carrier name and logo
  - [ ] Display estimated delivery date

- [ ] 5.3.2 Create DeliveryConfirmation component
  - [ ] Show "Mark as Delivered" button
  - [ ] Add delivery date picker
  - [ ] Add optional feedback form
  - [ ] Show confirmation message

## Phase 6: Integration & Testing (Week 6-7)

### 6.1 Integration with Existing Systems

- [ ] 6.1.1 Integrate with OrdersPage
  - [ ] Add "Production Status" column to OrdersTable
  - [ ] Add production stage badge
  - [ ] Link to production dashboard from order detail
  - [ ] Show character choice status in order detail

- [ ] 6.1.2 Create auto-population trigger
  - [ ] Trigger on subscription_deliveries status change to 'confirmed'
  - [ ] Trigger on standalone_purchases status change to 'balance_paid'
  - [ ] Create production_queue record
  - [ ] Create character_choices record if applicable
  - [ ] Initialize production_stages records

- [ ] 6.1.3 Sync status updates
  - [ ] When production stage = 'shipped', update order status to 'shipped'
  - [ ] When production stage = 'delivered', update order status to 'delivered'
  - [ ] Update order tracking_code from production_queue
  - [ ] Update order expected_delivery_date from production calculations

### 6.2 Notification System

- [ ] 6.2.1 Create notification templates
  - [ ] Character choice reminder (3 templates)
  - [ ] Choice approved/rejected
  - [ ] Production started
  - [ ] Stage completed
  - [ ] Item shipped
  - [ ] Item delivered
  - [ ] Production delayed

- [ ] 6.2.2 Implement notification service
  - [ ] Function: `sendChoiceReminder(choiceId)`
  - [ ] Function: `sendChoiceApproval(choiceId)`
  - [ ] Function: `sendStageUpdate(productionQueueId, stage)`
  - [ ] Function: `sendDelayNotification(productionQueueId, reason)`
  - [ ] Queue notifications for batch sending

- [ ] 6.2.3 Create notification preferences
  - [ ] Allow customers to opt-out of non-critical notifications
  - [ ] Store preferences in profiles table
  - [ ] Respect preferences when sending notifications

### 6.3 Testing

- [ ] 6.3.1 Unit tests
  - [ ] Test priority calculation function
  - [ ] Test stage transition validation
  - [ ] Test deadline calculation
  - [ ] Test character availability check
  - [ ] Test notification triggers

- [ ] 6.3.2 Integration tests
  - [ ] Test end-to-end order flow (create → choose → produce → ship)
  - [ ] Test deadline expiration flow
  - [ ] Test blocking and unblocking flow
  - [ ] Test bulk operations
  - [ ] Test real-time updates

- [ ] 6.3.3 Performance tests
  - [ ] Load dashboard with 1000 items → verify < 2s load time
  - [ ] Test concurrent updates from 100 users
  - [ ] Test real-time update latency
  - [ ] Test database query performance with 50k records

- [ ] 6.3.4 User acceptance testing
  - [ ] Test with 5 admin users
  - [ ] Test with 10 customers
  - [ ] Collect feedback on usability
  - [ ] Identify and fix UX issues

## Phase 7: Documentation & Deployment (Week 7)

### 7.1 Documentation

- [ ] 7.1.1 Create admin user guide
  - [ ] How to use production dashboard
  - [ ] How to manage character choices
  - [ ] How to track production stages
  - [ ] How to handle blocking issues
  - [ ] Best practices and tips

- [ ] 7.1.2 Create customer help articles
  - [ ] How to choose a character
  - [ ] How to track your order
  - [ ] What to do if deadline is approaching
  - [ ] How to change your character choice

- [ ] 7.1.3 Create API documentation
  - [ ] Document all API endpoints
  - [ ] Provide request/response examples
  - [ ] Document error codes
  - [ ] Add authentication requirements

- [ ] 7.1.4 Create deployment guide
  - [ ] Database migration steps
  - [ ] Environment variables
  - [ ] Supabase configuration
  - [ ] Rollback procedures

### 7.2 Deployment

- [ ] 7.2.1 Prepare production environment
  - [ ] Review and apply database migrations
  - [ ] Configure Supabase Realtime
  - [ ] Set up Supabase Storage bucket for photos
  - [ ] Configure email service

- [ ] 7.2.2 Deploy to staging
  - [ ] Run database migrations
  - [ ] Deploy frontend code
  - [ ] Test all features in staging
  - [ ] Verify integrations work

- [ ] 7.2.3 Deploy to production
  - [ ] Schedule maintenance window
  - [ ] Run database migrations
  - [ ] Deploy frontend code
  - [ ] Verify deployment
  - [ ] Monitor for errors

- [ ] 7.2.4 Post-deployment
  - [ ] Monitor system performance
  - [ ] Monitor error logs
  - [ ] Collect user feedback
  - [ ] Create bug fix backlog

## Phase 8: Monitoring & Optimization (Ongoing)

### 8.1 Monitoring

- [ ] 8.1.1 Set up performance monitoring
  - [ ] Track dashboard load times
  - [ ] Track API response times
  - [ ] Track database query performance
  - [ ] Set up alerts for slow queries

- [ ] 8.1.2 Set up error monitoring
  - [ ] Track JavaScript errors
  - [ ] Track API errors
  - [ ] Track notification failures
  - [ ] Set up alerts for critical errors

- [ ] 8.1.3 Set up business metrics
  - [ ] Track choice completion rate
  - [ ] Track average production time per stage
  - [ ] Track customer satisfaction scores
  - [ ] Track support ticket reduction

### 8.2 Optimization

- [ ] 8.2.1 Database optimization
  - [ ] Analyze slow queries
  - [ ] Add missing indexes
  - [ ] Optimize complex joins
  - [ ] Implement query caching

- [ ] 8.2.2 Frontend optimization
  - [ ] Implement code splitting
  - [ ] Optimize image loading
  - [ ] Reduce bundle size
  - [ ] Implement service worker for offline support

- [ ] 8.2.3 Process optimization
  - [ ] Analyze production bottlenecks
  - [ ] Optimize stage durations
  - [ ] Improve team assignment algorithm
  - [ ] Automate repetitive tasks

## Success Criteria

The Production Management System will be considered successfully implemented when:

1. ✅ All database migrations are applied and tested
2. ✅ Production dashboard loads in < 2 seconds with 1000 items
3. ✅ Character choice workflow is fully functional end-to-end
4. ✅ Production stage tracking works with proper validation
5. ✅ Customer progress view displays accurate real-time information
6. ✅ Integration with existing OrdersPage works without breaking changes
7. ✅ All notifications are sent correctly and on time
8. ✅ User acceptance testing completed with positive feedback
9. ✅ Performance tests pass all requirements
10. ✅ Documentation is complete and accessible

## Estimated Timeline

- **Phase 1**: 1 week (Database & Infrastructure)
- **Phase 2**: 2 weeks (Production Dashboard)
- **Phase 3**: 1 week (Character Choice Management)
- **Phase 4**: 1 week (Production Stage Tracking)
- **Phase 5**: 1 week (Customer Progress View)
- **Phase 6**: 1 week (Integration & Testing)
- **Phase 7**: 1 week (Documentation & Deployment)
- **Phase 8**: Ongoing (Monitoring & Optimization)

**Total**: 7-8 weeks for initial release
