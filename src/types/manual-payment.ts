import type { Json } from "@/integrations/supabase/types";

/**
 * Types for Manual Payment System
 * Based on the current application contract over the Supabase schema.
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
 * Manual-payment workflow states. The database-wide payment_status enum is
 * broader, but manual-payment mutation RPCs intentionally accept only these
 * five states.
 */
export type PaymentStatus = "pending" | "under_review" | "requires_info" | "approved" | "rejected";

/**
 * Payment type classification enforced by the manual_payments table.
 */
export type PaymentType = "one_time" | "recurring";

/**
 * Sanitized timeline actions exposed to the payment UI.
 */
export type PaymentTimelineAction =
  | "created"
  | "status_changed"
  | "file_uploaded"
  | "approved"
  | "rejected"
  | "info_requested";

// =====================================================
// DATABASE / APPLICATION CONTRACT TYPES
// =====================================================

/**
 * Payment Method configured by admin.
 * Nullable fields mirror the live table rather than treating defaults as
 * NOT NULL guarantees.
 */
export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  instructions: string | null;
  payment_link?: string | null;
  pix_key?: string | null;
  account_details?: Record<string, Json> | null;
  is_active: boolean | null;
  is_default: boolean | null;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Manual Payment record.
 * reference_number, currency and payment_type are database-enforced invariants.
 * payment_method_id remains nullable by design because subscription checkout
 * records the textual payment method and may not reference an admin method row.
 */
export interface ManualPayment {
  id: string;
  reference_number: string;
  user_id: string;
  payment_method_id: string | null;
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
 * Payment proof file. file_size and file_type are database-enforced invariants.
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
 * Sanitized payment timeline event assembled from canonical RLS-protected
 * sources. This is not a direct table row and never exposes internal actor IDs.
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
 * Support Conversation extension with payment_id
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

export interface ManualPaymentInput {
  payment_method_id: string;
  quote_id?: string;
  subscription_id?: string;
  amount: number;
  currency?: string;
  payment_type: PaymentType;
}

export interface PaymentFileUpload {
  payment_id: string;
  file: File;
}

// =====================================================
// VIEW/DISPLAY TYPES
// =====================================================

/**
 * Normalized list item returned by the admin payment service.
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
 * Payment details with related data. The relation is nullable because
 * payment_method_id is nullable by design for subscription checkout records.
 */
export interface PaymentDetails extends ManualPayment {
  payment_method: PaymentMethod | null;
  files: PaymentFile[];
  timeline: PaymentTimelineEvent[];
  conversation?: SupportConversation;
  customer_name?: string;
  customer_email?: string;
}

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

export interface BulkOperationResult {
  success_count: number;
  failure_count: number;
  errors: Array<{
    payment_id: string;
    error: string;
  }>;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}
