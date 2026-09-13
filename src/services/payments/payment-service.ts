/**
 * PaymentService - Service for reading and reviewing manual payments.
 *
 * Customer-side creation is intentionally not exposed here. New payment records
 * must come from a server-authoritative commercial contract where amount,
 * currency, payment type, and ownership are derived from the linked domain
 * record instead of browser input.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  ManualPayment,
  PaymentStatus,
  PaymentFilters,
  PaymentDetails,
} from "@/types/manual-payment";
import { assertCurrentUserId, requireAuthenticatedUserId } from "@/services/auth/current-user";
import { sanitizePostgrestSearchTerm } from "@/lib/postgrest-search";
import { loadPaymentTimeline } from "@/services/payments/payment-timeline-service";

type PaymentDetailsRow = Omit<
  PaymentDetails,
  "timeline" | "conversation" | "customer_name" | "customer_email"
>;

/**
 * Fetch a payment by ID under database RLS.
 * Customers can resolve only their own rows; admins may resolve rows allowed by
 * the admin RLS policy. Timeline events come from a separate authenticated
 * boundary so the browser never depends on internal audit tables directly.
 */
async function fetchPaymentById(id: string): Promise<PaymentDetails | null> {
  const { data, error } = await supabase
    .from("manual_payments")
    .select(
      `
      *,
      payment_method:admin_payment_methods(*),
      files:payment_files(*)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const result = data as unknown as PaymentDetailsRow | null;

  if (!result) {
    return null;
  }

  const [timeline, profileResult] = await Promise.all([
    loadPaymentTimeline(id),
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", result.user_id)
      .maybeSingle(),
  ]);

  return {
    ...result,
    timeline,
    customer_name: profileResult.data?.full_name,
    customer_email: profileResult.data?.email,
  };
}

export async function getPaymentById(id: string): Promise<PaymentDetails | null> {
  return fetchPaymentById(id);
}

export async function getMyPaymentById(id: string): Promise<PaymentDetails | null> {
  const userId = await requireAuthenticatedUserId();
  const payment = await fetchPaymentById(id);

  if (!payment) {
    return null;
  }

  if (payment.user_id !== userId) {
    throw new Error("Payment not found");
  }

  return payment;
}

/**
 * List payments by user with optional filtering.
 */
export async function listPaymentsByUser(
  userId: string,
  filters?: PaymentFilters
): Promise<ManualPayment[]> {
  await assertCurrentUserId(userId);

  let query = supabase.from("manual_payments").select("*").eq("user_id", userId);

  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  if (filters?.payment_method_id) {
    query = query.eq("payment_method_id", filters.payment_method_id);
  }

  if (filters?.date_from) {
    query = query.gte("created_at", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  if (filters?.search) {
    const search = sanitizePostgrestSearchTerm(filters.search);
    if (search) {
      query = query.or(`reference_number.ilike.%${search}%`);
    }
  }

  query = query.order("created_at", { ascending: false });

  const { data: payments, error } = await query;

  if (error) {
    throw new Error(`Failed to list payments: ${error.message}`);
  }

  return payments as ManualPayment[];
}

/**
 * Update payment status through the canonical admin RPC boundary.
 */
export async function updatePaymentStatus(
  id: string,
  newStatus: PaymentStatus,
  notes?: string,
  adminId?: string
): Promise<void> {
  const { data: currentPayment, error: fetchError } = await supabase
    .from("manual_payments")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch payment: ${fetchError.message}`);
  }

  const currentStatus = currentPayment.status as PaymentStatus;

  const [{ validateStatusTransition }, { updateManualPaymentStatus }] = await Promise.all([
    import("@/services/admin/orders/orders-validator"),
    import("@/services/admin/orders/admin-order-status-service"),
  ]);

  const validationError = validateStatusTransition(currentStatus, newStatus, "manual_payment");
  if (validationError) {
    throw new Error(validationError.message);
  }

  void adminId;
  await updateManualPaymentStatus(id, newStatus, newStatus === "rejected" ? notes?.trim() || null : null);
}

/**
 * Approve a payment through the canonical admin notification boundary.
 */
export async function approvePayment(id: string, adminId: string): Promise<void> {
  void adminId;
  const { approveManualPaymentWithNotification } = await import(
    "@/services/admin/orders/admin-order-status-service"
  );
  await approveManualPaymentWithNotification(id);
}

/**
 * Reject a payment through the canonical admin notification boundary.
 */
export async function rejectPayment(id: string, adminId: string, reason: string): Promise<void> {
  if (!reason || reason.trim().length === 0) {
    throw new Error("Rejection reason is required");
  }

  void adminId;
  const { rejectManualPaymentWithNotification } = await import(
    "@/services/admin/orders/admin-order-status-service"
  );
  await rejectManualPaymentWithNotification(id, reason.trim());
}

/**
 * Request more information from the customer through the canonical admin RPC boundary.
 */
export async function requestPaymentInfo(
  id: string,
  adminId: string,
  message: string
): Promise<void> {
  if (!message || message.trim().length === 0) {
    throw new Error("Message is required when requesting more information");
  }

  void adminId;
  const { requestManualPaymentInfoRpc } = await import(
    "@/services/admin/orders/admin-order-status-service"
  );
  await requestManualPaymentInfoRpc(id, message.trim());
}
