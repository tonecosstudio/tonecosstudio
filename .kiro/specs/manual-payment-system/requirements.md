# Requirements Document: Manual Payment System

## Introduction

The Manual Payment System is a flexible payment processing solution for the Ordax collectibles e-commerce platform. This system enables administrators to configure multiple payment methods (PIX, PagSeguro, PicPay, PayPal, bank transfer, etc.) and manually verify payment proofs uploaded by customers. The system integrates with the existing support conversation infrastructure to facilitate communication between customers and administrators regarding payment verification.

This is a temporary solution designed to provide payment flexibility until a fully automated payment gateway (e.g., Mercado Pago) is integrated. The system must handle both one-time purchases (quotes/orders) and recurring subscription payments.

## Glossary

- **Manual_Payment_System**: The complete payment processing system that allows manual verification of payments
- **Payment_Method**: A configured payment option (PIX, PagSeguro, PicPay, PayPal, bank transfer, etc.)
- **Payment_Proof**: Digital evidence of payment (image or PDF) uploaded by customers
- **Payment_Record**: A database record tracking a pending payment transaction
- **Support_Conversation**: An existing chat system for asynchronous communication between customers and administrators
- **Admin**: A user with administrative privileges who can verify and approve payments
- **Customer**: A user who makes purchases or subscribes to collections
- **Quote**: An existing order/purchase request in the system
- **Subscription**: An existing recurring payment plan for collectible deliveries
- **Payment_Status**: The current state of a payment (pending, under_review, requires_info, approved, rejected)
- **Supabase_Storage**: The file storage system used for storing payment proofs
- **RLS_Policy**: Row Level Security policy that controls data access in Supabase
- **Transactional_Email**: Automated email notifications sent to users about payment status changes

## Requirements

### Requirement 1: Payment Method Configuration

**User Story:** As an admin, I want to configure multiple payment methods with their instructions and details, so that customers can choose from available payment options.

#### Acceptance Criteria

1. THE Admin_Interface SHALL provide a form to create new payment methods
2. WHEN creating a payment method, THE System SHALL require: name, type, instructions, and is_active status
3. WHEN creating a payment method, THE System SHALL optionally accept: payment_link, pix_key, account_details
4. THE System SHALL support payment method types: PIX, PagSeguro, PicPay, PayPal, bank_transfer, other
5. WHEN an admin activates a payment method, THE System SHALL make it visible to customers
6. WHEN an admin deactivates a payment method, THE System SHALL hide it from customers while preserving existing payment records
7. THE Admin_Interface SHALL allow setting one payment method as default
8. WHEN a payment method is set as default, THE System SHALL unset any previously default payment method
9. THE System SHALL store all payment method configurations in the payment_methods table
10. THE System SHALL allow admins to edit existing payment method details

### Requirement 2: Customer Payment Initiation

**User Story:** As a customer, I want to select a payment method and receive payment instructions, so that I can complete my purchase or subscription payment.

#### Acceptance Criteria

1. WHEN a customer initiates payment for a quote, THE System SHALL display all active payment methods
2. WHEN a customer initiates payment for a subscription, THE System SHALL display all active payment methods
3. WHEN a customer selects a payment method, THE System SHALL display the payment instructions configured for that method
4. WHEN a customer selects a payment method, THE System SHALL display the payment_link or pix_key if configured
5. THE System SHALL create a Payment_Record with status 'pending' when payment is initiated
6. THE Payment_Record SHALL reference either a quote_id or subscription_id
7. THE Payment_Record SHALL store: user_id, payment_method_id, amount, currency, payment_type (one_time or recurring)
8. WHEN a Payment_Record is created, THE System SHALL generate a unique payment reference number
9. THE System SHALL allow customers to proceed without uploading proof immediately
10. THE Customer_Interface SHALL provide clear instructions on how to complete the payment

### Requirement 3: Payment Proof Upload

**User Story:** As a customer, I want to upload proof of my payment, so that the admin can verify and approve my transaction.

#### Acceptance Criteria

1. THE System SHALL accept file uploads in formats: JPG, PNG, PDF
2. WHEN a customer uploads a file, THE System SHALL validate the file type
3. WHEN a customer uploads a file, THE System SHALL validate the file size is ≤ 5MB
4. WHEN a file exceeds 5MB, THE System SHALL reject the upload and display an error message
5. WHEN a file type is invalid, THE System SHALL reject the upload and display an error message
6. THE System SHALL allow up to 5 files per Payment_Record
7. WHEN a customer uploads a file, THE System SHALL store it in Supabase_Storage bucket 'payment-proofs'
8. WHEN an image file is uploaded, THE System SHALL generate a thumbnail
9. THE System SHALL create a record in payment_files table linking the file to the Payment_Record
10. THE System SHALL generate secure URLs with expiration for accessing payment proof files
11. WHEN a customer uploads the first proof, THE System SHALL update Payment_Record status to 'under_review'
12. THE System SHALL allow customers to upload additional files after initial submission

### Requirement 4: Automatic Support Conversation Creation

**User Story:** As a customer, I want an automatic support conversation created for my payment, so that I can communicate with the admin about my payment verification.

#### Acceptance Criteria

1. WHEN a Payment_Record is created, THE System SHALL automatically create a Support_Conversation
2. THE Support_Conversation SHALL have subject format: "Pagamento - Pedido #[payment_reference_number]"
3. THE Support_Conversation SHALL link to the Payment_Record via payment_id reference
4. THE Support_Conversation SHALL have initial status 'waiting_admin'
5. WHEN a Support_Conversation is created, THE System SHALL insert a first message from the system
6. THE first message SHALL contain: payment method, amount, payment instructions, and reference number
7. WHEN a customer uploads payment proof, THE System SHALL attach the file URL to the first message
8. THE Support_Conversation SHALL allow both customer and admin to send messages
9. THE System SHALL preserve all messages and attachments in the conversation history
10. WHEN a customer sends a message, THE System SHALL update conversation status to 'waiting_admin'
11. WHEN an admin sends a message, THE System SHALL update conversation status to 'waiting_customer'

### Requirement 5: Admin Payment Dashboard

**User Story:** As an admin, I want a dashboard showing all pending payments with filtering options, so that I can efficiently manage payment verifications.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display all Payment_Records with status 'pending' or 'under_review' or 'requires_info'
2. THE Admin_Dashboard SHALL display for each payment: reference number, customer name, amount, payment method, status, creation date
3. THE Admin_Dashboard SHALL provide filters for: status, payment method, date range, customer name
4. WHEN an admin applies a filter, THE System SHALL update the displayed payments list
5. THE Admin_Dashboard SHALL sort payments by creation date (newest first) by default
6. THE Admin_Dashboard SHALL allow sorting by: date, amount, customer name, status
7. THE Admin_Dashboard SHALL display a count of pending payments requiring action
8. THE Admin_Dashboard SHALL provide a search function to find payments by reference number or customer name
9. WHEN an admin clicks on a payment, THE System SHALL display the payment details view
10. THE Admin_Dashboard SHALL refresh automatically when new payments are created

### Requirement 6: Admin Payment Verification

**User Story:** As an admin, I want to view payment details and uploaded proofs, so that I can verify the payment authenticity.

#### Acceptance Criteria

1. THE Payment_Details_View SHALL display: customer information, payment method, amount, reference number, creation date, current status
2. THE Payment_Details_View SHALL display all uploaded payment proof files
3. WHEN a proof file is an image, THE System SHALL display a thumbnail with option to view full size
4. WHEN a proof file is a PDF, THE System SHALL display a PDF icon with option to download
5. THE Payment_Details_View SHALL provide a link to the associated Support_Conversation
6. THE Payment_Details_View SHALL display the linked quote or subscription details
7. THE System SHALL allow admins to download all payment proof files
8. THE Payment_Details_View SHALL display payment history showing all status changes with timestamps
9. THE Payment_Details_View SHALL show which admin performed each action
10. THE System SHALL implement RLS_Policy allowing admins to view all payment proofs

### Requirement 7: Admin Payment Actions

**User Story:** As an admin, I want to approve, reject, or request more information about a payment, so that I can manage the payment verification workflow.

#### Acceptance Criteria

1. THE Payment_Details_View SHALL provide action buttons: Approve, Reject, Request More Info
2. WHEN an admin clicks Approve, THE System SHALL prompt for confirmation
3. WHEN an admin confirms approval, THE System SHALL update Payment_Record status to 'approved'
4. WHEN a payment is approved, THE System SHALL update the linked quote or subscription status
5. WHEN a payment is approved for a quote, THE System SHALL update quote status to 'paid'
6. WHEN a payment is approved for a subscription, THE System SHALL update subscription status to 'active'
7. WHEN a payment is approved for a subscription, THE System SHALL create subscription_deliveries records
8. WHEN an admin clicks Reject, THE System SHALL prompt for a rejection reason
9. WHEN an admin confirms rejection, THE System SHALL update Payment_Record status to 'rejected'
10. WHEN a payment is rejected, THE System SHALL store the rejection reason
11. WHEN an admin clicks Request More Info, THE System SHALL prompt for a message
12. WHEN an admin confirms request, THE System SHALL update Payment_Record status to 'requires_info'
13. WHEN status changes to 'requires_info', THE System SHALL send a message in the Support_Conversation
14. THE System SHALL record all admin actions in payment_audit_log table
15. THE System SHALL store: action type, admin_id, timestamp, reason/notes for each action

### Requirement 8: Payment Status Workflow

**User Story:** As a system, I want to enforce a clear payment status workflow, so that payment states are consistent and trackable.

#### Acceptance Criteria

1. THE System SHALL support payment statuses: pending, under_review, requires_info, approved, rejected
2. WHEN a Payment_Record is created, THE System SHALL set initial status to 'pending'
3. WHEN first payment proof is uploaded, THE System SHALL transition status from 'pending' to 'under_review'
4. WHEN an admin requests more info, THE System SHALL transition status to 'requires_info'
5. WHEN a customer uploads new proof while status is 'requires_info', THE System SHALL transition status to 'under_review'
6. WHEN an admin approves a payment, THE System SHALL transition status to 'approved'
7. WHEN an admin rejects a payment, THE System SHALL transition status to 'rejected'
8. THE System SHALL prevent status transitions from 'approved' to any other status
9. THE System SHALL prevent status transitions from 'rejected' to any other status except 'under_review' (for re-submission)
10. THE System SHALL record all status transitions in payment_audit_log table

### Requirement 9: Email Notifications

**User Story:** As a customer, I want to receive email notifications about my payment status, so that I stay informed about the verification process.

#### Acceptance Criteria

1. WHEN a Payment_Record is created, THE System SHALL send a Transactional_Email to the customer
2. THE payment creation email SHALL contain: payment reference number, amount, payment method, instructions
3. WHEN payment status changes to 'under_review', THE System SHALL send a Transactional_Email to all admins
4. THE admin notification email SHALL contain: customer name, payment reference, amount, link to payment details
5. WHEN payment status changes to 'approved', THE System SHALL send a Transactional_Email to the customer
6. THE approval email SHALL contain: payment reference, amount, confirmation message, next steps
7. WHEN payment status changes to 'rejected', THE System SHALL send a Transactional_Email to the customer
8. THE rejection email SHALL contain: payment reference, rejection reason, instructions for re-submission
9. WHEN payment status changes to 'requires_info', THE System SHALL send a Transactional_Email to the customer
10. THE requires_info email SHALL contain: payment reference, admin message, instructions for providing additional information
11. WHEN a new message is posted in a payment Support_Conversation, THE System SHALL send a Transactional_Email to the other party
12. THE message notification email SHALL contain: payment reference, message preview, link to conversation

### Requirement 10: In-App Notifications

**User Story:** As a user, I want to see in-app notification badges for payment updates, so that I can quickly see when action is needed.

#### Acceptance Criteria

1. THE System SHALL display a notification badge count for unread payment-related messages
2. WHEN a customer has a payment with status 'requires_info', THE Customer_Interface SHALL display a notification badge
3. WHEN an admin has pending payments to review, THE Admin_Interface SHALL display a notification badge count
4. WHEN a new message is posted in a payment Support_Conversation, THE System SHALL increment the notification badge
5. WHEN a user views a payment or conversation, THE System SHALL mark related notifications as read
6. THE System SHALL use Supabase Realtime to update notification badges without page refresh
7. THE notification badge SHALL display the count of unread items (maximum display: 99+)
8. WHEN a user clicks the notification badge, THE System SHALL navigate to the relevant payment or conversation
9. THE System SHALL persist notification read status in the database
10. THE System SHALL clear notification badges when the user views the related content

### Requirement 11: Payment History and Audit Trail

**User Story:** As an admin, I want to view complete payment history and audit logs, so that I can track all actions and maintain accountability.

#### Acceptance Criteria

1. THE System SHALL maintain a payment_audit_log table recording all payment actions
2. THE payment_audit_log SHALL store: payment_id, action_type, admin_id, timestamp, notes, old_status, new_status
3. THE Payment_Details_View SHALL display the complete audit trail for a payment
4. THE audit trail SHALL show: action, admin name, timestamp, notes in chronological order
5. THE System SHALL preserve all uploaded payment proof files indefinitely
6. THE System SHALL preserve all Support_Conversation messages related to payments
7. THE Admin_Interface SHALL provide a payment history report showing all payments within a date range
8. THE payment history report SHALL include: reference number, customer, amount, method, status, dates
9. THE System SHALL allow exporting payment history to CSV format
10. THE System SHALL allow exporting payment history to PDF format
11. THE exported report SHALL include summary statistics: total payments, total amount, approval rate
12. THE System SHALL implement data retention policies compliant with GDPR requirements

### Requirement 12: Bulk Admin Operations

**User Story:** As an admin, I want to perform bulk operations on multiple payments, so that I can efficiently manage high volumes of payments.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide checkboxes to select multiple payments
2. THE Admin_Dashboard SHALL provide a "Select All" option for current page
3. WHEN multiple payments are selected, THE System SHALL display bulk action buttons
4. THE System SHALL provide bulk action: Approve Selected
5. WHEN bulk approve is triggered, THE System SHALL prompt for confirmation with count of selected payments
6. WHEN bulk approve is confirmed, THE System SHALL approve all selected payments with status 'under_review'
7. THE System SHALL skip payments that cannot be approved (wrong status) and report them
8. THE System SHALL provide bulk action: Export Selected
9. WHEN bulk export is triggered, THE System SHALL generate a CSV file with selected payment details
10. THE System SHALL provide bulk action: Send Message to Customers
11. WHEN bulk message is triggered, THE System SHALL prompt for message text
12. WHEN bulk message is confirmed, THE System SHALL post the message to each selected payment's Support_Conversation
13. THE System SHALL execute bulk operations asynchronously for large selections (>10 items)
14. THE System SHALL display progress indicator during bulk operations
15. THE System SHALL display summary report after bulk operation completion

### Requirement 13: Customer Self-Service

**User Story:** As a customer, I want to view my payment history and status, so that I can track my payments without contacting support.

#### Acceptance Criteria

1. THE Customer_Interface SHALL provide a "My Payments" page
2. THE My_Payments_Page SHALL display all payments created by the customer
3. THE My_Payments_Page SHALL show for each payment: reference number, amount, payment method, status, creation date
4. THE My_Payments_Page SHALL provide status indicators with clear visual distinction (pending, under_review, approved, rejected)
5. WHEN a customer clicks on a payment, THE System SHALL display the payment details
6. THE payment details SHALL show: reference number, amount, payment method, instructions, current status, status history
7. THE payment details SHALL display all uploaded payment proofs
8. WHEN payment status is 'rejected', THE System SHALL display the rejection reason
9. WHEN payment status is 'rejected', THE System SHALL allow the customer to upload new payment proof
10. WHEN payment status is 'requires_info', THE System SHALL display the admin's message
11. WHEN payment status is 'requires_info', THE System SHALL allow the customer to upload additional files
12. THE payment details SHALL provide a link to the associated Support_Conversation
13. THE payment details SHALL allow downloading a payment receipt when status is 'approved'
14. THE System SHALL generate a PDF receipt containing: payment reference, amount, date, payment method, approval date
15. THE My_Payments_Page SHALL allow filtering by status and date range

### Requirement 14: File Security and Validation

**User Story:** As a system administrator, I want robust file upload security and validation, so that the system is protected from malicious files and abuse.

#### Acceptance Criteria

1. THE System SHALL validate file MIME type matches the file extension
2. THE System SHALL reject files with mismatched MIME types and extensions
3. THE System SHALL scan uploaded files for malware signatures
4. WHEN a file fails malware scan, THE System SHALL reject the upload and log the incident
5. THE System SHALL implement rate limiting: maximum 10 file uploads per user per hour
6. WHEN rate limit is exceeded, THE System SHALL reject the upload with error message
7. THE System SHALL generate unique file names to prevent overwrites and path traversal attacks
8. THE System SHALL store files in Supabase_Storage with private access (not public URLs)
9. THE System SHALL implement RLS_Policy: customers can only access their own payment proof files
10. THE System SHALL implement RLS_Policy: admins can access all payment proof files
11. THE System SHALL generate signed URLs with 1-hour expiration for file access
12. THE System SHALL log all file upload attempts with: user_id, filename, size, timestamp, success/failure
13. THE System SHALL reject files with executable extensions (.exe, .sh, .bat, .cmd)
14. THE System SHALL strip metadata from uploaded images to protect user privacy
15. THE System SHALL implement Content Security Policy headers to prevent XSS attacks on uploaded files

### Requirement 15: Integration with Existing Systems

**User Story:** As a developer, I want the manual payment system to integrate seamlessly with existing quotes and subscriptions, so that the payment flow is consistent across the platform.

#### Acceptance Criteria

1. WHEN a payment is approved for a quote, THE System SHALL update the quote status to 'paid'
2. WHEN a quote status changes to 'paid', THE System SHALL trigger the existing order fulfillment workflow
3. WHEN a payment is approved for a subscription, THE System SHALL update the subscription status to 'active'
4. WHEN a subscription status changes to 'active', THE System SHALL call the existing function to create subscription_deliveries
5. THE System SHALL use the existing subscription_deliveries table structure without modifications
6. WHEN a subscription payment is approved, THE System SHALL set subscription.next_delivery_date based on plan_type
7. WHEN a subscription payment is approved, THE System SHALL set subscription.next_production_start based on plan_type
8. THE System SHALL reuse the existing support_conversations table by adding a payment_id column
9. THE System SHALL reuse the existing support_messages table without modifications
10. THE System SHALL use the existing Transactional_Email system for sending notifications
11. THE System SHALL use the existing has_role() function for admin authorization checks
12. THE System SHALL follow the existing RLS_Policy patterns used in other tables
13. THE System SHALL use the existing update_updated_at_column() trigger function
14. THE System SHALL integrate with the existing profiles table for user information
15. THE System SHALL maintain referential integrity with quotes and subscriptions tables

### Requirement 16: Real-Time Updates

**User Story:** As a user, I want to see real-time updates when payment status changes, so that I don't need to refresh the page manually.

#### Acceptance Criteria

1. THE System SHALL use Supabase Realtime subscriptions for payment status changes
2. WHEN a Payment_Record status changes, THE System SHALL broadcast the change to subscribed clients
3. WHEN a customer is viewing their payment details, THE System SHALL update the display in real-time
4. WHEN an admin is viewing the payment dashboard, THE System SHALL update the payment list in real-time
5. WHEN a new payment is created, THE Admin_Dashboard SHALL add it to the list without refresh
6. WHEN a payment status changes to 'approved' or 'rejected', THE System SHALL remove it from the pending list
7. WHEN a new message is posted in a Support_Conversation, THE System SHALL update the conversation view in real-time
8. THE System SHALL display a visual indicator when real-time updates are received
9. THE System SHALL handle connection loss gracefully and reconnect automatically
10. WHEN connection is lost, THE System SHALL display a warning message to the user
11. WHEN connection is restored, THE System SHALL fetch any missed updates
12. THE System SHALL optimize real-time subscriptions to only listen to relevant payment records
13. THE System SHALL unsubscribe from real-time updates when user navigates away
14. THE System SHALL implement exponential backoff for reconnection attempts
15. THE System SHALL limit real-time update frequency to prevent UI thrashing (debounce 500ms)

### Requirement 17: Mobile Responsiveness

**User Story:** As a user, I want to access the payment system on mobile devices, so that I can manage payments from anywhere.

#### Acceptance Criteria

1. THE Customer_Interface SHALL be fully responsive on screen sizes ≥ 320px width
2. THE Admin_Interface SHALL be fully responsive on screen sizes ≥ 768px width
3. WHEN viewing on mobile, THE System SHALL display payment lists in a card layout
4. WHEN viewing on mobile, THE System SHALL stack form fields vertically
5. THE file upload interface SHALL work on mobile devices using native file pickers
6. THE System SHALL allow mobile users to capture photos directly from camera for payment proof
7. WHEN viewing payment proofs on mobile, THE System SHALL display images in a mobile-optimized gallery
8. THE System SHALL use touch-friendly button sizes (minimum 44x44px)
9. THE System SHALL implement swipe gestures for navigating between payments on mobile
10. THE Admin_Dashboard filters SHALL collapse into a drawer on mobile devices
11. THE System SHALL optimize image loading for mobile networks (lazy loading, compression)
12. THE System SHALL display simplified tables on mobile with expandable rows
13. THE notification badge SHALL be visible and accessible on mobile navigation
14. THE System SHALL prevent horizontal scrolling on all screen sizes
15. THE System SHALL test and support iOS Safari, Android Chrome, and mobile Firefox browsers

### Requirement 18: Performance and Scalability

**User Story:** As a system administrator, I want the payment system to perform well under load, so that users have a smooth experience even with many concurrent payments.

#### Acceptance Criteria

1. THE System SHALL load the payment dashboard in ≤ 2 seconds with 100 pending payments
2. THE System SHALL load payment details view in ≤ 1 second
3. THE System SHALL upload and process a 5MB file in ≤ 10 seconds
4. THE System SHALL generate thumbnails asynchronously without blocking the upload response
5. THE System SHALL implement pagination for payment lists (25 items per page)
6. THE System SHALL implement infinite scroll or "Load More" for mobile payment lists
7. THE System SHALL cache payment method configurations in the client for 5 minutes
8. THE System SHALL use database indexes on: payment_id, user_id, status, created_at, payment_method_id
9. THE System SHALL implement query optimization to avoid N+1 queries
10. THE System SHALL use React Query for data fetching with automatic caching and revalidation
11. THE System SHALL prefetch payment details when hovering over payment list items (desktop)
12. THE System SHALL implement optimistic updates for status changes to improve perceived performance
13. THE System SHALL compress API responses using gzip
14. THE System SHALL implement database connection pooling for concurrent requests
15. THE System SHALL handle 50 concurrent file uploads without degradation

### Requirement 19: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages and feedback, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN a file upload fails, THE System SHALL display a specific error message explaining the reason
2. WHEN a network error occurs, THE System SHALL display a user-friendly message and retry option
3. WHEN a payment action fails, THE System SHALL display the error and preserve user input
4. THE System SHALL validate form inputs before submission and display inline error messages
5. WHEN a user submits invalid data, THE System SHALL highlight the invalid fields
6. THE System SHALL display success messages after successful actions (upload, approval, etc.)
7. THE success messages SHALL auto-dismiss after 5 seconds
8. THE error messages SHALL remain visible until user dismisses them
9. WHEN a bulk operation partially fails, THE System SHALL display which items succeeded and which failed
10. THE System SHALL log all errors to the server for debugging purposes
11. THE System SHALL display loading states during asynchronous operations
12. THE loading states SHALL include progress indicators for file uploads
13. WHEN a user loses internet connection, THE System SHALL display an offline indicator
14. THE System SHALL queue actions performed offline and sync when connection is restored
15. THE System SHALL provide helpful tooltips and hints for complex form fields

### Requirement 20: Accessibility Compliance

**User Story:** As a user with disabilities, I want the payment system to be accessible, so that I can use it with assistive technologies.

#### Acceptance Criteria

1. THE System SHALL provide alt text for all images including payment proof thumbnails
2. THE System SHALL use semantic HTML elements (header, nav, main, section, article)
3. THE System SHALL provide ARIA labels for all interactive elements
4. THE System SHALL support keyboard navigation for all functionality
5. THE System SHALL provide visible focus indicators for keyboard navigation
6. THE System SHALL maintain logical tab order throughout all interfaces
7. THE System SHALL use sufficient color contrast ratios (WCAG AA: 4.5:1 for normal text)
8. THE System SHALL not rely solely on color to convey information (use icons + text)
9. THE System SHALL provide text alternatives for all non-text content
10. THE System SHALL support screen readers (NVDA, JAWS, VoiceOver)
11. THE System SHALL announce dynamic content changes to screen readers using ARIA live regions
12. THE System SHALL allow text resizing up to 200% without loss of functionality
13. THE System SHALL provide skip links to bypass repetitive navigation
14. THE form labels SHALL be properly associated with form inputs
15. THE error messages SHALL be announced to screen readers

## Database Schema

### New Tables

#### payment_methods
```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pix', 'pagseguro', 'picpay', 'paypal', 'bank_transfer', 'other')),
  instructions TEXT NOT NULL,
  payment_link TEXT,
  pix_key TEXT,
  account_details JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### manual_payments
```sql
CREATE TABLE manual_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  
  -- Link to order or subscription
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  payment_type TEXT NOT NULL CHECK (payment_type IN ('one_time', 'recurring')),
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'requires_info', 'approved', 'rejected')),
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT payment_link_check CHECK (
    (quote_id IS NOT NULL AND subscription_id IS NULL) OR
    (quote_id IS NULL AND subscription_id IS NOT NULL)
  )
);
```

#### payment_files
```sql
CREATE TABLE payment_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES manual_payments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  thumbnail_path TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### payment_audit_log
```sql
CREATE TABLE payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES manual_payments(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'status_changed', 'file_uploaded', 'approved', 'rejected', 'info_requested')),
  admin_id UUID REFERENCES auth.users(id),
  old_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Modified Tables

#### support_conversations
```sql
-- Add payment_id column to existing table
ALTER TABLE support_conversations 
ADD COLUMN payment_id UUID REFERENCES manual_payments(id) ON DELETE CASCADE;

CREATE INDEX idx_support_conversations_payment ON support_conversations(payment_id);
```

## Technical Constraints

1. Use TypeScript strict mode for all new code
2. Use React Query for all data fetching and mutations
3. Use shadcn/ui components for consistent UI
4. Implement proper RLS policies for all new tables
5. Use Supabase Storage for file uploads with private bucket
6. Use Supabase Realtime for live updates
7. Follow existing naming conventions and code structure
8. Implement responsive design (mobile-first approach)
9. Support modern browsers: Chrome, Firefox, Safari, Edge (last 2 versions)
10. Maintain backward compatibility with existing quotes and subscriptions systems

## Success Metrics

1. Payment processing time: < 24 hours (from submission to approval)
2. Customer satisfaction: > 80% (measured via post-payment survey)
3. Payment approval rate: > 95% (approved / total submitted)
4. File upload success rate: > 99%
5. Admin response time: < 2 hours during business hours (9 AM - 6 PM)
6. System uptime: > 99.5%
7. Page load time: < 2 seconds for dashboard
8. Mobile usage: > 40% of total payment submissions
9. Email delivery rate: > 98%
10. Zero security incidents related to file uploads

## Non-Functional Requirements

1. **Security**: All file uploads must be validated and scanned; RLS policies must be properly configured
2. **Privacy**: Payment data must be encrypted at rest; GDPR compliance for data retention
3. **Scalability**: System must handle 1000+ concurrent users
4. **Maintainability**: Code must be well-documented and follow project conventions
5. **Testability**: All business logic must have unit tests; critical paths must have integration tests
6. **Usability**: Interface must be intuitive with minimal training required
7. **Reliability**: System must gracefully handle failures and provide clear error messages
8. **Performance**: All user actions must provide feedback within 100ms
9. **Compatibility**: Must work on iOS and Android mobile browsers
10. **Extensibility**: System must be designed to easily integrate with automated payment gateways in the future
