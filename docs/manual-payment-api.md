# API Documentation - Manual Payment System

## Overview

This document describes all API endpoints, types, and services for the Manual Payment System.

## Table of Contents

1. [Authentication](#authentication)
2. [Payment Methods API](#payment-methods-api)
3. [Payments API](#payments-api)
4. [File Upload API](#file-upload-api)
5. [Conversation API](#conversation-api)
6. [Admin Operations API](#admin-operations-api)
7. [Types Reference](#types-reference)
8. [Error Handling](#error-handling)

## Authentication

All API requests require authentication via Supabase Auth.

### Headers

```typescript
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

### Role-Based Access

- **Customer**: Can access own payments and files
- **Admin**: Can access all payments and perform admin operations

Role check function:
```sql
has_role(auth.uid(), 'admin'::app_role)
```

## Payment Methods API

### List Active Payment Methods

**Endpoint**: `GET /payment-methods`

**Access**: Public (returns only active methods)

**Query Parameters**: None

**Response**:
```typescript
{
  data: PaymentMethod[];
  error: null;
}
```

**Example**:
```typescript
const { data, error } = await supabase
  .from('admin_payment_methods')
  .select('*')
  .eq('is_active', true)
  .order('display_order');
```

### Get Payment Method by ID

**Endpoint**: `GET /payment-methods/:id`

**Access**: Public (if active), Admin (all)

**Response**:
```typescript
{
  data: PaymentMethod;
  error: null;
}
```

### Create Payment Method

**Endpoint**: `POST /payment-methods`

**Access**: Admin only

**Request Body**:
```typescript
{
  name: string;
  type: PaymentMethodType;
  instructions: string;
  payment_link?: string;
  pix_key?: string;
  account_details?: Record<string, any>;
  is_active: boolean;
  is_default?: boolean;
  display_order?: number;
}
```

**Response**:
```typescript
{
  data: PaymentMethod;
  error: null;
}
```

**Example**:
```typescript
const { data, error } = await supabase
  .from('admin_payment_methods')
  .insert({
    name: 'PIX',
    type: 'pix',
    instructions: 'Use a chave PIX...',
    pix_key: 'contato@ordax.com.br',
    is_active: true,
    is_default: true
  })
  .select()
  .single();
```

### Update Payment Method

**Endpoint**: `PATCH /payment-methods/:id`

**Access**: Admin only

**Request Body**: Partial<PaymentMethod>

**Response**:
```typescript
{
  data: PaymentMethod;
  error: null;
}
```

### Set Default Payment Method

**Endpoint**: `POST /payment-methods/:id/set-default`

**Access**: Admin only

**Logic**:
1. Unset current default (if any)
2. Set specified method as default

**Example**:
```typescript
// Using PaymentMethodService
await paymentMethodService.setDefault(methodId);
```

## Payments API

### Create Payment

**Endpoint**: `POST /payments`

**Access**: Authenticated users

**Request Body**:
```typescript
{
  payment_method_id: string;
  quote_id?: string;
  subscription_id?: string;
  amount: number;
  currency?: string; // default: 'BRL'
  payment_type: 'one_time' | 'recurring';
}
```

**Validation**:
- Exactly one of `quote_id` or `subscription_id` must be provided
- Amount must be > 0
- Payment method must be active

**Response**:
```typescript
{
  data: {
    payment: ManualPayment;
    conversation: SupportConversation;
  };
  error: null;
}
```

**Side Effects**:
1. Generates unique reference number
2. Creates support conversation
3. Sends confirmation email to customer
4. Creates audit log entry

**Example**:
```typescript
const { data, error } = await paymentService.create({
  payment_method_id: 'uuid',
  quote_id: 'uuid',
  amount: 150.00,
  payment_type: 'one_time'
});
```

### Get Payment by ID

**Endpoint**: `GET /payments/:id`

**Access**: Owner or Admin

**Response**:
```typescript
{
  data: PaymentDetails; // Includes related data
  error: null;
}
```

**Includes**:
- Payment method details
- Uploaded files
- Audit logs
- Associated conversation
- Customer information (admin only)

**Example**:
```typescript
const { data, error } = await supabase
  .from('manual_payments')
  .select(`
    *,
    payment_method:admin_payment_methods(*),
    files:payment_files(*),
    audit_logs:payment_audit_log(*),
    conversation:support_conversations(*)
  `)
  .eq('id', paymentId)
  .single();
```

### List User Payments

**Endpoint**: `GET /payments`

**Access**: Authenticated users (own payments)

**Query Parameters**:
```typescript
{
  status?: PaymentStatus[];
  date_from?: string; // ISO date
  date_to?: string;   // ISO date
  limit?: number;     // default: 25
  offset?: number;    // default: 0
}
```

**Response**:
```typescript
{
  data: ManualPayment[];
  count: number;
  error: null;
}
```

**Example**:
```typescript
const { data, error } = await supabase
  .from('manual_payments')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)
  .in('status', ['pending', 'under_review'])
  .order('created_at', { ascending: false })
  .range(0, 24);
```

### Update Payment Status

**Endpoint**: `PATCH /payments/:id/status`

**Access**: Admin only

**Request Body**:
```typescript
{
  status: PaymentStatus;
  notes?: string;
}
```

**Validation**:
- Status transitions must be valid (see state machine)
- Cannot change from 'approved' to any other status
- Cannot change from 'rejected' except to 'under_review'

**Response**:
```typescript
{
  data: ManualPayment;
  error: null;
}
```

**Side Effects**:
- Creates audit log entry
- Updates conversation status
- Sends email notification

## File Upload API

### Upload Payment Proof

**Endpoint**: `POST /payments/:id/files`

**Access**: Payment owner or Admin

**Request**: multipart/form-data

**Form Fields**:
```typescript
{
  file: File; // JPG, PNG, or PDF
}
```

**Validation**:
- File type: image/jpeg, image/png, application/pdf
- File size: ≤ 5MB
- Max files per payment: 5
- MIME type must match extension
- Rate limit: 10 uploads per hour per user

**Response**:
```typescript
{
  data: PaymentFile;
  error: null;
}
```

**Side Effects**:
1. Uploads to Supabase Storage bucket 'payment-proofs'
2. Generates thumbnail (for images)
3. Creates payment_files record
4. Updates payment status to 'under_review' (if first file)
5. Creates audit log entry
6. Sends notification to admins

**Example**:
```typescript
const { data, error } = await fileUploadService.upload(
  paymentId,
  file,
  (progress) => console.log(`${progress}%`)
);
```

### Get File Signed URL

**Endpoint**: `GET /payments/:paymentId/files/:fileId/url`

**Access**: Payment owner or Admin

**Query Parameters**:
```typescript
{
  expiresIn?: number; // seconds, default: 3600 (1 hour)
}
```

**Response**:
```typescript
{
  data: {
    url: string;
    expiresAt: string;
  };
  error: null;
}
```

**Example**:
```typescript
const { data, error } = await fileUploadService.getSignedUrl(
  filePath,
  3600
);
```

### List Payment Files

**Endpoint**: `GET /payments/:id/files`

**Access**: Payment owner or Admin

**Response**:
```typescript
{
  data: PaymentFile[];
  error: null;
}
```

### Delete Payment File

**Endpoint**: `DELETE /payments/:paymentId/files/:fileId`

**Access**: Admin only

**Response**:
```typescript
{
  data: null;
  error: null;
}
```

**Side Effects**:
- Deletes from Supabase Storage
- Deletes payment_files record
- Creates audit log entry

## Conversation API

### Get Payment Conversation

**Endpoint**: `GET /payments/:id/conversation`

**Access**: Payment owner or Admin

**Response**:
```typescript
{
  data: {
    conversation: SupportConversation;
    messages: ConversationMessage[];
  };
  error: null;
}
```

### Send Message

**Endpoint**: `POST /conversations/:id/messages`

**Access**: Conversation participants

**Request Body**:
```typescript
{
  message: string;
  attachments?: string[]; // file URLs
  is_internal?: boolean;  // admin only
}
```

**Response**:
```typescript
{
  data: ConversationMessage;
  error: null;
}
```

**Side Effects**:
- Updates conversation status
- Sends email notification to other party
- Creates notification badge

### Mark Conversation as Read

**Endpoint**: `POST /conversations/:id/read`

**Access**: Conversation participants

**Request Body**:
```typescript
{
  is_admin: boolean;
}
```

**Response**:
```typescript
{
  data: null;
  error: null;
}
```

## Admin Operations API

### List Pending Payments

**Endpoint**: `GET /admin/payments`

**Access**: Admin only

**Query Parameters**:
```typescript
{
  status?: PaymentStatus[];
  payment_method_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string; // reference number or customer name
  limit?: number;
  offset?: number;
}
```

**Response**:
```typescript
{
  data: PaymentListItem[];
  count: number;
  error: null;
}
```

**Example**:
```typescript
const { data, error } = await supabase
  .from('manual_payments')
  .select(`
    *,
    payment_method:admin_payment_methods(name),
    customer:profiles!user_id(full_name, email),
    files:payment_files(count),
    conversation:support_conversations(
      unread_messages:support_messages(count)
    )
  `)
  .in('status', ['pending', 'under_review', 'requires_info'])
  .order('created_at', { ascending: false });
```

### Get Payment Statistics

**Endpoint**: `GET /admin/payments/stats`

**Access**: Admin only

**Response**:
```typescript
{
  data: PaymentStats;
  error: null;
}
```

**Example**:
```typescript
const stats = await adminPaymentService.getStats();
// Returns: pending_count, under_review_count, etc.
```

### Approve Payment

**Endpoint**: `POST /admin/payments/:id/approve`

**Access**: Admin only

**Request Body**:
```typescript
{
  admin_id: string;
}
```

**Response**:
```typescript
{
  data: ManualPayment;
  error: null;
}
```

**Side Effects**:
1. Updates status to 'approved'
2. Sets approved_at and approved_by
3. Updates linked quote/subscription status
4. Creates subscription deliveries (if subscription)
5. Sends approval email to customer
6. Creates audit log entry
7. Updates conversation to 'resolved'

**Example**:
```typescript
await paymentService.approve(paymentId, adminId);
```

### Reject Payment

**Endpoint**: `POST /admin/payments/:id/reject`

**Access**: Admin only

**Request Body**:
```typescript
{
  admin_id: string;
  reason: string; // required
}
```

**Response**:
```typescript
{
  data: ManualPayment;
  error: null;
}
```

**Side Effects**:
1. Updates status to 'rejected'
2. Stores rejection_reason
3. Sends rejection email with reason
4. Creates audit log entry
5. Posts message in conversation

**Example**:
```typescript
await paymentService.reject(
  paymentId,
  adminId,
  'Comprovante ilegível'
);
```

### Request More Information

**Endpoint**: `POST /admin/payments/:id/request-info`

**Access**: Admin only

**Request Body**:
```typescript
{
  admin_id: string;
  message: string; // required
}
```

**Response**:
```typescript
{
  data: ManualPayment;
  error: null;
}
```

**Side Effects**:
1. Updates status to 'requires_info'
2. Posts message in conversation
3. Sends email to customer
4. Creates audit log entry
5. Updates conversation status to 'waiting_customer'

**Example**:
```typescript
await paymentService.requestInfo(
  paymentId,
  adminId,
  'Por favor, envie comprovante mais nítido'
);
```

### Bulk Approve

**Endpoint**: `POST /admin/payments/bulk-approve`

**Access**: Admin only

**Request Body**:
```typescript
{
  payment_ids: string[];
  admin_id: string;
}
```

**Response**:
```typescript
{
  data: BulkOperationResult;
  error: null;
}
```

**Logic**:
- Only approves payments with status 'under_review'
- Skips payments with incompatible status
- Returns detailed result with successes and failures

**Example**:
```typescript
const result = await adminPaymentService.bulkApprove(
  ['id1', 'id2', 'id3'],
  adminId
);
// result: { success_count: 2, failure_count: 1, errors: [...] }
```

### Bulk Export

**Endpoint**: `POST /admin/payments/bulk-export`

**Access**: Admin only

**Request Body**:
```typescript
{
  payment_ids: string[];
  format: 'csv' | 'pdf';
}
```

**Response**: File download (CSV or PDF)

**CSV Columns**:
- Reference Number
- Customer Name
- Customer Email
- Amount
- Currency
- Payment Method
- Status
- Created At
- Approved At
- Approved By

**Example**:
```typescript
const blob = await adminPaymentService.bulkExport(
  paymentIds,
  'csv'
);
downloadFile(blob, 'payments.csv');
```

### Bulk Message

**Endpoint**: `POST /admin/payments/bulk-message`

**Access**: Admin only

**Request Body**:
```typescript
{
  payment_ids: string[];
  message: string;
  admin_id: string;
}
```

**Response**:
```typescript
{
  data: BulkOperationResult;
  error: null;
}
```

**Side Effects**:
- Posts message to each payment's conversation
- Sends email to each customer
- Creates audit log entries

## Types Reference

### PaymentMethodType

```typescript
type PaymentMethodType = 
  | 'pix'
  | 'pagseguro'
  | 'picpay'
  | 'paypal'
  | 'bank_transfer'
  | 'other';
```

### PaymentStatus

```typescript
type PaymentStatus = 
  | 'pending'        // Awaiting proof upload
  | 'under_review'   // Proof uploaded, awaiting verification
  | 'requires_info'  // Admin requested more information
  | 'approved'       // Payment verified and approved
  | 'rejected';      // Payment rejected
```

### PaymentType

```typescript
type PaymentType = 
  | 'one_time'    // Single payment for quote/order
  | 'recurring';  // Recurring payment for subscription
```

### PaymentAuditAction

```typescript
type PaymentAuditAction = 
  | 'created'
  | 'status_changed'
  | 'file_uploaded'
  | 'approved'
  | 'rejected'
  | 'info_requested';
```

### PaymentMethod

```typescript
interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  instructions: string;
  payment_link?: string | null;
  pix_key?: string | null;
  account_details?: Record<string, any> | null;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}
```

### ManualPayment

```typescript
interface ManualPayment {
  id: string;
  reference_number: string;
  user_id: string;
  payment_method_id: string;
  quote_id?: string | null;
  subscription_id?: string | null;
  amount: number;
  currency: string;
  payment_type: PaymentType;
  status: PaymentStatus;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
}
```

### PaymentFile

```typescript
interface PaymentFile {
  id: string;
  payment_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  thumbnail_path?: string | null;
  uploaded_by: string;
  created_at: string;
}
```

### PaymentAuditLog

```typescript
interface PaymentAuditLog {
  id: string;
  payment_id: string;
  action_type: PaymentAuditAction;
  admin_id?: string | null;
  old_status?: string | null;
  new_status?: string | null;
  notes?: string | null;
  created_at: string;
}
```

## Error Handling

### Error Response Format

```typescript
{
  data: null;
  error: {
    message: string;
    code: string;
    details?: any;
  };
}
```

### Common Error Codes

#### Validation Errors (400)

```typescript
{
  code: 'FILE_SIZE_EXCEEDED',
  message: 'File size exceeds 5MB limit',
  details: { maxSize: 5242880, actualSize: 6000000 }
}

{
  code: 'FILE_TYPE_INVALID',
  message: 'File type not supported. Please upload JPG, PNG, or PDF files.',
  details: { allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'] }
}

{
  code: 'MAX_FILES_REACHED',
  message: 'Maximum of 5 files per payment reached',
  details: { maxFiles: 5, currentFiles: 5 }
}

{
  code: 'INVALID_STATUS_TRANSITION',
  message: 'Cannot transition from approved to rejected',
  details: { from: 'approved', to: 'rejected' }
}
```

#### Authorization Errors (403)

```typescript
{
  code: 'UNAUTHORIZED',
  message: 'You don\'t have permission to access this resource'
}

{
  code: 'RATE_LIMIT_EXCEEDED',
  message: 'Upload limit exceeded. Please try again in 45 minutes',
  details: { limit: 10, window: '1 hour', retryAfter: 2700 }
}
```

#### Business Logic Errors (409)

```typescript
{
  code: 'PAYMENT_ALREADY_APPROVED',
  message: 'Payment has already been approved and cannot be modified'
}

{
  code: 'NO_DEFAULT_PAYMENT_METHOD',
  message: 'Please configure a default payment method first'
}
```

#### Not Found Errors (404)

```typescript
{
  code: 'PAYMENT_NOT_FOUND',
  message: 'Payment not found'
}

{
  code: 'QUOTE_NOT_FOUND',
  message: 'Quote not found'
}
```

#### System Errors (500)

```typescript
{
  code: 'STORAGE_UPLOAD_ERROR',
  message: 'File upload failed. Please try again'
}

{
  code: 'EMAIL_SEND_FAILURE',
  message: 'Failed to send email notification'
}
```

### Error Handling Example

```typescript
try {
  const { data, error } = await paymentService.create(paymentData);
  
  if (error) {
    switch (error.code) {
      case 'FILE_SIZE_EXCEEDED':
        showError('Arquivo muito grande. Máximo: 5MB');
        break;
      case 'UNAUTHORIZED':
        redirectToLogin();
        break;
      default:
        showError(error.message);
    }
    return;
  }
  
  // Success
  showSuccess('Pagamento criado com sucesso!');
  navigate(`/payments/${data.id}`);
  
} catch (error) {
  console.error('Unexpected error:', error);
  showError('Erro inesperado. Tente novamente.');
}
```

## Rate Limiting

### File Upload Rate Limit

- **Limit**: 10 uploads per hour per user
- **Window**: Rolling 1-hour window
- **Response**: 429 Too Many Requests
- **Retry-After**: Seconds until next allowed upload

### API Rate Limits

- **General API**: 100 requests per minute per user
- **Admin API**: 200 requests per minute per admin
- **Bulk Operations**: 10 operations per minute per admin

## Real-time Subscriptions

### Subscribe to Payment Updates

```typescript
const subscription = supabase
  .channel('payment-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'manual_payments',
      filter: `id=eq.${paymentId}`
    },
    (payload) => {
      console.log('Payment updated:', payload.new);
      updateUI(payload.new);
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

### Subscribe to New Messages

```typescript
const subscription = supabase
  .channel('conversation-messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'support_messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      console.log('New message:', payload.new);
      addMessageToUI(payload.new);
    }
  )
  .subscribe();
```

## Testing

### Test Credentials

```typescript
// Customer
email: 'customer@test.com'
password: 'test123'

// Admin
email: 'admin@test.com'
password: 'admin123'
```

### Test Payment Methods

```typescript
// PIX (active, default)
id: 'test-pix-id'
name: 'PIX'
type: 'pix'
pix_key: 'test@pix.com'

// Bank Transfer (active)
id: 'test-bank-id'
name: 'Transferência Bancária'
type: 'bank_transfer'
```

### Test Files

```typescript
// Valid image (1MB)
const testImage = new File([...], 'test.jpg', { type: 'image/jpeg' });

// Valid PDF (2MB)
const testPDF = new File([...], 'test.pdf', { type: 'application/pdf' });

// Invalid (too large)
const largeFile = new File([...], 'large.jpg', { type: 'image/jpeg' }); // 6MB
```

## Webhooks (Future)

Planned webhook events for integration:

- `payment.created`
- `payment.approved`
- `payment.rejected`
- `payment.requires_info`
- `file.uploaded`

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-15  
**Maintainer**: Ordax Development Team
