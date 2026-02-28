# Requirements Document: ORDAX Complete System

## Introduction

This requirements document specifies the completion of the ORDAX subscription platform from its current 60-65% implementation to 100% functionality. ORDAX is a premium collectibles subscription platform with a unique made-to-order business model featuring biweekly production cycles, limited monthly capacity, and a controlled freedom system for subscribers.

The system currently has foundational elements in place (database structure, basic cycle system, subscription plans, manual payments, and collections management) but requires completion of critical features including standalone purchases with deposit model, bimonthly rotating collections, automatic choice maintenance, timezone configuration, bonus piece management, comprehensive admin panel, automation systems, and bug fixes.

This specification addresses all missing functionality, bug corrections, and system refinements necessary to achieve full operational capability according to the official ORDAX business structure.

## Glossary

- **ORDAX_Platform**: The complete subscription and e-commerce system for premium collectibles
- **Cycle**: A biweekly production period within a month (Cycle_1: days 1-15, Cycle_2: days 16-end)
- **Cycle_Cutoff**: The deadline for changes and purchases (day 15 at 23:59:59 America/Bahia)
- **Subscriber**: A customer with an active subscription plan (Trimestral or Semestral)
- **Subscription_Plan**: A prepaid package of deliveries (Trimestral: 3 deliveries, Semestral: 6 deliveries)
- **Delivery**: A single piece shipment to a subscriber as part of their subscription plan
- **Collection**: A themed set of collectible pieces available for selection
- **Fixed_Collection**: A collection available every month without rotation
- **Rotating_Collection**: A collection available in alternating months (bimonthly pattern)
- **Active_Collection**: A collection currently available for selection in the current month
- **Collection_Choice**: The subscriber's selected collection for a specific delivery
- **Automatic_Maintenance**: System behavior that preserves previous month's collection choice when subscriber doesn't make new selection
- **Standalone_Purchase**: A single piece purchase without subscription, using deposit model
- **Deposit**: Initial payment (R$100) to reserve a standalone purchase and start production
- **Balance**: Remaining payment amount after deposit for standalone purchase
- **Arras_Confirmatórias**: Non-refundable deposit retained if customer doesn't complete payment
- **Production_Capacity**: Total monthly limit of pieces that can be manufactured
- **Business_Day**: Weekday excluding weekends and holidays (national + Bahia state)
- **Shipping_Deadline**: 5th business day of designated month for cycle completion
- **Bonus_Piece**: Exclusive collectible piece included with 6th delivery of Semestral plan
- **Character_Revelation**: Scheduled disclosure of which character is in a collection piece
- **Bahia_Time**: America/Bahia timezone (UTC-3) used for all system operations
- **Cycle_Status**: Current state of a cycle (open, production, shipping, completed)
- **Admin_Panel**: Administrative interface for managing cycles, collections, deliveries, and capacity
- **Audit_Trail**: Historical record of all collection choice changes made by subscribers
- **Payment_Voucher**: Proof of payment document uploaded by customer for manual verification


## Requirements

### Requirement 1: Timezone Configuration

**User Story:** As a system administrator, I want all date and time operations to use America/Bahia timezone (UTC-3), so that cycle cutoffs and deadlines align with Salvador/BA local time.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL use America/Bahia timezone for all date and time calculations
2. WHEN determining Cycle_Cutoff, THE ORDAX_Platform SHALL calculate day 15 at 23:59:59 in Bahia_Time
3. WHEN calculating Business_Day deadlines, THE ORDAX_Platform SHALL exclude weekends and holidays in Bahia_Time
4. WHEN storing timestamps in database, THE ORDAX_Platform SHALL convert from Bahia_Time to UTC
5. WHEN displaying timestamps to users, THE ORDAX_Platform SHALL convert from UTC to Bahia_Time
6. THE ORDAX_Platform SHALL maintain a holiday calendar including national and Bahia state holidays
7. WHEN calculating 5th Business_Day, THE ORDAX_Platform SHALL skip weekends and holidays from the calendar

### Requirement 2: Cycle Status Management

**User Story:** As a system administrator, I want cycles to transition through defined statuses automatically, so that production workflow is properly controlled.

#### Acceptance Criteria

1. WHEN a new month begins, THE ORDAX_Platform SHALL create Cycle_1 with status "open"
2. WHEN day 16 begins, THE ORDAX_Platform SHALL create Cycle_2 with status "open"
3. WHEN Cycle_Cutoff is reached, THE ORDAX_Platform SHALL transition the cycle status from "open" to "production"
4. WHILE Cycle_Status is "production", THE ORDAX_Platform SHALL prevent new purchases and collection changes
5. WHEN administrator marks production complete, THE ORDAX_Platform SHALL transition Cycle_Status to "shipping"
6. WHEN all deliveries are shipped, THE ORDAX_Platform SHALL transition Cycle_Status to "completed"
7. THE ORDAX_Platform SHALL record status transition timestamps in Bahia_Time

### Requirement 3: Production Capacity Enforcement

**User Story:** As a system administrator, I want total monthly production capacity enforced across all purchases, so that manufacturing limits are never exceeded.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL maintain a configurable Production_Capacity limit per month
2. WHEN a subscription is created, THE ORDAX_Platform SHALL verify available capacity before confirming
3. WHEN a Standalone_Purchase is created, THE ORDAX_Platform SHALL verify available capacity before accepting deposit
4. IF Production_Capacity is reached, THEN THE ORDAX_Platform SHALL display "sold out" message and prevent new purchases
5. THE ORDAX_Platform SHALL calculate capacity usage as sum of all subscription deliveries plus standalone purchases for the month
6. WHEN a subscription is cancelled before Cycle_Cutoff, THE ORDAX_Platform SHALL release the reserved capacity
7. THE ORDAX_Platform SHALL display remaining capacity percentage in Admin_Panel

### Requirement 4: Standalone Purchase with Deposit Model

**User Story:** As a customer, I want to purchase individual pieces with a deposit system, so that I can reserve a piece and pay the balance when ready.

#### Acceptance Criteria

1. WHEN a customer initiates Standalone_Purchase, THE ORDAX_Platform SHALL require R$100 Deposit payment
2. WHEN Deposit payment is confirmed, THE ORDAX_Platform SHALL reserve Production_Capacity and start production
3. THE ORDAX_Platform SHALL calculate Balance as collection price minus Deposit amount
4. WHEN production is complete, THE ORDAX_Platform SHALL notify customer to pay Balance within 5 Business_Day
5. WHEN Balance is paid within deadline, THE ORDAX_Platform SHALL schedule shipping
6. IF Balance is not paid within deadline, THEN THE ORDAX_Platform SHALL cancel order and retain Deposit as Arras_Confirmatórias
7. THE ORDAX_Platform SHALL release Production_Capacity when order is cancelled
8. THE ORDAX_Platform SHALL record Deposit retention reason in order history
9. WHEN customer pays Balance, THE ORDAX_Platform SHALL generate shipping label
10. THE ORDAX_Platform SHALL display Standalone_Purchase status (deposit_paid, awaiting_balance, balance_paid, shipped, cancelled)


### Requirement 5: Bimonthly Rotating Collections

**User Story:** As a system administrator, I want to configure collections as fixed or rotating with bimonthly patterns, so that collection availability follows the business model.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL support two collection types: Fixed_Collection and Rotating_Collection
2. THE ORDAX_Platform SHALL display Fixed_Collection in every month without interruption
3. WHERE a collection is Rotating_Collection, THE ORDAX_Platform SHALL configure rotation pattern (odd months or even months)
4. WHEN determining Active_Collection for a month, THE ORDAX_Platform SHALL include all Fixed_Collection plus Rotating_Collection matching the month pattern
5. THE ORDAX_Platform SHALL display only Active_Collection in collection selection interface
6. WHEN a Rotating_Collection is not active, THE ORDAX_Platform SHALL hide it from customer view
7. THE ORDAX_Platform SHALL display rotation schedule in Admin_Panel (e.g., "Available: Jan, Mar, May, Jul, Sep, Nov")
8. THE ORDAX_Platform SHALL validate that at least 2 Fixed_Collection exist at all times
9. WHEN creating or editing a collection, THE ORDAX_Platform SHALL allow administrator to set rotation type and pattern

### Requirement 6: Automatic Maintenance of Collection Choices

**User Story:** As a subscriber, I want my previous month's collection choice automatically maintained if I don't make a new selection, so that I receive continuous deliveries without manual intervention.

#### Acceptance Criteria

1. WHEN a new delivery cycle begins, THE ORDAX_Platform SHALL check if Subscriber has made Collection_Choice for current month
2. IF Subscriber has not made Collection_Choice, THEN THE ORDAX_Platform SHALL copy previous month's Collection_Choice to current month
3. IF previous Collection_Choice is not an Active_Collection in current month, THEN THE ORDAX_Platform SHALL notify Subscriber to make new selection
4. THE ORDAX_Platform SHALL mark automatically maintained choices with flag "auto_maintained: true"
5. WHEN Subscriber views their delivery schedule, THE ORDAX_Platform SHALL display which choices were automatically maintained
6. THE ORDAX_Platform SHALL allow Subscriber to change automatically maintained choice before Cycle_Cutoff
7. IF Subscriber has no previous Collection_Choice (first delivery), THEN THE ORDAX_Platform SHALL require manual selection

### Requirement 7: Collection Change Blocking After Cutoff

**User Story:** As a system administrator, I want collection changes blocked after day 15, so that production can proceed without disruption.

#### Acceptance Criteria

1. WHEN current date is before Cycle_Cutoff, THE ORDAX_Platform SHALL allow Subscriber to change Collection_Choice
2. WHEN current date is after Cycle_Cutoff, THE ORDAX_Platform SHALL prevent Collection_Choice changes
3. IF Subscriber attempts to change Collection_Choice after Cycle_Cutoff, THEN THE ORDAX_Platform SHALL display message "Changes blocked - production has started"
4. THE ORDAX_Platform SHALL display countdown timer showing time remaining until Cycle_Cutoff
5. WHEN Cycle_Cutoff is reached, THE ORDAX_Platform SHALL disable collection selection buttons
6. THE ORDAX_Platform SHALL apply Cycle_Cutoff rule to both subscription deliveries and standalone purchases
7. WHEN new month begins, THE ORDAX_Platform SHALL re-enable collection changes for next cycle

### Requirement 8: Collection Change Audit Trail

**User Story:** As a system administrator, I want complete history of all collection changes, so that customer disputes can be resolved with evidence.

#### Acceptance Criteria

1. WHEN Subscriber changes Collection_Choice, THE ORDAX_Platform SHALL record change in Audit_Trail
2. THE ORDAX_Platform SHALL store previous collection, new collection, change timestamp, and subscriber ID
3. THE ORDAX_Platform SHALL store IP address and user agent for each change
4. WHEN Subscriber views their delivery history, THE ORDAX_Platform SHALL display all Collection_Choice changes with timestamps
5. THE ORDAX_Platform SHALL allow administrator to view complete Audit_Trail for any subscriber
6. THE ORDAX_Platform SHALL retain Audit_Trail records indefinitely for compliance
7. WHEN automatically maintaining Collection_Choice, THE ORDAX_Platform SHALL record this action in Audit_Trail with reason "automatic_maintenance"


### Requirement 9: Consecutive Delivery Scheduling

**User Story:** As a subscriber, I want my deliveries scheduled consecutively based on my subscription start cycle, so that I receive pieces according to the business model timeline.

#### Acceptance Criteria

1. WHEN Subscription_Plan is created in Cycle_1, THE ORDAX_Platform SHALL schedule first delivery for next month
2. WHEN Subscription_Plan is created in Cycle_2, THE ORDAX_Platform SHALL schedule first delivery for second subsequent month
3. THE ORDAX_Platform SHALL schedule subsequent deliveries in consecutive months after first delivery
4. FOR Trimestral plan, THE ORDAX_Platform SHALL create 3 consecutive delivery records
5. FOR Semestral plan, THE ORDAX_Platform SHALL create 6 consecutive delivery records
6. WHEN a delivery is created, THE ORDAX_Platform SHALL associate it with the appropriate cycle of its month
7. THE ORDAX_Platform SHALL calculate Shipping_Deadline as 5th Business_Day of delivery month
8. WHEN Subscriber views delivery schedule, THE ORDAX_Platform SHALL display all scheduled deliveries with expected shipping dates
9. THE ORDAX_Platform SHALL prevent delivery scheduling if Production_Capacity is exceeded for any scheduled month

### Requirement 10: Automatic Delivery Creation via Cron Job

**User Story:** As a system administrator, I want deliveries created automatically at the start of each month, so that manual intervention is not required.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL execute a cron job daily at 00:01 Bahia_Time
2. WHEN cron job runs on day 1 of month, THE ORDAX_Platform SHALL identify all subscriptions with deliveries scheduled for current month
3. FOR each scheduled delivery, THE ORDAX_Platform SHALL create delivery record with status "pending_choice"
4. IF Subscriber has not made Collection_Choice, THEN THE ORDAX_Platform SHALL apply Automatic_Maintenance rule
5. WHEN Collection_Choice is determined, THE ORDAX_Platform SHALL update delivery status to "confirmed"
6. THE ORDAX_Platform SHALL log all automatic delivery creation actions
7. IF cron job fails, THEN THE ORDAX_Platform SHALL send alert notification to administrator

### Requirement 11: Bonus Piece for Semestral Plan

**User Story:** As a Semestral plan subscriber, I want to receive an exclusive bonus piece with my 6th delivery, so that I get additional value for the longer commitment.

#### Acceptance Criteria

1. WHEN creating Semestral Subscription_Plan, THE ORDAX_Platform SHALL mark 6th delivery as eligible for Bonus_Piece
2. THE ORDAX_Platform SHALL maintain a catalog of exclusive Bonus_Piece items separate from regular collections
3. WHEN 6th delivery is prepared, THE ORDAX_Platform SHALL automatically include one Bonus_Piece
4. THE ORDAX_Platform SHALL not allow Subscriber to choose Bonus_Piece (it is predetermined)
5. WHEN Subscriber views delivery details for 6th delivery, THE ORDAX_Platform SHALL display Bonus_Piece information
6. THE ORDAX_Platform SHALL track Bonus_Piece inventory separately from regular Production_Capacity
7. THE ORDAX_Platform SHALL display Bonus_Piece benefit prominently on Semestral plan purchase page

### Requirement 12: Character Revelation Automation

**User Story:** As a subscriber, I want to be notified when the character in my chosen collection is revealed, so that I experience the excitement of the reveal.

#### Acceptance Criteria

1. WHEN administrator sets Character_Revelation date for a collection, THE ORDAX_Platform SHALL store the date and character details
2. THE ORDAX_Platform SHALL execute a cron job daily at 10:00 Bahia_Time to check for scheduled revelations
3. WHEN Character_Revelation date is reached, THE ORDAX_Platform SHALL update collection status to "revealed"
4. THE ORDAX_Platform SHALL send email notification to all subscribers who chose that collection
5. THE ORDAX_Platform SHALL display revealed character on collection detail page
6. WHEN Subscriber views their delivery, THE ORDAX_Platform SHALL show character image and details after revelation
7. BEFORE Character_Revelation date, THE ORDAX_Platform SHALL display mystery placeholder image


### Requirement 13: Comprehensive Admin Panel - Cycle Dashboard

**User Story:** As a system administrator, I want a comprehensive cycle dashboard, so that I can monitor and manage production cycles effectively.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display current Cycle_1 and Cycle_2 status for current month
2. THE Admin_Panel SHALL show Production_Capacity usage percentage for each cycle
3. THE Admin_Panel SHALL display count of subscription deliveries and standalone purchases per cycle
4. THE Admin_Panel SHALL show time remaining until Cycle_Cutoff
5. THE Admin_Panel SHALL allow administrator to manually transition Cycle_Status
6. THE Admin_Panel SHALL display list of all subscribers with pending Collection_Choice
7. THE Admin_Panel SHALL show breakdown by collection of how many pieces are in production
8. THE Admin_Panel SHALL allow administrator to export cycle data as CSV
9. THE Admin_Panel SHALL display historical cycle data for previous months

### Requirement 14: Comprehensive Admin Panel - Collection Management

**User Story:** As a system administrator, I want full CRUD operations for collections, so that I can manage the collection catalog efficiently.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow administrator to create new collections with all required fields
2. THE Admin_Panel SHALL allow administrator to set collection as Fixed_Collection or Rotating_Collection
3. WHERE collection is Rotating_Collection, THE Admin_Panel SHALL allow administrator to configure rotation pattern
4. THE Admin_Panel SHALL allow administrator to upload collection images and character details
5. THE Admin_Panel SHALL allow administrator to set Character_Revelation date
6. THE Admin_Panel SHALL allow administrator to edit existing collection details
7. THE Admin_Panel SHALL allow administrator to deactivate collections (soft delete)
8. THE Admin_Panel SHALL prevent deletion of collections with existing deliveries
9. THE Admin_Panel SHALL display collection statistics (total pieces sold, current month selections)

### Requirement 15: Comprehensive Admin Panel - Delivery Management

**User Story:** As a system administrator, I want to manage all deliveries from a central interface, so that I can track and update delivery status efficiently.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display list of all deliveries filtered by cycle and status
2. THE Admin_Panel SHALL allow administrator to search deliveries by subscriber name or order number
3. THE Admin_Panel SHALL allow administrator to update delivery status (pending, confirmed, production, shipped, delivered)
4. THE Admin_Panel SHALL allow administrator to add tracking code to delivery
5. WHEN tracking code is added, THE ORDAX_Platform SHALL send notification to subscriber
6. THE Admin_Panel SHALL display delivery details including Collection_Choice, shipping address, and payment status
7. THE Admin_Panel SHALL allow administrator to mark delivery as shipped with shipping date
8. THE Admin_Panel SHALL calculate and display if delivery met Shipping_Deadline
9. THE Admin_Panel SHALL allow bulk status updates for multiple deliveries

### Requirement 16: Comprehensive Admin Panel - Capacity Management

**User Story:** As a system administrator, I want to configure and monitor production capacity, so that manufacturing limits are properly controlled.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow administrator to set monthly Production_Capacity limit
2. THE Admin_Panel SHALL allow administrator to set different capacity limits for different months
3. THE Admin_Panel SHALL display real-time capacity usage across all cycles
4. THE Admin_Panel SHALL show capacity allocation breakdown by collection
5. THE Admin_Panel SHALL alert administrator when capacity reaches 80% threshold
6. THE Admin_Panel SHALL allow administrator to reserve capacity for special orders
7. THE Admin_Panel SHALL display capacity forecast for next 3 months based on active subscriptions


### Requirement 17: Email Notification System

**User Story:** As a subscriber, I want to receive email notifications for important events, so that I stay informed about my deliveries and account status.

#### Acceptance Criteria

1. WHEN Subscription_Plan is confirmed, THE ORDAX_Platform SHALL send welcome email with delivery schedule
2. WHEN new month begins and Collection_Choice is needed, THE ORDAX_Platform SHALL send reminder email
3. WHEN 3 days remain until Cycle_Cutoff, THE ORDAX_Platform SHALL send urgent reminder to subscribers without Collection_Choice
4. WHEN Character_Revelation occurs, THE ORDAX_Platform SHALL send reveal email with character details
5. WHEN delivery enters production, THE ORDAX_Platform SHALL send production started notification
6. WHEN delivery is shipped, THE ORDAX_Platform SHALL send shipping notification with tracking code
7. WHEN Standalone_Purchase production is complete, THE ORDAX_Platform SHALL send balance payment reminder
8. WHEN balance payment deadline approaches (1 day remaining), THE ORDAX_Platform SHALL send urgent payment reminder
9. IF Standalone_Purchase is cancelled due to non-payment, THEN THE ORDAX_Platform SHALL send cancellation notice
10. THE ORDAX_Platform SHALL allow subscribers to configure notification preferences

### Requirement 18: Shipping Carrier Integration

**User Story:** As a system administrator, I want integration with shipping carriers, so that label generation and tracking are automated.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL integrate with Brazilian shipping carrier API (Correios or private carrier)
2. WHEN delivery is ready to ship, THE ORDAX_Platform SHALL generate shipping label via carrier API
3. THE ORDAX_Platform SHALL retrieve tracking code from carrier API
4. THE ORDAX_Platform SHALL store tracking code in delivery record
5. THE ORDAX_Platform SHALL provide tracking link to subscriber in shipping notification
6. THE ORDAX_Platform SHALL poll carrier API daily for tracking status updates
7. WHEN delivery is marked as delivered by carrier, THE ORDAX_Platform SHALL update delivery status automatically
8. THE ORDAX_Platform SHALL calculate shipping cost based on destination address
9. THE ORDAX_Platform SHALL allow administrator to print batch shipping labels for cycle

### Requirement 19: Fixed Price Display Correction

**User Story:** As a customer, I want to see subscription plan prices (not collection prices), so that I understand the fixed-price model correctly.

#### Acceptance Criteria

1. WHEN displaying Subscription_Plan options, THE ORDAX_Platform SHALL show plan price (Trimestral or Semestral)
2. THE ORDAX_Platform SHALL not display individual collection prices to subscribers
3. WHEN Subscriber views collection selection, THE ORDAX_Platform SHALL display message "Included in your plan"
4. THE ORDAX_Platform SHALL display collection prices only for Standalone_Purchase
5. THE ORDAX_Platform SHALL clearly label Standalone_Purchase prices as "Single piece price"
6. THE ORDAX_Platform SHALL display savings calculation comparing plan price to individual collection prices
7. THE ORDAX_Platform SHALL remove any UI elements showing collection prices in subscription flow

### Requirement 20: Subscription-Cycle Association on Creation

**User Story:** As a system administrator, I want subscriptions automatically associated with the correct cycle on creation, so that delivery scheduling is accurate.

#### Acceptance Criteria

1. WHEN Subscription_Plan is created, THE ORDAX_Platform SHALL determine current cycle based on creation date
2. IF creation date is day 1-15, THEN THE ORDAX_Platform SHALL associate subscription with Cycle_1
3. IF creation date is day 16-end, THEN THE ORDAX_Platform SHALL associate subscription with Cycle_2
4. THE ORDAX_Platform SHALL store cycle association in subscription record
5. THE ORDAX_Platform SHALL use cycle association to calculate first delivery month
6. THE ORDAX_Platform SHALL display cycle information in subscription confirmation
7. THE ORDAX_Platform SHALL increment Production_Capacity usage for associated cycle


### Requirement 21: Collection Change History Recording

**User Story:** As a subscriber, I want my collection change history properly recorded, so that I can review my past choices and resolve any disputes.

#### Acceptance Criteria

1. WHEN Subscriber changes Collection_Choice, THE ORDAX_Platform SHALL create record in collection_choice_history table
2. THE ORDAX_Platform SHALL store delivery_id, previous_collection_id, new_collection_id, change_timestamp, and change_reason
3. THE ORDAX_Platform SHALL store user_id of subscriber making the change
4. WHEN Subscriber views delivery details, THE ORDAX_Platform SHALL display change history with timestamps
5. THE ORDAX_Platform SHALL allow Subscriber to see who made each change (self or admin)
6. THE ORDAX_Platform SHALL uncomment and fix the code at MySubscriptions.tsx:605
7. THE ORDAX_Platform SHALL validate that history recording works for both manual and automatic changes

### Requirement 22: Production Limit Enforcement Before Subscription Creation

**User Story:** As a customer, I want to know immediately if capacity is unavailable, so that I don't waste time entering payment information for unavailable subscriptions.

#### Acceptance Criteria

1. WHEN customer views Subscription_Plan purchase page, THE ORDAX_Platform SHALL check available Production_Capacity
2. IF Production_Capacity is insufficient for all scheduled deliveries, THEN THE ORDAX_Platform SHALL display "Sold Out" message
3. THE ORDAX_Platform SHALL prevent customer from proceeding to payment if capacity is unavailable
4. THE ORDAX_Platform SHALL check capacity again before confirming subscription after payment
5. IF capacity becomes unavailable between page load and payment, THEN THE ORDAX_Platform SHALL reject subscription and refund payment
6. THE ORDAX_Platform SHALL display estimated capacity availability date when sold out
7. THE ORDAX_Platform SHALL allow administrator to enable waitlist for sold out periods

### Requirement 23: Subscription Pause Functionality

**User Story:** As a subscriber, I want to pause my subscription until the cycle deadline, so that I can skip a month if needed.

#### Acceptance Criteria

1. WHEN Subscriber requests pause, THE ORDAX_Platform SHALL verify request is before Cycle_Cutoff
2. IF request is before Cycle_Cutoff, THEN THE ORDAX_Platform SHALL mark next delivery as paused
3. THE ORDAX_Platform SHALL shift all subsequent deliveries by one month
4. THE ORDAX_Platform SHALL release Production_Capacity for paused delivery
5. THE ORDAX_Platform SHALL send confirmation email with updated delivery schedule
6. THE ORDAX_Platform SHALL allow maximum of 2 pauses per Subscription_Plan
7. IF Subscriber attempts to pause after Cycle_Cutoff, THEN THE ORDAX_Platform SHALL display error message
8. THE ORDAX_Platform SHALL display pause count remaining in subscriber dashboard

### Requirement 24: Business Day Calculation with Holiday Calendar

**User Story:** As a system administrator, I want accurate business day calculations excluding holidays, so that shipping deadlines are realistic.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL maintain a holiday calendar table with date and description
2. THE ORDAX_Platform SHALL include Brazilian national holidays in calendar
3. THE ORDAX_Platform SHALL include Bahia state holidays in calendar
4. WHEN calculating 5th Business_Day, THE ORDAX_Platform SHALL skip Saturdays and Sundays
5. WHEN calculating 5th Business_Day, THE ORDAX_Platform SHALL skip dates in holiday calendar
6. THE ORDAX_Platform SHALL allow administrator to add custom holidays via Admin_Panel
7. THE ORDAX_Platform SHALL display holiday calendar in Admin_Panel
8. THE ORDAX_Platform SHALL validate that Shipping_Deadline calculation excludes all non-business days


### Requirement 25: Payment Voucher Management

**User Story:** As a customer, I want to upload payment vouchers for manual verification, so that my payments are processed correctly.

#### Acceptance Criteria

1. WHEN customer completes bank transfer or PIX payment, THE ORDAX_Platform SHALL provide voucher upload interface
2. THE ORDAX_Platform SHALL accept image formats (JPG, PNG, PDF) up to 5MB
3. WHEN Payment_Voucher is uploaded, THE ORDAX_Platform SHALL store file securely with order reference
4. THE ORDAX_Platform SHALL update order status to "pending_verification"
5. THE ORDAX_Platform SHALL notify administrator of new voucher requiring verification
6. THE Admin_Panel SHALL display list of orders pending payment verification
7. WHEN administrator verifies payment, THE ORDAX_Platform SHALL update order status to "paid"
8. WHEN administrator rejects payment, THE ORDAX_Platform SHALL notify customer with rejection reason
9. THE ORDAX_Platform SHALL allow customer to upload new voucher if rejected

### Requirement 26: Subscription Cancellation and Refund Policy

**User Story:** As a subscriber, I want clear cancellation rules and refund processing, so that I understand my options if I need to cancel.

#### Acceptance Criteria

1. WHEN Subscriber requests cancellation before first delivery ships, THE ORDAX_Platform SHALL process full refund
2. WHEN Subscriber requests cancellation after first delivery ships, THE ORDAX_Platform SHALL calculate prorated refund
3. THE ORDAX_Platform SHALL calculate refund as (remaining deliveries / total deliveries) × plan price
4. THE ORDAX_Platform SHALL deduct R$50 administrative fee from refund amount
5. THE ORDAX_Platform SHALL cancel all future scheduled deliveries
6. THE ORDAX_Platform SHALL release Production_Capacity for cancelled deliveries
7. THE ORDAX_Platform SHALL send cancellation confirmation email with refund amount and timeline
8. THE ORDAX_Platform SHALL process refund within 10 Business_Day
9. THE Admin_Panel SHALL display cancellation requests requiring approval

### Requirement 27: Subscriber Dashboard Enhancement

**User Story:** As a subscriber, I want a comprehensive dashboard showing all my subscription information, so that I can manage my account effectively.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL display active Subscription_Plan with remaining deliveries
2. THE ORDAX_Platform SHALL display next delivery date and current Collection_Choice
3. THE ORDAX_Platform SHALL show countdown to Cycle_Cutoff for making changes
4. THE ORDAX_Platform SHALL display all past deliveries with tracking information
5. THE ORDAX_Platform SHALL show all upcoming scheduled deliveries
6. THE ORDAX_Platform SHALL display pause count remaining
7. THE ORDAX_Platform SHALL provide quick action buttons (change collection, pause, view tracking)
8. THE ORDAX_Platform SHALL display payment history with voucher download links
9. THE ORDAX_Platform SHALL show Bonus_Piece eligibility for Semestral subscribers

### Requirement 28: Collection Selection Interface Enhancement

**User Story:** As a subscriber, I want an intuitive collection selection interface, so that I can easily choose my preferred collection each month.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL display only Active_Collection for current month
2. THE ORDAX_Platform SHALL highlight currently selected collection
3. THE ORDAX_Platform SHALL display collection images, names, and descriptions
4. THE ORDAX_Platform SHALL show Character_Revelation status (revealed or mystery)
5. THE ORDAX_Platform SHALL display rotation schedule for Rotating_Collection
6. THE ORDAX_Platform SHALL show confirmation dialog before saving collection change
7. THE ORDAX_Platform SHALL display success message after collection change is saved
8. THE ORDAX_Platform SHALL disable selection interface after Cycle_Cutoff with clear explanation
9. THE ORDAX_Platform SHALL show which collection was automatically maintained if applicable


### Requirement 29: Database Migration for Missing Fields

**User Story:** As a system administrator, I want all required database fields added via migration, so that new functionality is properly supported.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL add rotation_type field to collections table (fixed, odd_months, even_months)
2. THE ORDAX_Platform SHALL add character_revelation_date field to collections table
3. THE ORDAX_Platform SHALL add revealed field to collections table (boolean)
4. THE ORDAX_Platform SHALL add auto_maintained field to subscription_deliveries table (boolean)
5. THE ORDAX_Platform SHALL add cycle_id field to subscriptions table
6. THE ORDAX_Platform SHALL add bonus_piece_id field to subscription_deliveries table
7. THE ORDAX_Platform SHALL create holidays table with date, description, type fields
8. THE ORDAX_Platform SHALL create collection_choice_history table with all audit fields
9. THE ORDAX_Platform SHALL create standalone_purchases table with deposit and balance tracking
10. THE ORDAX_Platform SHALL add capacity_limit field to cycles table
11. THE ORDAX_Platform SHALL add tracking_code field to subscription_deliveries table
12. THE ORDAX_Platform SHALL add pause_count field to subscriptions table

### Requirement 30: Code Cleanup and Quality Improvements

**User Story:** As a developer, I want clean, maintainable code without commented sections or dead code, so that the codebase is professional and easy to maintain.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL remove all commented-out code blocks that are not needed
2. THE ORDAX_Platform SHALL uncomment and fix the collection change history code at MySubscriptions.tsx:605
3. THE ORDAX_Platform SHALL add TypeScript types for all new database tables
4. THE ORDAX_Platform SHALL add JSDoc comments to all new functions
5. THE ORDAX_Platform SHALL follow consistent naming conventions across all new code
6. THE ORDAX_Platform SHALL add error handling to all API endpoints
7. THE ORDAX_Platform SHALL add input validation to all form submissions
8. THE ORDAX_Platform SHALL add loading states to all async operations
9. THE ORDAX_Platform SHALL add proper error messages for all failure scenarios

### Requirement 31: Testing and Validation

**User Story:** As a developer, I want comprehensive tests for critical functionality, so that system reliability is ensured.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL include unit tests for timezone conversion functions
2. THE ORDAX_Platform SHALL include unit tests for Business_Day calculation with holiday exclusion
3. THE ORDAX_Platform SHALL include unit tests for Production_Capacity calculation
4. THE ORDAX_Platform SHALL include unit tests for Automatic_Maintenance logic
5. THE ORDAX_Platform SHALL include unit tests for Cycle_Cutoff validation
6. THE ORDAX_Platform SHALL include integration tests for subscription creation flow
7. THE ORDAX_Platform SHALL include integration tests for Standalone_Purchase deposit flow
8. THE ORDAX_Platform SHALL include integration tests for collection change with audit trail
9. THE ORDAX_Platform SHALL include end-to-end tests for complete subscription lifecycle

### Requirement 32: Performance Optimization

**User Story:** As a user, I want fast page load times and responsive interactions, so that my experience is smooth and professional.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL load subscriber dashboard in under 2 seconds
2. THE ORDAX_Platform SHALL load collection selection page in under 1.5 seconds
3. THE ORDAX_Platform SHALL cache Active_Collection data for 1 hour
4. THE ORDAX_Platform SHALL use database indexes on frequently queried fields (subscriber_id, cycle_id, delivery_date)
5. THE ORDAX_Platform SHALL paginate Admin_Panel delivery lists (50 items per page)
6. THE ORDAX_Platform SHALL lazy load collection images
7. THE ORDAX_Platform SHALL optimize database queries to avoid N+1 problems
8. THE ORDAX_Platform SHALL use connection pooling for database connections


### Requirement 33: Security Enhancements

**User Story:** As a system administrator, I want robust security measures, so that customer data and payments are protected.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL validate all user inputs to prevent SQL injection
2. THE ORDAX_Platform SHALL sanitize all user inputs to prevent XSS attacks
3. THE ORDAX_Platform SHALL use HTTPS for all communications
4. THE ORDAX_Platform SHALL encrypt Payment_Voucher files at rest
5. THE ORDAX_Platform SHALL implement rate limiting on API endpoints (100 requests per minute per IP)
6. THE ORDAX_Platform SHALL log all administrative actions with timestamp and admin user
7. THE ORDAX_Platform SHALL require authentication for all subscriber and admin endpoints
8. THE ORDAX_Platform SHALL implement CSRF protection on all form submissions
9. THE ORDAX_Platform SHALL use secure session management with httpOnly cookies

### Requirement 34: Monitoring and Logging

**User Story:** As a system administrator, I want comprehensive logging and monitoring, so that I can troubleshoot issues and track system health.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL log all cron job executions with success/failure status
2. THE ORDAX_Platform SHALL log all payment verifications with administrator and timestamp
3. THE ORDAX_Platform SHALL log all capacity limit checks with available/used counts
4. THE ORDAX_Platform SHALL log all email notifications sent with recipient and status
5. THE ORDAX_Platform SHALL log all API errors with stack traces
6. THE ORDAX_Platform SHALL provide log search interface in Admin_Panel
7. THE ORDAX_Platform SHALL retain logs for minimum 90 days
8. THE ORDAX_Platform SHALL send alert notifications for critical errors (cron failures, payment API failures)
9. THE ORDAX_Platform SHALL track key metrics (subscriptions created, deliveries shipped, capacity usage)

### Requirement 35: Mobile Responsiveness

**User Story:** As a mobile user, I want all pages to work perfectly on my phone, so that I can manage my subscription on any device.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL display subscriber dashboard responsively on screens 320px and wider
2. THE ORDAX_Platform SHALL display collection selection interface responsively with touch-friendly buttons
3. THE ORDAX_Platform SHALL display Admin_Panel tables with horizontal scroll on mobile
4. THE ORDAX_Platform SHALL use mobile-optimized image sizes for collection images
5. THE ORDAX_Platform SHALL display countdown timer responsively
6. THE ORDAX_Platform SHALL make all forms mobile-friendly with appropriate input types
7. THE ORDAX_Platform SHALL test all critical flows on iOS Safari and Android Chrome

### Requirement 36: Accessibility Compliance

**User Story:** As a user with disabilities, I want the platform to be accessible, so that I can use all features independently.

#### Acceptance Criteria

1. THE ORDAX_Platform SHALL provide alt text for all collection images
2. THE ORDAX_Platform SHALL ensure all interactive elements are keyboard accessible
3. THE ORDAX_Platform SHALL maintain color contrast ratio of at least 4.5:1 for text
4. THE ORDAX_Platform SHALL provide ARIA labels for all form inputs
5. THE ORDAX_Platform SHALL ensure screen readers can navigate all pages logically
6. THE ORDAX_Platform SHALL provide skip navigation links
7. THE ORDAX_Platform SHALL ensure all error messages are announced to screen readers
8. THE ORDAX_Platform SHALL support browser zoom up to 200% without breaking layout


## Quality Attributes

### Reliability
- System uptime: 99.5% excluding planned maintenance
- Cron job execution success rate: 99.9%
- Payment processing success rate: 99%
- Email delivery success rate: 98%

### Performance
- Page load time: < 2 seconds for 95th percentile
- API response time: < 500ms for 95th percentile
- Database query time: < 100ms for 95th percentile
- Concurrent users supported: 1000

### Scalability
- Support for 10,000 active subscriptions
- Support for 50,000 deliveries per year
- Support for 100 collections in catalog
- Support for 24 months of historical data readily accessible

### Maintainability
- Code coverage: minimum 80% for critical paths
- Documentation: all public APIs documented
- Code complexity: maximum cyclomatic complexity of 10
- Technical debt: addressed within 2 sprints of identification

### Security
- OWASP Top 10 vulnerabilities: none present
- Data encryption: all sensitive data encrypted at rest and in transit
- Authentication: secure session management with token expiration
- Authorization: role-based access control for admin functions

### Usability
- Task completion rate: 95% for primary flows
- Error rate: < 5% for form submissions
- User satisfaction: minimum 4/5 rating
- Mobile usage: 60% of traffic supported seamlessly

## Integration Points

### External Systems
1. Payment Gateway: Integration for manual payment verification
2. Email Service: SMTP or API integration for transactional emails
3. Shipping Carrier: API integration for label generation and tracking
4. SMS Service: Optional integration for urgent notifications
5. Analytics Platform: Integration for business intelligence

### Internal Systems
1. Database: PostgreSQL or MySQL for data persistence
2. File Storage: S3 or local storage for payment vouchers and images
3. Cache Layer: Redis for session management and data caching
4. Queue System: Background job processing for cron tasks
5. Logging Service: Centralized logging for monitoring and debugging

### API Endpoints Required
1. POST /api/subscriptions - Create new subscription
2. POST /api/standalone-purchases - Create standalone purchase with deposit
3. PUT /api/deliveries/:id/collection - Change collection choice
4. POST /api/deliveries/:id/pause - Pause delivery
5. GET /api/collections/active - Get active collections for current month
6. POST /api/admin/cycles/:id/transition - Transition cycle status
7. POST /api/admin/payments/:id/verify - Verify payment voucher
8. GET /api/admin/capacity - Get capacity usage data
9. POST /api/admin/holidays - Add holiday to calendar
10. GET /api/subscriber/dashboard - Get subscriber dashboard data

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. Database migrations for all new fields and tables
2. Timezone configuration implementation
3. Holiday calendar setup with initial data
4. Code cleanup and commented code resolution

### Phase 2: Core Features (Week 3-5)
1. Bimonthly rotating collections implementation
2. Automatic maintenance of collection choices
3. Collection change audit trail
4. Cycle cutoff enforcement
5. Production capacity enforcement

### Phase 3: Standalone Purchases (Week 6-7)
1. Standalone purchase with deposit model
2. Balance payment tracking
3. Deposit retention logic
4. Standalone purchase admin interface

### Phase 4: Automation (Week 8-9)
1. Cron job for automatic delivery creation
2. Cron job for character revelation
3. Consecutive delivery scheduling
4. Subscription-cycle association on creation

### Phase 5: Admin Panel (Week 10-11)
1. Cycle dashboard
2. Collection management CRUD
3. Delivery management interface
4. Capacity management interface

### Phase 6: Notifications & Integration (Week 12-13)
1. Email notification system
2. Shipping carrier integration
3. Tracking code management
4. Payment voucher management enhancements

### Phase 7: Enhancements (Week 14-15)
1. Bonus piece for Semestral plan
2. Subscription pause functionality
3. Subscriber dashboard enhancement
4. Collection selection interface enhancement

### Phase 8: Quality & Launch (Week 16-17)
1. Testing and validation
2. Performance optimization
3. Security enhancements
4. Mobile responsiveness verification
5. Accessibility compliance verification
6. Monitoring and logging setup
7. Production deployment

### Rollback Strategy
1. Database migrations: reversible migrations for all schema changes
2. Feature flags: all new features behind toggles for gradual rollout
3. Backup strategy: daily database backups retained for 30 days
4. Rollback procedure: documented steps for reverting to previous version
5. Data integrity: validation scripts to verify data consistency after migration

### Data Migration
1. Existing subscriptions: associate with appropriate cycles based on creation date
2. Existing deliveries: backfill cycle associations and auto_maintained flags
3. Existing collections: set as Fixed_Collection by default
4. Payment history: preserve all existing payment records
5. Audit trail: create initial records for existing collection choices

## Success Criteria

The ORDAX Complete System implementation will be considered successful when:

1. All 36 requirements are implemented and tested
2. All identified bugs are fixed and verified
3. System passes security audit with no critical vulnerabilities
4. Performance benchmarks are met for all key metrics
5. Admin panel provides complete operational control
6. Subscriber experience is seamless across all devices
7. Automated processes run reliably without manual intervention
8. Production capacity is enforced and never exceeded
9. All business rules from official structure are implemented
10. System is deployed to production and handling real transactions

## Appendix: Related Specifications

This specification builds upon and completes the following existing specs:
- `.kiro/specs/subscription-collections/requirements.md` - Collection selection model
- `.kiro/specs/premium-club-fixed-price-model/requirements.md` - Fixed pricing structure
- `.kiro/specs/manual-payment-system/requirements.md` - Payment verification workflow

All requirements in this specification take precedence where conflicts exist with previous specifications.
