# Requirements Document: Production Management System

## 1. Feature Overview

### 1.1 Purpose

Provide a comprehensive production management system for an e-commerce platform selling collectible figures with subscriptions. The system enables admins to visualize production queues, manage customer character choices, track production stages, and provide customers with real-time order progress visibility.

### 1.2 Business Value

- **Operational Efficiency**: Reduce time spent searching for "what to produce next" by 80%
- **Customer Satisfaction**: Increase transparency with real-time progress tracking
- **Quality Control**: Ensure proper stage progression with validation and documentation
- **Revenue Protection**: Prevent missed deadlines and lost sales through proactive deadline management

### 1.3 Success Metrics

- Dashboard load time < 2 seconds with 1000+ items
- 95% of character choices made before deadline
- Average production time reduced by 20%
- Customer support tickets about "order status" reduced by 60%

## 2. Functional Requirements

### 2.1 Production Dashboard

#### 2.1.1 Visual Queue Display

**Priority**: Critical
**Description**: Display production queue in multiple view modes (Kanban, List, Calendar)

**Acceptance Criteria**:

- AC1: Dashboard displays all items in production queue with key information (customer, collection, stage, priority)
- AC2: Kanban view shows items organized by production stage with drag-and-drop support
- AC3: List view shows sortable table with all item details
- AC4: Calendar view shows items by scheduled production date
- AC5: View preference is persisted per user

#### 2.1.2 Priority-Based Organization

**Priority**: Critical
**Description**: Automatically calculate and display priority for each production item

**Acceptance Criteria**:

- AC1: Subscriber orders are marked as "High" priority
- AC2: Standalone purchases are marked as "Normal" priority
- AC3: Items with deadline < 24h are marked as "Critical" priority
- AC4: Priority score is calculated based on: order type (40%), deadline proximity (40%), order date (20%)
- AC5: Items are sorted by priority score in all views

#### 2.1.3 Collection & Character Grouping

**Priority**: High
**Description**: Allow filtering and grouping by collection and character for batch production

**Acceptance Criteria**:

- AC1: Filter by one or multiple collections
- AC2: Group items by collection to see batch quantities
- AC3: Group items by character to optimize production runs
- AC4: Display count of items per collection/character
- AC5: Quick filter buttons for "Same Collection" and "Same Character"

#### 2.1.4 Urgent Alerts

**Priority**: Critical
**Description**: Display prominent alerts for items requiring immediate attention

**Acceptance Criteria**:

- AC1: Alert badge shows count of items with deadline < 24h
- AC2: Alert badge shows count of customers who haven't chosen character (deadline approaching)
- AC3: Alert badge shows count of items blocked in production
- AC4: Clicking alert badge filters dashboard to show only urgent items
- AC5: Alerts are color-coded (red = critical, yellow = warning, blue = info)

#### 2.1.5 Real-Time Metrics

**Priority**: Medium
**Description**: Display key production metrics at top of dashboard

**Acceptance Criteria**:

- AC1: Show count of items in each production stage
- AC2: Show average time per production stage
- AC3: Show count of items scheduled for today
- AC4: Show count of items scheduled for this week
- AC5: Metrics update in real-time as items progress

### 2.2 Character Choice Management

#### 2.2.1 Choice Status Tracking

**Priority**: Critical
**Description**: Track and display character choice status for all orders

**Acceptance Criteria**:

- AC1: Display list of all orders with choice status (pending, submitted, approved, rejected, locked)
- AC2: Show deadline countdown for pending choices
- AC3: Visual indicator for choices approaching deadline (< 48h = yellow, < 24h = red)
- AC4: Filter by choice status
- AC5: Sort by deadline (soonest first)

#### 2.2.2 Customer Choice Submission

**Priority**: Critical
**Description**: Allow customers to submit character choices through their order view

**Acceptance Criteria**:

- AC1: Customer sees "Choose Character" button when choice is pending
- AC2: Display available characters from order's collection with images
- AC3: Customer can select one character and submit
- AC4: Show confirmation message after submission
- AC5: Disable character selection after deadline expires

#### 2.2.3 Admin Approval Workflow

**Priority**: High
**Description**: Allow admins to approve or reject customer character choices

**Acceptance Criteria**:

- AC1: Admin sees list of submitted choices awaiting approval
- AC2: Admin can approve choice with one click
- AC3: Admin can reject choice with reason (e.g., "Out of stock")
- AC4: Customer receives notification of approval/rejection
- AC5: Approved choices are locked and cannot be changed

#### 2.2.4 Deadline Management

**Priority**: Critical
**Description**: Automatically manage choice deadlines and send reminders

**Acceptance Criteria**:

- AC1: Deadline is set to 7 days after order payment approval
- AC2: First reminder sent at 5 days before deadline
- AC3: Second reminder sent at 2 days before deadline
- AC4: Final reminder sent at 24 hours before deadline
- AC5: After deadline expires, admin is notified to manually assign character

#### 2.2.5 Choice Change Handling

**Priority**: Medium
**Description**: Allow customers to change their choice before approval (with limits)

**Acceptance Criteria**:

- AC1: Customer can change choice up to 3 times before approval
- AC2: Each change is logged with timestamp and reason
- AC3: After 3 changes, customer must contact support
- AC4: Changes not allowed after admin approval
- AC5: Change history is visible to admin

### 2.3 Production Stage Tracking

#### 2.3.1 Stage Progression

**Priority**: Critical
**Description**: Track orders through sequential production stages

**Acceptance Criteria**:

- AC1: Six stages defined: Awaiting Choice → Design → Production → Quality Check → Packaging → Shipped
- AC2: Stages must be completed in order (cannot skip)
- AC3: Admin can move item to next stage with one click
- AC4: Stage transition triggers customer notification
- AC5: Stage completion time is automatically recorded

#### 2.3.2 Stage Assignment

**Priority**: High
**Description**: Allow assigning production items to specific team members

**Acceptance Criteria**:

- AC1: Admin can assign item to team member at any stage
- AC2: Assigned team member receives notification
- AC3: Filter dashboard by assigned team member
- AC4: Show workload per team member (count of assigned items)
- AC5: Reassignment is logged with reason

#### 2.3.3 Stage Documentation

**Priority**: Medium
**Description**: Allow adding notes and photos at each production stage

**Acceptance Criteria**:

- AC1: Admin can add text notes when completing a stage
- AC2: Admin can upload up to 5 photos per stage
- AC3: Photos are stored securely and accessible only to admins
- AC4: Notes and photos are visible in order detail view
- AC5: Customer can see selected photos (e.g., final product photo)

#### 2.3.4 Blocking Issues

**Priority**: High
**Description**: Handle production delays and blocking issues

**Acceptance Criteria**:

- AC1: Admin can mark stage as "Blocked" with reason
- AC2: Blocked items are highlighted in dashboard
- AC3: Estimated completion date is recalculated when blocked
- AC4: Customer receives notification of delay with explanation
- AC5: Admin can unblock item when issue is resolved

#### 2.3.5 Time Tracking

**Priority**: Medium
**Description**: Automatically track time spent in each production stage

**Acceptance Criteria**:

- AC1: Start time is recorded when item enters stage
- AC2: End time is recorded when stage is completed
- AC3: Duration is calculated and displayed
- AC4: Average duration per stage is calculated across all items
- AC5: Items exceeding average duration by 50% are flagged

### 2.4 Customer Progress View

#### 2.4.1 Visual Progress Timeline

**Priority**: High
**Description**: Display order progress with visual timeline for customers

**Acceptance Criteria**:

- AC1: Show all production stages with current stage highlighted
- AC2: Completed stages show checkmark and completion date
- AC3: Current stage shows progress indicator
- AC4: Future stages show as inactive/grayed out
- AC5: Timeline is responsive and works on mobile devices

#### 2.4.2 Estimated Dates

**Priority**: High
**Description**: Display estimated completion, shipping, and delivery dates

**Acceptance Criteria**:

- AC1: Show estimated production completion date
- AC2: Show estimated shipping date
- AC3: Show estimated delivery date
- AC4: Dates are recalculated when delays occur
- AC5: Show "On Track" or "Delayed" status indicator

#### 2.4.3 Character Selection Interface

**Priority**: Critical
**Description**: Provide intuitive interface for customers to choose characters

**Acceptance Criteria**:

- AC1: Display all available characters with high-quality images
- AC2: Show character name and description
- AC3: Indicate if character is low stock or unavailable
- AC4: Show deadline countdown prominently
- AC5: Confirmation dialog before submitting choice

#### 2.4.4 Order Tracking

**Priority**: High
**Description**: Provide tracking information once order is shipped

**Acceptance Criteria**:

- AC1: Display tracking code once available
- AC2: Link to carrier tracking page
- AC3: Show shipping carrier name
- AC4: Display estimated delivery date from carrier
- AC5: Show delivery confirmation when received

#### 2.4.5 Progress Notifications

**Priority**: Medium
**Description**: Send notifications to customers on stage changes

**Acceptance Criteria**:

- AC1: Email notification when character choice is approved
- AC2: Email notification when production starts
- AC3: Email notification when item is shipped (with tracking)
- AC4: Email notification when item is delivered
- AC5: Customers can opt-out of non-critical notifications

### 2.5 Integration with Existing Systems

#### 2.5.1 Orders System Integration

**Priority**: Critical
**Description**: Seamlessly integrate with existing subscription_deliveries and standalone_purchases tables

**Acceptance Criteria**:

- AC1: Production queue automatically populated from approved orders
- AC2: Status updates in production system sync to orders system
- AC3: Existing OrdersPage shows production status
- AC4: No duplicate data entry required
- AC5: Existing order workflows continue to function

#### 2.5.2 Collections & Characters Integration

**Priority**: Critical
**Description**: Use existing collections and collection_characters tables

**Acceptance Criteria**:

- AC1: Character choices limited to characters in order's collection
- AC2: Character availability checked in real-time
- AC3: Collection images and metadata reused
- AC4: Character stock levels respected
- AC5: New characters automatically available for selection

#### 2.5.3 Notification System Integration

**Priority**: High
**Description**: Use existing notification infrastructure for emails and alerts

**Acceptance Criteria**:

- AC1: Reuse existing email templates with production-specific content
- AC2: Notifications respect user preferences
- AC3: Failed notifications are retried automatically
- AC4: Notification history is logged
- AC5: Admin can manually resend notifications

## 3. Non-Functional Requirements

### 3.1 Performance

#### 3.1.1 Dashboard Load Time

**Priority**: Critical
**Requirement**: Dashboard must load in < 2 seconds with up to 1000 production items
**Measurement**: 95th percentile response time under normal load

#### 3.1.2 Real-Time Updates

**Priority**: High
**Requirement**: Dashboard updates must appear within 5 seconds of data change
**Measurement**: Time from database update to UI refresh

#### 3.1.3 Concurrent Users

**Priority**: High
**Requirement**: System must support 100 concurrent admin users without degradation
**Measurement**: Response time remains < 2s with 100 concurrent users

### 3.2 Scalability

#### 3.2.1 Data Volume

**Priority**: High
**Requirement**: System must handle 50,000 active production items
**Measurement**: Query performance remains acceptable with 50k records

#### 3.2.2 Growth Capacity

**Priority**: Medium
**Requirement**: System must scale to 100,000 items without architectural changes
**Measurement**: Database and API can handle 2x current load

### 3.3 Usability

#### 3.3.1 Admin Learning Curve

**Priority**: High
**Requirement**: New admin users can complete basic tasks within 15 minutes of training
**Measurement**: User testing with 5 new admins

#### 3.3.2 Customer Clarity

**Priority**: High
**Requirement**: 90% of customers understand their order status without contacting support
**Measurement**: Post-delivery survey question

#### 3.3.3 Mobile Responsiveness

**Priority**: High
**Requirement**: Customer progress view must be fully functional on mobile devices
**Measurement**: Manual testing on iOS and Android devices

### 3.4 Reliability

#### 3.4.1 Uptime

**Priority**: Critical
**Requirement**: System must maintain 99.5% uptime during business hours
**Measurement**: Uptime monitoring over 30-day period

#### 3.4.2 Data Integrity

**Priority**: Critical
**Requirement**: Zero data loss or corruption during stage transitions
**Measurement**: Automated integrity checks after each transaction

#### 3.4.3 Notification Delivery

**Priority**: High
**Requirement**: 98% of notifications must be delivered within 5 minutes
**Measurement**: Notification queue monitoring

### 3.5 Security

#### 3.5.1 Access Control

**Priority**: Critical
**Requirement**: Only authorized admins can access production dashboard and make changes
**Measurement**: Penetration testing and access audit

#### 3.5.2 Data Privacy

**Priority**: Critical
**Requirement**: Customer PII must be encrypted at rest and in transit
**Measurement**: Security audit and compliance check

#### 3.5.3 Audit Trail

**Priority**: High
**Requirement**: All production changes must be logged with user ID and timestamp
**Measurement**: Audit log completeness check

## 4. Technical Constraints

### 4.1 Technology Stack

- Frontend: React with TypeScript
- Backend: Supabase (PostgreSQL + API)
- State Management: TanStack Query
- UI Components: Reuse existing shadcn/ui components
- Notifications: Existing email service

### 4.2 Database Constraints

- Must use existing Supabase PostgreSQL database
- Must maintain referential integrity with existing tables
- Must use Row Level Security (RLS) policies
- Maximum 3 new tables (production_queue, character_choices, production_stages)

### 4.3 Integration Constraints

- Must not break existing OrdersPage functionality
- Must reuse existing authentication and authorization
- Must follow existing API patterns and conventions
- Must use existing notification infrastructure

## 5. Assumptions and Dependencies

### 5.1 Assumptions

- Admins have basic computer literacy and can use web applications
- Customers have email addresses and check email regularly
- Production team has stable internet connection
- Character stock levels are maintained accurately in database

### 5.2 Dependencies

- Existing orders system must be functioning correctly
- Collections and characters data must be complete and accurate
- Email service must be operational for notifications
- Supabase Realtime must be enabled for live updates

## 6. Out of Scope

The following features are explicitly out of scope for this initial release:

1. **Inventory Management**: Tracking raw materials and component stock levels
2. **Supplier Integration**: Ordering materials from suppliers
3. **Financial Reporting**: Cost tracking and profit analysis per order
4. **Quality Defect Tracking**: Detailed defect categorization and analysis
5. **Multi-Language Support**: Interface translation (English only for now)
6. **Mobile App**: Native iOS/Android apps (web-only for now)
7. **Advanced Analytics**: Machine learning predictions and optimization
8. **Third-Party Shipping Integration**: Direct API integration with shipping carriers

## 7. Future Enhancements

Potential features for future releases:

1. **Batch Production Optimization**: AI-powered suggestions for optimal batch grouping
2. **Predictive Delays**: Machine learning to predict potential delays
3. **Customer Communication Portal**: In-app chat between customer and production team
4. **Photo Approval Workflow**: Customer approves product photos before shipping
5. **Production Capacity Planning**: Resource allocation and scheduling optimization
6. **Quality Metrics Dashboard**: Defect rates, rework rates, customer satisfaction scores
7. **Mobile App**: Native apps for customers to track orders on-the-go
8. **Automated Shipping Label Generation**: Direct integration with shipping carriers

## 8. Acceptance Criteria Summary

The Production Management System will be considered complete and ready for release when:

1. ✅ All Critical priority requirements are implemented and tested
2. ✅ Dashboard loads in < 2 seconds with 1000 items
3. ✅ Character choice workflow is fully functional end-to-end
4. ✅ Production stage tracking works correctly with validation
5. ✅ Customer progress view displays accurate real-time information
6. ✅ Integration with existing systems works without breaking changes
7. ✅ All security requirements are met (access control, encryption, audit logs)
8. ✅ User acceptance testing completed with 5 admin users and 10 customers
9. ✅ Performance testing shows system meets all performance requirements
10. ✅ Documentation is complete (user guide, API docs, deployment guide)
