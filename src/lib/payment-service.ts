// @ts-nocheck
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

/**
 * Helper para tentar usar manual_payments, com fallback para quote_payments
 */
async function tryWithFallback<T>(
  manualPaymentsQuery: () => Promise<T>,
  quotePaymentsQuery: () => Promise<T>
): Promise<T> {
  try {
    return await manualPaymentsQuery();
  } catch (error: any) {
    // Se a tabela manual_payments não existir, tenta com quote_payments
    if (error.code === "PGRST205" || error.message?.includes("Could not find the table")) {
      console.warn("Tabela manual_payments não encontrada. Usando fallback para quote_payments.");
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
 * Mapeia status de manual_payments para quote_payments
 */
function mapToQuotePaymentStatus(manualStatus: PaymentStatus): string {
  const statusMap: Record<PaymentStatus, string> = {
    pending: "pending",
    under_review: "processing",
    requires_info: "pending", // Não tem equivalente direto
    approved: "completed",
    rejected: "failed",
  };
  return statusMap[manualStatus] || "pending";
}

/**
 * Valid status transitions for payment workflow
 * Requirements: 8.1-8.10
 */
const VALID_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["under_review"],
  under_review: ["requires_info", "approved", "rejected"],
  requires_info: ["under_review"],
  approved: [], // Terminal state - no transitions allowed
  rejected: ["under_review"], // Allow re-submission
};

/**
 * Validate if a status transition is allowed
 *
 * @param currentStatus - Current payment status
 * @param newStatus - Desired new status
 * @returns true if transition is valid
 */
function isValidStatusTransition(currentStatus: PaymentStatus, newStatus: PaymentStatus): boolean {
  if (currentStatus === newStatus) {
    return true; // Same status is always valid
  }

  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
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

  // Generate reference number using database function
  const { data: refData, error: refError } = await supabase.rpc("generate_payment_reference");

  if (refError) {
    throw new Error(`Failed to generate payment reference: ${refError.message}`);
  }

  // Prepare data for insertion
  const insertData = {
    reference_number: refData as string,
    user_id: (await supabase.auth.getUser()).data.user?.id,
    payment_method_id: input.payment_method_id,
    quote_id: input.quote_id || null,
    subscription_id: input.subscription_id || null,
    amount: input.amount,
    currency: input.currency || "BRL",
    payment_type: input.payment_type,
    status: "pending" as PaymentStatus,
  };

  const { data, error } = await supabase
    .from("manual_payments")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create payment: ${error.message}`);
  }

  const payment = data as ManualPayment;

  // Send payment creation notification
  try {
    const notificationService = getNotificationService();
    await notificationService.sendPaymentCreated(payment.id);
  } catch (error) {
    // Don't fail payment creation if notification fails
    console.error("Failed to send payment creation notification:", error);
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
export async function getPaymentById(id: string): Promise<PaymentDetails | null> {
  const result = await tryWithFallback(
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

      return data;
    },
    async () => {
      // Fallback para quote_payments
      const { data, error } = await supabase
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
      const mappedData: any = {
        ...data,
        reference_number: `QUOTE-${data.id.substring(0, 8)}`,
        status: mapQuotePaymentStatus(data.status),
        payment_type: "one_time",
        currency: "BRL",
        payment_method: {
          name: data.payment_method || "Não especificado",
          type: data.payment_method || "unknown",
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
    .eq("id", data.user_id)
    .maybeSingle();

  // Fetch conversation if exists
  const { data: conversationData } = await supabase
    .from("support_conversations")
    .select("*")
    .eq("payment_id", id)
    .maybeSingle();

  return {
    ...data,
    customer_name: profileData?.full_name,
    customer_email: profileData?.email,
    conversation: conversationData || undefined,
  } as PaymentDetails;
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
    query = query.or(`reference_number.ilike.%${filters.search}%`);
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

  // Validate status transition
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
  }

  // Update payment status
  const updateData: Record<string, any> = {
    status: newStatus,
  };

  // Set approved_at and approved_by for approved status
  if (newStatus === "approved") {
    updateData.approved_at = new Date().toISOString();
    updateData.approved_by = adminId;
  }

  const { error: updateError } = await supabase
    .from("manual_payments")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    throw new Error(`Failed to update payment status: ${updateError.message}`);
  }

  // Record audit log (if notes provided or admin action)
  if (notes || adminId) {
    await supabase.from("payment_audit_log").insert({
      payment_id: id,
      action_type: "status_changed",
      admin_id: adminId || null,
      old_status: currentStatus,
      new_status: newStatus,
      notes: notes || null,
    });
  }
}

/**
 * Approve a payment
 * Updates payment status to 'approved', creates audit log, sends message to conversation,
 * and integrates with quote/subscription systems
 *
 * Requirements: 7.1-7.15, 15.1-15.15
 *
 * @param id - Payment UUID
 * @param adminId - Admin user ID
 * @throws Error if payment cannot be approved
 */
export async function approvePayment(id: string, adminId: string): Promise<void> {
  // Get payment details to access conversation
  const payment = await getPaymentById(id);

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Update payment status to approved
  await updatePaymentStatus(id, "approved", "Payment approved", adminId);

  // Create audit log entry
  const { error: auditError } = await supabase.from("payment_audit_log").insert({
    payment_id: id,
    action_type: "approved",
    admin_id: adminId,
    old_status: payment.status,
    new_status: "approved",
    notes: "Payment approved by admin",
  });

  if (auditError) {
    console.error("Failed to create audit log:", auditError);
    // Don't throw - audit log failure shouldn't block approval
  }

  // Integrate with quote/subscription systems
  try {
    const { handlePaymentApproval } = await import("./integration-service");
    await handlePaymentApproval(id);
  } catch (error) {
    console.error("Failed to integrate payment approval:", error);
    // Log but don't throw - integration failure shouldn't block approval
    // The payment is already approved, integration can be retried manually
  }

  // Send message to conversation if it exists
  if (payment.conversation) {
    try {
      const { sendMessage } = await import("./conversation-service");
      await sendMessage(
        payment.conversation.id,
        adminId,
        "Seu pagamento foi aprovado! O pedido será processado em breve.",
        [],
        false
      );
    } catch (error) {
      console.error("Failed to send approval message:", error);
      // Don't throw - message failure shouldn't block approval
    }
  }

  // Send payment approval notification
  try {
    const notificationService = getNotificationService();
    await notificationService.sendPaymentApproved(id);
  } catch (error) {
    // Don't fail payment approval if notification fails
    console.error("Failed to send payment approval notification:", error);
  }
}

/**
 * Reject a payment
 * Updates payment status to 'rejected', stores reason, creates audit log, and sends message
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

  // Get payment details to access conversation and current status
  const payment = await getPaymentById(id);

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Update status and rejection reason
  const { error } = await supabase
    .from("manual_payments")
    .update({
      status: "rejected",
      rejection_reason: reason.trim(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to reject payment: ${error.message}`);
  }

  // Create audit log entry
  const { error: auditError } = await supabase.from("payment_audit_log").insert({
    payment_id: id,
    action_type: "rejected",
    admin_id: adminId,
    old_status: payment.status,
    new_status: "rejected",
    notes: reason.trim(),
  });

  if (auditError) {
    console.error("Failed to create audit log:", auditError);
    // Don't throw - audit log failure shouldn't block rejection
  }

  // Send message to conversation if it exists
  if (payment.conversation) {
    try {
      const { sendMessage } = await import("./conversation-service");
      await sendMessage(
        payment.conversation.id,
        adminId,
        `Seu pagamento foi rejeitado. Motivo: ${reason.trim()}\n\nVocê pode enviar um novo comprovante se desejar.`,
        [],
        false
      );
    } catch (error) {
      console.error("Failed to send rejection message:", error);
      // Don't throw - message failure shouldn't block rejection
    }
  }

  // Send payment rejection notification
  try {
    const notificationService = getNotificationService();
    await notificationService.sendPaymentRejected(id, reason);
  } catch (error) {
    // Don't fail payment rejection if notification fails
    console.error("Failed to send payment rejection notification:", error);
  }
}

/**
 * Request more information from customer
 * Updates payment status to 'requires_info', creates audit log, and sends message to conversation
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

  // Get payment details to access conversation and current status
  const payment = await getPaymentById(id);

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Update payment status to requires_info
  await updatePaymentStatus(id, "requires_info", message.trim(), adminId);

  // Create audit log entry
  const { error: auditError } = await supabase.from("payment_audit_log").insert({
    payment_id: id,
    action_type: "info_requested",
    admin_id: adminId,
    old_status: payment.status,
    new_status: "requires_info",
    notes: message.trim(),
  });

  if (auditError) {
    console.error("Failed to create audit log:", auditError);
    // Don't throw - audit log failure shouldn't block request
  }

  // Send message to conversation if it exists
  if (payment.conversation) {
    try {
      const { sendMessage } = await import("./conversation-service");
      await sendMessage(
        payment.conversation.id,
        adminId,
        `Precisamos de mais informações sobre seu pagamento:\n\n${message.trim()}`,
        [],
        false
      );
    } catch (error) {
      console.error("Failed to send info request message:", error);
      // Don't throw - message failure shouldn't block request
    }
  }

  // Send info requested notification
  try {
    const notificationService = getNotificationService();
    await notificationService.sendInfoRequested(id, message);
  } catch (error) {
    // Don't fail info request if notification fails
    console.error("Failed to send info requested notification:", error);
  }
}
