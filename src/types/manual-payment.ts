import type { Json } from "@/integrations/supabase/types";

/**
 * Types for Manual Payment System
 * Based on database schema: supabase/migrations/20260216000000_create_manual_payment_system.sql
 * Requirements: 1.1-1.10, 2.5-2.8
 */

// =====================================================
// ENUMS
// =====================================================

/**
 * Payment method types supported by the system
 */
export type PaymentMethodType =
  | "pix"
  | "credit_card"
  | "debit_card"
  | "boleto"
  | "payment_link"
  | "pagseguro"
  | "picpay"
  | "paypal"
  | "bank_transfer"
  | "other";

/**
 * Payment status workflow states
 * - pending: awaiting payment proof upload
 * - under_review: payment proof uploaded, awaiting admin verification
 * - requires_info: admin requested more information
 * - approved: payment verified and approved
 * - rejected: payment rejected by admin
 */
export type PaymentStatus = "pending" | "under_review" | "requires_info" | "approved" | "rejected";

/**
 * Payment type classification
 * - one_time: single payment for a quote/order
 * - recurring: recurring payment for a subscription
 */
export type PaymentType = "one_time" | "recurring";

/**
 * Sanitized timeline actions returned by the authenticated payment timeline boundary.
 */
export type PaymentTimelineAction =
  | "created"
  | "status_changed"
  | "file_uploaded"
  | "approved"
  | "rejected"
  | "info_requested";

// =====================================================
// DATABASE TABLE TYPES
// =====================================================

/**
 * Payment Method configured by admin
 * Table: admin_payment_methods
 */
export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  instructions: string;
  payment_link?: string | null;
  pix_key?: string | null;
  account_details?: Record<string, Json> | null;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Manual Payment record
 * Table: manual_payments
 */
export interface ManualPayment {
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

/**
 * Payment proof file
 * Table: payment_files
 */
export interface PaymentFile {
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

/**
 * Sanitized payment timeline event assembled server-side from canonical sources.
 * This is not a direct table row.
 */
export interface PaymentTimelineEvent {
  id: string;
  payment_id: string;
  action_type: PaymentTimelineAction;
  old_status: PaymentStatus | null;
  new_status: PaymentStatus | null;
  notes: string | null;
  created_at: string;
}

/**
 * Temporary UI compatibility shape while the final admin detail component moves
 * from the old table-shaped naming to `PaymentTimelineEvent`. The server timeline
 * never returns actor identity; `admin_id` therefore remains absent at runtime.
 */
export interface PaymentAuditLog extends PaymentTimelineEvent {
  admin_id?: string | null;
}

/**
 * Support Conversation extension with payment_id
 * Table: support_conversations (modified)
 */
export interface SupportConversation {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  payment_id?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

// =====================================================
// FORM INPUT TYPES
// =====================================================

/**
 * Input data for creating a payment method
 */
export interface PaymentMethodInput {
  name: string;
  type: PaymentMethodType;
  instructions: string;
  payment_link?: string;
  pix_key?: string;
  account_details?: Record<string, Json>;
  is_active: boolean;
  is_default?: boolean;
  display_order?: number;
}

/**
 * Input data for creating a manual payment
 */
export interface ManualPaymentInput {
  payment_method_id: string;
  quote_id?: string;
  subscription_id?: string;
  amount: number;
  currency?: string;
  payment_type: PaymentType;
}

/**
 * Input data for uploading a payment file
 */
export interface PaymentFileUpload {
  payment_id: string;
  file: File;
}

// =====================================================
// VIEW/DISPLAY TYPES
// =====================================================

/**
 * Payment list item for admin dashboard
 */
export interface PaymentListItem {
  id: string;
  reference_number: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  currency: string;
  payment_method_name: string;
  status: PaymentStatus;
  created_at: string;
  file_count: number;
  unread_messages: number;
}

/**
 * Payment details with related data
 */
export interface PaymentDetails extends ManualPayment {
  payment_method: PaymentMethod;
  files: PaymentFile[];
  timeline: PaymentTimelineEvent[];
  /** @deprecated Use `timeline`. Kept only while the final admin UI caller migrates. */
  audit_logs: PaymentAuditLog[];
  conversation?: SupportConversation;
  customer_name?: string;
  customer_email?: string;
}

/**
 * Payment statistics for admin dashboard
 */
export interface PaymentStats {
  pending_count: number;
  under_review_count: number;
  requires_info_count: number;
  total_pending_amount: number;
  avg_processing_time_hours: number;
}

// =====================================================
// FILTER TYPES
// =====================================================

/**
 * Filters for payment list queries
 */
export interface PaymentFilters {
  status?: PaymentStatus[];
  payment_method_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// =====================================================
// OPERATION RESULT TYPES
// =====================================================

/**
 * Result of bulk operations
 */
export interface BulkOperationResult {
  success_count: number;
  failure_count: number;
  errors: Array<{
    payment_id: string;
    error: string;
  }>;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}
