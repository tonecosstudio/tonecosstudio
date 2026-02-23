# Deployment Checklist - Manual Payment System

## Overview

This checklist ensures a complete and secure deployment of the Manual Payment System to production.

## Pre-Deployment

### 1. Code Review

- [ ] All code reviewed and approved
- [ ] No console.log or debug statements in production code
- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Code follows project conventions

### 2. Testing

#### Unit Tests
- [ ] All unit tests passing
- [ ] Test coverage ≥ 80% for services
- [ ] Test coverage ≥ 70% for components
- [ ] Edge cases tested

#### Property-Based Tests
- [ ] All property tests passing (100+ iterations each)
- [ ] Properties validated against design document
- [ ] No flaky tests

#### Integration Tests
- [ ] Complete payment flow tested
- [ ] File upload flow tested
- [ ] Admin approval flow tested
- [ ] Email notifications tested
- [ ] Real-time updates tested

#### Manual Testing
- [ ] Customer payment creation tested
- [ ] File upload tested (all formats)
- [ ] Admin dashboard tested
- [ ] Payment approval tested
- [ ] Payment rejection tested
- [ ] Request info flow tested
- [ ] Bulk operations tested
- [ ] Mobile responsiveness tested
- [ ] Accessibility tested with screen reader

### 3. Security Audit

- [ ] RLS policies reviewed and tested
- [ ] File upload validation tested
- [ ] Malware scanning configured
- [ ] Rate limiting tested
- [ ] MIME type validation tested
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled
- [ ] Sensitive data encryption verified
- [ ] Authentication flows tested

### 4. Performance Testing

- [ ] Dashboard loads in ≤ 2 seconds with 100 payments
- [ ] Payment details loads in ≤ 1 second
- [ ] File upload completes in ≤ 10 seconds (5MB)
- [ ] Bulk operations tested with 50+ items
- [ ] Database queries optimized
- [ ] N+1 queries eliminated
- [ ] Indexes created on all queried columns
- [ ] Load testing completed (50+ concurrent users)

### 5. Documentation

- [ ] Admin guide completed
- [ ] Customer help documentation completed
- [ ] API documentation completed
- [ ] Deployment checklist completed (this document)
- [ ] Environment variables documented
- [ ] Code comments added
- [ ] README updated

## Database Setup

### 1. Backup Current Database

```bash
# Create backup before migration
supabase db dump -f backup_pre_payment_system.sql
```

### 2. Run Migrations

```bash
# Apply migration
supabase db push

# Or manually in Supabase Dashboard
# Run: supabase/migrations/20260216000000_create_manual_payment_system.sql
```

### 3. Verify Tables Created

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'admin_payment_methods',
  'manual_payments',
  'payment_files',
  'payment_audit_log'
);

-- Check support_conversations has payment_id column
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'support_conversations' 
AND column_name = 'payment_id';
```

### 4. Verify Indexes

```sql
-- Check indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN (
  'admin_payment_methods',
  'manual_payments',
  'payment_files',
  'payment_audit_log'
);
```

### 5. Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'admin_payment_methods',
  'manual_payments',
  'payment_files',
  'payment_audit_log'
);

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (
  'admin_payment_methods',
  'manual_payments',
  'payment_files',
  'payment_audit_log'
);
```

### 6. Verify Functions and Triggers

```sql
-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'generate_payment_reference',
  'trigger_payment_status_change',
  'trigger_first_file_upload'
);

-- Check triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN (
  'payment_status_change',
  'first_file_upload'
);
```

### 7. Seed Initial Data

```sql
-- Create default payment methods
INSERT INTO admin_payment_methods (name, type, instructions, pix_key, is_active, is_default, display_order)
VALUES 
  ('PIX', 'pix', 'Use a chave PIX: contato@ordax.com.br', 'contato@ordax.com.br', true, true, 1),
  ('Transferência Bancária', 'bank_transfer', 'Dados bancários: Banco X, Agência Y, Conta Z', null, true, false, 2);

-- Verify insertion
SELECT * FROM admin_payment_methods;
```

## Supabase Storage Setup

### 1. Create Storage Bucket

```typescript
// In Supabase Dashboard: Storage > New Bucket
// Or via API:
const { data, error } = await supabase
  .storage
  .createBucket('payment-proofs', {
    public: false,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'application/pdf'
    ]
  });
```

### 2. Configure Bucket RLS Policies

```sql
-- Allow authenticated users to upload to their own payment folders
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM manual_payments WHERE user_id = auth.uid()
  )
);

-- Allow users to read their own payment proofs
CREATE POLICY "Users can view own payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM manual_payments WHERE user_id = auth.uid()
  )
);

-- Allow admins to read all payment proofs
CREATE POLICY "Admins can view all payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete payment proofs
CREATE POLICY "Admins can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND has_role(auth.uid(), 'admin'::app_role)
);
```

### 3. Verify Bucket Configuration

```typescript
// Test upload
const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
const { data, error } = await supabase.storage
  .from('payment-proofs')
  .upload('test/test.txt', testFile);

// Test download
const { data: url } = await supabase.storage
  .from('payment-proofs')
  .createSignedUrl('test/test.txt', 60);

// Cleanup
await supabase.storage
  .from('payment-proofs')
  .remove(['test/test.txt']);
```

## Environment Variables

### 1. Set Production Variables

See `docs/manual-payment-environment-variables.md` for complete list.

**Critical variables**:
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Email (if using custom service)
VITE_EMAIL_SERVICE_URL=https://your-email-service.com
VITE_EMAIL_FROM=noreply@ordax.com.br

# Optional: Sentry for error tracking
VITE_SENTRY_DSN=https://your-sentry-dsn
```

### 2. Verify Environment Variables

```typescript
// Add to app initialization
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY'
];

requiredEnvVars.forEach(varName => {
  if (!import.meta.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

## Email Configuration

### 1. Configure Email Templates

In Supabase Dashboard: Authentication > Email Templates

**Templates to configure**:
- Payment Created
- Payment Under Review (to admins)
- Payment Approved
- Payment Rejected
- Payment Requires Info
- New Message Notification

### 2. Test Email Delivery

```typescript
// Test each template
await notificationService.sendPaymentCreated(testPaymentId);
await notificationService.sendPaymentApproved(testPaymentId);
await notificationService.sendPaymentRejected(testPaymentId, 'Test reason');
await notificationService.sendInfoRequested(testPaymentId, 'Test message');
```

### 3. Verify Email Settings

- [ ] SMTP configured correctly
- [ ] From address verified
- [ ] SPF/DKIM records configured
- [ ] Test emails received
- [ ] Emails not going to spam
- [ ] Unsubscribe link working (if applicable)

## Application Deployment

### 1. Build Application

```bash
# Install dependencies
npm install

# Run type check
npm run type-check

# Run linter
npm run lint

# Build for production
npm run build

# Verify build output
ls -la dist/
```

### 2. Deploy to Hosting

```bash
# Example: Deploy to Vercel
vercel --prod

# Or: Deploy to Netlify
netlify deploy --prod

# Or: Deploy to custom server
rsync -avz dist/ user@server:/var/www/ordax/
```

### 3. Verify Deployment

- [ ] Application loads correctly
- [ ] No console errors
- [ ] Assets loading (CSS, JS, images)
- [ ] API calls working
- [ ] Authentication working
- [ ] Real-time updates working

## Post-Deployment Verification

### 1. Smoke Tests

#### Customer Flow
- [ ] Create account / Login
- [ ] Create a test quote
- [ ] Initiate payment
- [ ] Select payment method
- [ ] View payment instructions
- [ ] Upload payment proof (test file)
- [ ] View payment in "My Payments"
- [ ] Access payment conversation

#### Admin Flow
- [ ] Login as admin
- [ ] View payment dashboard
- [ ] See test payment in list
- [ ] Open payment details
- [ ] View uploaded proof
- [ ] Approve payment
- [ ] Verify quote status updated
- [ ] Check audit log

### 2. Integration Tests

- [ ] Payment approval updates quote status
- [ ] Payment approval updates subscription status
- [ ] Subscription deliveries created correctly
- [ ] Email notifications sent
- [ ] Real-time updates working
- [ ] Conversation created automatically

### 3. Performance Verification

```bash
# Use Lighthouse or similar tool
lighthouse https://ordax.com.br/admin/payments --view

# Check metrics:
# - First Contentful Paint < 1.5s
# - Time to Interactive < 3.5s
# - Speed Index < 3.0s
```

### 4. Security Verification

- [ ] RLS policies preventing unauthorized access
- [ ] File upload validation working
- [ ] Rate limiting active
- [ ] HTTPS enforced
- [ ] Secure headers configured
- [ ] No sensitive data in client logs

## Monitoring Setup

### 1. Error Tracking

```typescript
// Configure Sentry (if using)
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter sensitive data
    return event;
  }
});
```

### 2. Analytics

- [ ] Google Analytics configured
- [ ] Custom events tracked:
  - Payment created
  - Payment approved
  - Payment rejected
  - File uploaded
  - Bulk operation performed

### 3. Logging

- [ ] Application logs configured
- [ ] Error logs monitored
- [ ] Audit logs accessible
- [ ] Log retention policy set

### 4. Alerts

Configure alerts for:
- [ ] High error rate (> 5% of requests)
- [ ] Slow response times (> 5 seconds)
- [ ] Failed email deliveries
- [ ] Storage quota warnings
- [ ] Database connection issues

## Backup and Recovery

### 1. Database Backups

```bash
# Configure automatic backups in Supabase Dashboard
# Settings > Database > Backups

# Or manual backup
supabase db dump -f backup_$(date +%Y%m%d).sql
```

### 2. Storage Backups

```bash
# Backup storage bucket
supabase storage download payment-proofs --recursive
```

### 3. Recovery Plan

Document recovery procedures:
- [ ] Database restore procedure
- [ ] Storage restore procedure
- [ ] Application rollback procedure
- [ ] Emergency contacts list

## Rollback Plan

### If Issues Occur

1. **Immediate Actions**:
   ```bash
   # Revert to previous deployment
   vercel rollback
   
   # Or restore database
   supabase db reset --db-url "postgresql://..."
   ```

2. **Database Rollback**:
   ```sql
   -- Drop new tables (if needed)
   DROP TABLE IF EXISTS payment_audit_log CASCADE;
   DROP TABLE IF EXISTS payment_files CASCADE;
   DROP TABLE IF EXISTS manual_payments CASCADE;
   DROP TABLE IF EXISTS admin_payment_methods CASCADE;
   
   -- Remove payment_id from support_conversations
   ALTER TABLE support_conversations DROP COLUMN IF EXISTS payment_id;
   ```

3. **Notify Stakeholders**:
   - [ ] Notify team
   - [ ] Notify affected users (if any)
   - [ ] Update status page

## Go-Live Checklist

### Final Checks

- [ ] All tests passing
- [ ] Database migrated successfully
- [ ] Storage bucket configured
- [ ] RLS policies active
- [ ] Environment variables set
- [ ] Email templates configured
- [ ] Application deployed
- [ ] Smoke tests passed
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Monitoring active
- [ ] Backups configured
- [ ] Documentation complete
- [ ] Team trained
- [ ] Rollback plan ready

### Communication

- [ ] Announce to team
- [ ] Update customer-facing documentation
- [ ] Send announcement email (if applicable)
- [ ] Update status page
- [ ] Monitor for first 24 hours

## Post-Launch

### First 24 Hours

- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Check email delivery
- [ ] Verify real-time updates
- [ ] Review user feedback
- [ ] Address critical issues immediately

### First Week

- [ ] Review analytics
- [ ] Gather user feedback
- [ ] Identify improvement areas
- [ ] Plan optimizations
- [ ] Update documentation based on feedback

### First Month

- [ ] Performance review
- [ ] Security audit
- [ ] User satisfaction survey
- [ ] Feature requests review
- [ ] Plan next iteration

## Support Contacts

### Technical Issues
- **Email**: dev@ordax.com.br
- **Slack**: #manual-payment-system
- **On-call**: [Phone number]

### Supabase Support
- **Dashboard**: https://app.supabase.com
- **Support**: support@supabase.com
- **Status**: https://status.supabase.com

### Emergency Contacts
- **CTO**: [Contact info]
- **DevOps Lead**: [Contact info]
- **Database Admin**: [Contact info]

---

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Version**: 1.0.0  
**Sign-off**: _____________
