# End-to-End Integration Tests

## Overview

This directory contains comprehensive end-to-end integration tests for the Manual Payment System. These tests validate complete workflows across the entire payment system, from customer payment initiation through admin approval and system integration.

## Test Files

### 1. `e2e-integration-demo.test.ts` ✅

**Status**: Ready to run  
**Purpose**: Demonstrates test structure and validates workflow logic without requiring a live database

This file contains 19 passing tests that validate:
- Customer payment flow structure
- Admin workflow structure
- Rejection and resubmission flow
- Bulk operations flow
- Subscription payment flow
- Status transitions
- Data integrity constraints
- Real-time update scenarios
- Error handling scenarios
- Notification triggers
- Integration points

**Run with**:
```bash
npm run test -- src/test/e2e-integration-demo.test.ts
```

### 2. `e2e-integration.test.ts` 🔒

**Status**: Requires live database  
**Purpose**: Full integration tests against a real Supabase instance

This file contains comprehensive integration tests that:
- Create real users and payments
- Upload actual files
- Test database triggers and RLS policies
- Validate real-time subscriptions
- Test email notifications
- Verify complete workflows end-to-end

**Run with**:
```bash
VITEST_INTEGRATION=true npm run test -- src/test/e2e-integration.test.ts
```

**Prerequisites**:
1. Test Supabase project configured
2. All migrations applied
3. Test environment variables set
4. Admin API access enabled

## Test Coverage

### Customer Flows (5 workflows)
1. **Payment Creation**: Create payment → verify conversation → track status
2. **File Upload**: Upload proof → verify status change → verify audit log
3. **Status Tracking**: Monitor payment status across updates
4. **Payment History**: View all payments with filters
5. **Resubmission**: Upload new proof after rejection

### Admin Flows (6 workflows)
1. **Pending Payments Dashboard**: List and filter pending payments
2. **Payment Review**: View payment details and uploaded proofs
3. **Payment Approval**: Approve payment → update quote/subscription
4. **Payment Rejection**: Reject with reason → notify customer
5. **Info Request**: Request more information from customer
6. **Bulk Operations**: Approve/message/export multiple payments

### Integration Flows (5 workflows)
1. **Quote Status Update**: Payment approval → quote marked as paid
2. **Subscription Activation**: Payment approval → subscription activated
3. **Deliveries Creation**: Subscription activation → deliveries created
4. **Conversation Creation**: Payment creation → support conversation created
5. **Email Notifications**: Status changes → emails sent

### Real-time Flows (3 workflows)
1. **Status Updates**: Payment status changes reflected in real-time
2. **Message Updates**: New messages appear without refresh
3. **Notification Badges**: Badge counts update automatically

## Test Scenarios

### Complete Customer Payment Flow
```
1. Customer creates payment
   ✓ Payment created with status 'pending'
   ✓ Reference number generated (PAY-YYYYMMDD-XXXX)
   ✓ Support conversation created automatically

2. Customer uploads payment proof
   ✓ File uploaded successfully
   ✓ Status changed to 'under_review'
   ✓ Audit log created

3. Customer tracks payment status
   ✓ Payment visible in customer dashboard
   ✓ Status updates reflected in real-time
```

### Complete Admin Workflow
```
1. Admin views pending payments
   ✓ Only 'pending', 'under_review', 'requires_info' shown
   ✓ Filters work correctly
   ✓ File count displayed

2. Admin reviews payment details
   ✓ All payment information visible
   ✓ Uploaded files accessible
   ✓ Audit trail complete

3. Admin approves payment
   ✓ Status changed to 'approved'
   ✓ Quote/subscription updated
   ✓ Conversation resolved
   ✓ Email sent to customer
```

### Rejection and Resubmission Flow
```
1. Admin rejects payment
   ✓ Status changed to 'rejected'
   ✓ Rejection reason stored
   ✓ Customer notified

2. Customer resubmits
   ✓ New file uploaded
   ✓ Status changed back to 'under_review'
   ✓ File count increased

3. Admin approves resubmission
   ✓ Payment approved successfully
```

### Bulk Operations with Mixed Statuses
```
1. Admin selects multiple payments
   ✓ Payments with different statuses selected

2. Admin performs bulk approve
   ✓ Only 'under_review' payments approved
   ✓ Other statuses skipped with error messages
   ✓ Success/failure counts reported

3. Admin sends bulk message
   ✓ Message sent to all selected payments
   ✓ Messages appear in conversations
```

### Subscription Payment Flow
```
1. Customer creates subscription payment
   ✓ Payment type is 'recurring'
   ✓ Linked to subscription

2. Customer uploads proof
   ✓ File uploaded successfully

3. Admin approves
   ✓ Subscription status changed to 'active'
   ✓ 12 deliveries created
   ✓ Next delivery date set
```

## Status Transitions

### Valid Transitions
```
pending → under_review
under_review → requires_info
under_review → approved
under_review → rejected
requires_info → under_review
rejected → under_review (resubmission)
```

### Invalid Transitions (Blocked)
```
pending → approved ❌
pending → rejected ❌
approved → * (terminal state) ❌
```

## Data Integrity Validations

### Payment Reference Numbers
- Format: `PAY-YYYYMMDD-XXXX`
- Must be unique
- Generated automatically

### Quote/Subscription XOR Constraint
- Must have quote_id OR subscription_id
- Cannot have both
- Cannot have neither

### File Upload Constraints
- Maximum 5 files per payment
- Maximum 5MB per file
- Allowed types: JPG, PNG, PDF

### Audit Log Requirements
- All admin actions logged
- Includes: action_type, admin_id, timestamp
- Optional: old_status, new_status, notes

## Error Handling

### Validated Error Scenarios
1. Payment without quote or subscription
2. Payment with both quote and subscription
3. File size exceeded (>5MB)
4. Maximum files reached (>5)
5. Invalid file type
6. Invalid status transition

### Expected Error Messages
- Clear and specific
- User-friendly language
- Actionable guidance

## Notification Triggers

### Email Notifications
1. **Payment Created** → Customer receives confirmation
2. **Payment Under Review** → Admin receives notification
3. **Payment Approved** → Customer receives confirmation
4. **Payment Rejected** → Customer receives rejection notice
5. **Info Requested** → Customer receives request

### In-App Notifications
1. **Payment Requires Info** → Customer badge incremented
2. **New Pending Payment** → Admin badge incremented
3. **New Message** → Message badge incremented

## Integration Points

### Quote Integration
- **Trigger**: Payment approved
- **Action**: Update quote status to 'paid'
- **Follow-up**: Trigger order fulfillment workflow

### Subscription Integration
- **Trigger**: Payment approved
- **Actions**:
  1. Update subscription status to 'active'
  2. Create subscription_deliveries records
  3. Set next_delivery_date
  4. Set next_production_start

### Conversation Integration
- **Trigger**: Payment created
- **Action**: Create support_conversations record
- **Subject**: "Pagamento - Pedido #[reference_number]"
- **Initial Status**: 'waiting_admin'

## Running Tests

### Run Demo Tests (No Database Required)
```bash
npm run test -- src/test/e2e-integration-demo.test.ts
```

### Run Full Integration Tests (Requires Database)
```bash
# Set environment variable
export VITEST_INTEGRATION=true

# Run tests
npm run test -- src/test/e2e-integration.test.ts
```

### Run All Tests
```bash
npm run test
```

### Watch Mode
```bash
npm run test:watch
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Run Demo Tests
        run: npm run test -- src/test/e2e-integration-demo.test.ts
      
      - name: Run Integration Tests
        if: github.ref == 'refs/heads/main'
        env:
          VITEST_INTEGRATION: true
          SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
        run: npm run test -- src/test/e2e-integration.test.ts
```

## Test Environment Setup

### 1. Create Test Supabase Project
```bash
# Create new project for testing
# Name: manual-payment-system-test
```

### 2. Apply Migrations
```bash
# Run all migrations in order
supabase db push
```

### 3. Configure Environment Variables
```bash
# .env.test
VITE_SUPABASE_URL=https://your-test-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-test-anon-key
```

### 4. Enable Admin API
```bash
# In Supabase Dashboard:
# Settings → API → Service Role Key
# Copy and store securely
```

## Troubleshooting

### Tests Fail with "Database error saving new user"
- **Cause**: No live database connection
- **Solution**: Set `VITEST_INTEGRATION=true` or run demo tests instead

### Tests Timeout
- **Cause**: Slow database connection or large test data
- **Solution**: Increase timeout in test configuration

### RLS Policy Errors
- **Cause**: Missing or incorrect RLS policies
- **Solution**: Verify all migrations applied correctly

### File Upload Errors
- **Cause**: Storage bucket not configured
- **Solution**: Create 'payment-proofs' bucket in Supabase Storage

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data in afterEach
3. **Mocking**: Use mocks for external services (email, etc.)
4. **Assertions**: Be specific and descriptive
5. **Documentation**: Comment complex test scenarios

## Future Enhancements

- [ ] Add performance benchmarks
- [ ] Add load testing scenarios
- [ ] Add security testing (SQL injection, XSS)
- [ ] Add accessibility testing
- [ ] Add mobile responsiveness testing
- [ ] Add internationalization testing

## Related Documentation

- [Requirements Document](../../.kiro/specs/manual-payment-system/requirements.md)
- [Design Document](../../.kiro/specs/manual-payment-system/design.md)
- [Tasks Document](../../.kiro/specs/manual-payment-system/tasks.md)
- [API Documentation](../../docs/api-documentation.md)

## Support

For questions or issues with integration tests:
1. Check this documentation
2. Review test output for specific errors
3. Consult the design document for expected behavior
4. Contact the development team
