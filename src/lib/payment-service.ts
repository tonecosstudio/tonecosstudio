/**
 * PaymentService - Service for managing manual payments
 *
 * Requirements: 2.5-2.10, 8.1-8.10
 * Design: .kiro/specs/manual-payment-system/design.md
 *
 * This service handles CRUD operations for manual payment records,
 * including status transitions, validation, and integration with quotes/subscriptions.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  ManualPayment,
  ManualPaymentInput,
  PaymentStatus,
  PaymentFilters,
  PaymentDetails,
} from "@/types/manual-payment";
import { getNotificationService } from "./notification-service";
import { log } from "@/lib/logger";
import { assertCurrentUserId, requireAuthenticatedUserId } from "@/services/auth/current-user";
import { sanitizePostgrestSearchTerm } from "@/lib/postgrest-search";

type RpcError = { message?: string } | null;

interface ManualPaymentCreationRpcClient {
  rpc(functionName: "create_manual_payment_for_current_user", args: {
    p_payment_method_id: string;
    p_quote_id: string | null;
    p_subscription_id: string | null;
    p_amount: number;
    p_currency: string;
    p_payment_type: string;
  }): PromiseLike<{ data: unknown; error: RpcError }>;
}

const manualPaymentCreationRpc = supabase as unknown as ManualPaymentCreationRpcClient;

type QuotePaymentFallbackRow = {
  id: string;
  quote_id: string;
  user_id: string | null;
  payment_type: string | null;
  amount: number;
  status: string | null;
  payment_method: string | null;
  paid_at: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

interface QuotePaymentsFallbackClient {
  from(table: "quote_payments"): {
    select(columns: string): {
      eq(column: "id", value: string): {
        maybeSingle(): PromiseLike<{ data: QuotePaymentFallbackRow | null; error: RpcError }>;
      };
    };
  };
}

const quotePaymentsFallback = supabase as unknown as QuotePaymentsFallbackClient;

function mapCreatePaymentError(message: string | undefined): string {
  const value = message ?? "";
  if (value.includes("PAYMENT_METHOD_REQUIRED")) return "Payment method is required";
  if (value.includes("INVALID_PAYMENT_AMOUNT")) return "Payment amount must be greater than zero";
  if (value.includes("INVALID_PAYMENT_TYPE")) return "Payment type is required";
  if (value.includes("PAYMENT_LINK_TARGET_REQUIRED")) {
    return "Payment must be linked to either a quote or subscription, but not both";
  }
  if (value.includes("PAYMENT_METHOD_NOT_FOUND")) return "Payment method not found";
  if (value.includes("PAYMENT_QUOTE_NOT_FOUND")) return "Quote not found";
  if (value.includes("PAYMENT_SUBSCRIPTION_NOT_FOUND")) return "Subscription not found";
  if (value.includes("PAYMENT_REFERENCE_EXHAUSTED")) {
    return "Failed to generate payment reference";
  }
  return `Failed to create payment: ${value || "Unknown error"}`;
}

/**
 * Helper para tentar usar manual_payments, com fallback para quote_payments
 */
async function tryWithFallback<T>(
  manualPaymentsQuery: () => Promise<T>,
  quotePaymentsQuery: () => Promise<T>
): Promise<T> {
  try {
    return await manualPaymentsQuery();
  } catch (error: unknown) {
    const fallbackError = error as { code?: string; message?: string };

    if (
      fallbackError.code === "PGRST205" ||
      fallbackError.message?.includes("Could not find the table")
    ) {
      log.warn("manual_payments table unavailable; using quote_payments fallback", { error });
      return await quotePaymentsQuery();
    }

    throw error;
  }
}
/**
 * Mapeia status de quote_payments para manual_payments
 */
function mapQuotePaymentStatus(quoteStatus: string): PaymentStatus {
  const statusMap: Record<string, PaymentStatus> = {
    pending: "pending",
    processing: "under_review",
    completed: "approved",
    failed: "rejected",
    refunded: "rejected",
  };
  return statusMap[quoteStatus] || "pending";
}


/**
 * Create a new manual payment
 * Automatically generates a unique reference number
 *
 * @param input - Payment creation data
 * @returns Created payment record
 * @throws Error if validation fails or database insert fails
 */
export async function createPayment(input: ManualPaymentInput): Promise<ManualPayment> {
  await requireAuthenticatedUserId();

  // Validate required fields
  if (!input.payment_method_id) {
    throw new Error("Payment method is required");
  }

  if (!input.amount || input.amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  if (!input.payment_type) {
    throw new Error("Payment type is required");
  }

  // Validate XOR constraint: must have quote_id OR subscription_id, but not both
  const hasQuote = !!input.quote_id;
  const hasSubscription = !!input.subscription_id;

  if (hasQuote === hasSubscription) {
    throw new Error("Payment must be linked to either a quote or subscription, but not both");
  }

  const { data, error } = await manualPaymentCreationRpc.rpc("create_manual_payment_for_current_user", {
    p_payment_method_id: input.payment_method_id,
    p_quote_id: input.quote_id || null,
    p_subscription_id: input.subscription_id || null,
    p_amount: input.amount,
    p_currency: input.currency || "BRL",
    p_payment_type: input.payment_type,
  });

  if (error) {
    throw new Error(mapCreatePaymentError(error.message));
  }

  const payment = data as ManualPayment;

  // Send payment creation notification
  try {
    const notificationService = getNotificationService();
    await notificationService.sendPaymentCreated(payment.id);
  } catch (error) {
    // Don't fail payment creation if notification fails
    log.error("Failed to send payment creation notification", { error, paymentId: payment.id });
  }

  return payment;
}

/**
 * Get a payment by ID with related data
 * Includes payment method, user profile, and files
 *
 * @param id - Payment UUID
 * @returns Payment details with related data or null if not found
 * @throws Error if database query fails
 */
async function fetchPaymentById(id: string): Promise<PaymentDetails | null> {
  const result = await tryWithFallback<PaymentDetails | null>(
    async () => {
      const { data, error } = await supabase
        .from("manual_payments")
        .select(
          `
          *,
          payment_method:admin_payment_methods(*),
          files:payment_files(*),
          audit_logs:payment_audit_log(*)
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return data as unknown as PaymentDetails;
    },
    async () => {
      // Fallback para quote_payments
      const { data, error } = await quotePaymentsFallback
        .from("quote_payments")
        .select(
          `
          *,
          quote:quotes(*)
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      // Mapear para o formato de ManualPayment
      const paymentMethodName = data.payment_method || "manual";
      const mappedData: PaymentDetails = {
        id: data.id,
        reference_number: `QUOTE-${data.id.substring(0, 8)}`,
        user_id: data.user_id ?? "",
        payment_method_id: paymentMethodName,
        quote_id: data.quote_id,
        subscription_id: null,
        amount: data.amount,
        created_at: data.created_at,
        updated_at: data.updated_at,
        approved_at: data.paid_at,
        approved_by: data.recorded_by,
        rejection_reason: null,
        status: mapQuotePaymentStatus(data.status ?? "pending"),
        payment_type: "one_time",
        currency: "BRL",
        payment_method: {
          id: paymentMethodName,
          name: paymentMethodName,
          type: "other",
          instructions: "",
          is_active: true,
          is_default: false,
          display_order: 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
        files: [],
        audit_logs: [],
      };

      return mappedData;
    }
  );

  if (!result) {
    return null;
  }

  // Fetch user profile separately
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", result.user_id)
    .maybeSingle();

  return {
    ...result,
    customer_name: profileData?.full_name,
    customer_email: profileData?.email,
  } as PaymentDetails;
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
 * List payments by user with optional filtering
 *
 * @param userId - User UUID
 * @param filters - Optional filters for status, date range, etc.
 * @returns Array of payments matching filters
 * @throws Error if database query fails
 */
export async function listPaymentsByUser(
  userId: string,
  filters?: PaymentFilters
): Promise<ManualPayment[]> {
  await assertCurrentUserId(userId);

  let query = supabase.from("manual_payments").select("*").eq("user_id", userId);

  // Apply filters
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

  // Order by creation date (newest first)
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list payments: ${error.message}`);
  }

  return data as ManualPayment[];
}

/**
 * Update payment status with validation
 * Validates status transitions and records audit log
 *
 * @param id - Payment UUID
 * @param newStatus - New status to set
 * @param notes - Optional notes for the status change
 * @param adminId - Admin user ID (for audit log)
 * @throws Error if status transition is invalid or database update fails
 */
export async function updatePaymentStatus(
  id: string,
  newStatus: PaymentStatus,
  notes?: string,
  adminId?: string
): Promise<void> {
  // Get current payment
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
    import("@/services/admin/orders-validator"),
    import("@/services/admin/admin-order-status-service"),
  ]);

  // Validate status transition
  const validationError = validateStatusTransition(currentStatus, newStatus, "manual_payment");
  if (validationError) {
    throw new Error(validationError.message);
  }

  void adminId;
  await updateManualPaymentStatus(id, newStatus, newStatus === "rejected" ? notes?.trim() || null : null);
}

/**
 * Approve a payment
 * Delegates approval and customer notification to the admin RPC boundary.
 *
 * Requirements: 7.1-7.15, 15.1-15.15
 *
 * @param id - Payment UUID
 * @param adminId - Admin user ID
 * @throws Error if payment cannot be approved
 */
export async function approvePayment(id: string, adminId: string): Promise<void> {
  void adminId;
  const { approveManualPaymentWithNotification } = await import(
    "@/services/admin/admin-order-status-service"
  );
  await approveManualPaymentWithNotification(id);
}

/**
 * Reject a payment
 * Delegates rejection reason persistence and customer notification to the admin RPC boundary.
 *
 * Requirements: 7.1-7.15
 *
 * @param id - Payment UUID
 * @param adminId - Admin user ID
 * @param reason - Rejection reason
 * @throws Error if payment cannot be rejected
 */
export async function rejectPayment(id: string, adminId: string, reason: string): Promise<void> {
  if (!reason || reason.trim().length === 0) {
    throw new Error("Rejection reason is required");
  }

  void adminId;
  const { rejectManualPaymentWithNotification } = await import(
    "@/services/admin/admin-order-status-service"
  );
  await rejectManualPaymentWithNotification(id, reason.trim());
}

/**
 * Request more information from customer
 * Delegates info request persistence and customer notification to the admin RPC boundary.
 *
 * Requirements: 7.1-7.15
 *
 * @param id - Payment UUID
 * @param adminId - Admin user ID
 * @param message - Message requesting more information
 * @throws Error if request fails
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
    "@/services/admin/admin-order-status-service"
  );
  await requestManualPaymentInfoRpc(id, message.trim());
}
