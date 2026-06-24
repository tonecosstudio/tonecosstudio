/**
 * AdminPaymentService - Service for admin payment operations
 *
 * Requirements: 5.1-5.10, 12.1-12.15
 * Design: .kiro/specs/manual-payment-system/design.md
 *
 * This service handles admin-specific payment operations including
 * listing pending payments, bulk operations, and statistics.
 */
import { supabase } from "@/integrations/supabase/client";
import { sanitizePostgrestSearchTerm } from "@/lib/postgrest-search";
import type {
  PaymentListItem,
  PaymentFilters,
  PaymentStats,
  BulkOperationResult,
  PaymentStatus,
} from "@/types/manual-payment";

/**
 * List payments for admin dashboard with filters
 * Only returns payments with status in ('pending', 'under_review', 'requires_info')
 *
 * @param filters - Optional filters for status, payment method, date range, search
 * @returns Array of payment list items for admin dashboard
 * @throws Error if database query fails
 */
export async function listPendingPayments(filters?: PaymentFilters): Promise<PaymentListItem[]> {
  let query = supabase
    .from("manual_payments")
    .select(
      `
      *,
      payment_method:admin_payment_methods!manual_payments_payment_method_id_fkey(name)
    `
    )
    .in("status", ["pending", "under_review", "requires_info"]);

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

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list pending payments: ${error.message}`);
  }

  const payments = data || [];
  const paymentIds = payments.map((payment) => payment.id).filter(Boolean);
  const userIds = [...new Set(payments.map((payment) => payment.user_id).filter(Boolean))];
  const profileByUserId = new Map<string, { full_name: string | null; email: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (profilesError) {
      throw new Error(`Failed to load payment profiles: ${profilesError.message}`);
    }

    for (const profile of profiles || []) {
      profileByUserId.set(profile.id, {
        full_name: profile.full_name,
        email: profile.email,
      });
    }
  }

  const fileCountByPaymentId = new Map<string, number>();
  const paymentIdByConversationId = new Map<string, string>();
  const unreadMessagesByPaymentId = new Map<string, number>();

  if (paymentIds.length > 0) {
    const { data: files, error: filesError } = await supabase
      .from("payment_files")
      .select("payment_id")
      .in("payment_id", paymentIds);

    if (filesError) {
      throw new Error(`Failed to load payment file counts: ${filesError.message}`);
    }

    for (const file of files || []) {
      fileCountByPaymentId.set(file.payment_id, (fileCountByPaymentId.get(file.payment_id) || 0) + 1);
    }

    const { data: conversations, error: conversationsError } = await supabase
      .from("support_conversations")
      .select("id, payment_id")
      .in("payment_id", paymentIds);

    if (conversationsError) {
      throw new Error(`Failed to load payment conversations: ${conversationsError.message}`);
    }

    for (const conversation of conversations || []) {
      if (conversation.payment_id) {
        paymentIdByConversationId.set(conversation.id, conversation.payment_id);
      }
    }

    const conversationIds = [...paymentIdByConversationId.keys()];

    if (conversationIds.length > 0) {
      const { data: unreadMessages, error: unreadMessagesError } = await supabase
        .from("support_messages")
        .select("conversation_id")
        .in("conversation_id", conversationIds)
        .eq("is_admin", false);

      if (unreadMessagesError) {
        throw new Error(`Failed to load payment unread messages: ${unreadMessagesError.message}`);
      }

      for (const message of unreadMessages || []) {
        const paymentId = paymentIdByConversationId.get(message.conversation_id);

        if (paymentId) {
          unreadMessagesByPaymentId.set(paymentId, (unreadMessagesByPaymentId.get(paymentId) || 0) + 1);
        }
      }
    }
  }

  return payments.map((payment) => ({
    id: payment.id,
    reference_number: payment.reference_number ?? payment.id,
    customer_name: profileByUserId.get(payment.user_id)?.full_name || "Cliente",
    customer_email: profileByUserId.get(payment.user_id)?.email || "",
    amount: payment.amount,
    currency: payment.currency,
    payment_method_name: payment.payment_method?.name || "Metodo desconhecido",
    status: payment.status as PaymentStatus,
    created_at: payment.created_at,
    file_count: fileCountByPaymentId.get(payment.id) || 0,
    unread_messages: unreadMessagesByPaymentId.get(payment.id) || 0,
  }));
}
/**
 * Get payment statistics for admin dashboard
 *
 * @returns Payment statistics including counts and totals
 * @throws Error if database query fails
 */
export async function getPaymentStats(): Promise<PaymentStats> {
  // Get counts by status
  const { data: statusCounts, error: statusError } = await supabase
    .from("manual_payments")
    .select("status, amount")
    .in("status", ["pending", "under_review", "requires_info"]);

  if (statusError) {
    throw new Error(`Failed to get payment stats: ${statusError.message}`);
  }

  // Calculate counts and totals
  const pendingCount = statusCounts?.filter((p) => p.status === "pending").length || 0;
  const underReviewCount = statusCounts?.filter((p) => p.status === "under_review").length || 0;
  const requiresInfoCount = statusCounts?.filter((p) => p.status === "requires_info").length || 0;

  const totalPendingAmount = statusCounts?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

  const { data: approvedPayments, error: approvedPaymentsError } = await supabase
    .from("manual_payments")
    .select("created_at, approved_at")
    .eq("status", "approved")
    .not("approved_at", "is", null);

  if (approvedPaymentsError) {
    throw new Error(`Failed to calculate average processing time: ${approvedPaymentsError.message}`);
  }

  const durations = (approvedPayments || [])
    .map((payment) => {
      if (!payment.approved_at) {
        return null;
      }

      const createdAt = new Date(payment.created_at).getTime();
      const approvedAt = new Date(payment.approved_at).getTime();

      if (Number.isNaN(createdAt) || Number.isNaN(approvedAt) || approvedAt < createdAt) {
        return null;
      }

      return (approvedAt - createdAt) / (1000 * 60 * 60);
    })
    .filter((hours): hours is number => hours !== null);

  const avgProcessingTimeHours =
    durations.length > 0
      ? Number((durations.reduce((sum, hours) => sum + hours, 0) / durations.length).toFixed(2))
      : 0;

  return {
    pending_count: pendingCount,
    under_review_count: underReviewCount,
    requires_info_count: requiresInfoCount,
    total_pending_amount: totalPendingAmount,
    avg_processing_time_hours: avgProcessingTimeHours,
  };
}

/**
 * Bulk approve payments
 * Only approves payments with status 'under_review'
 * Implements async processing for large selections (>10 items)
 *
 * @param paymentIds - Array of payment UUIDs to approve
 * @param adminId - Admin user ID
 * @param onProgress - Optional callback for progress updates
 * @returns Bulk operation result with success/failure counts
 * @throws Error if database operation fails
 */
export async function bulkApprovePayments(
  paymentIds: string[],
  adminId: string,
  onProgress?: (processed: number, total: number) => void
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success_count: 0,
    failure_count: 0,
    errors: [],
  };

  // Import payment service for approval
  const { approvePayment } = await import("@/services/payments/payment-service");

  // For large selections (>10 items), process in batches
  const BATCH_SIZE = 5;
  const isLargeSelection = paymentIds.length > 10;

  if (isLargeSelection) {
    // Process in batches for better performance and user feedback
    const totalBatches = Math.ceil(paymentIds.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, paymentIds.length);
      const batch = paymentIds.slice(startIdx, endIdx);

      // Process current batch
      for (const paymentId of batch) {
        try {
          // Check if payment is in 'under_review' status
          const { data: payment } = await supabase
            .from("manual_payments")
            .select("status")
            .eq("id", paymentId)
            .single();

          if (!payment) {
            result.failure_count++;
            result.errors.push({
              payment_id: paymentId,
              error: "Payment not found",
            });
            continue;
          }

          if (payment.status !== "under_review") {
            result.failure_count++;
            result.errors.push({
              payment_id: paymentId,
              error: `Payment status is '${payment.status}', must be 'under_review'`,
            });
            continue;
          }

          // Approve the payment
          await approvePayment(paymentId, adminId);
          result.success_count++;
        } catch (error) {
          result.failure_count++;
          result.errors.push({
            payment_id: paymentId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Report progress
      const processed = Math.min(endIdx, paymentIds.length);
      if (onProgress) {
        onProgress(processed, paymentIds.length);
      }

      // Small delay between batches for large operations
      if (isLargeSelection && batchIndex < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  } else {
    // Small selection: process all at once
    for (const paymentId of paymentIds) {
      try {
        // Check if payment is in 'under_review' status
        const { data: payment } = await supabase
          .from("manual_payments")
          .select("status")
          .eq("id", paymentId)
          .single();

        if (!payment) {
          result.failure_count++;
          result.errors.push({
            payment_id: paymentId,
            error: "Payment not found",
          });
          continue;
        }

        if (payment.status !== "under_review") {
          result.failure_count++;
          result.errors.push({
            payment_id: paymentId,
            error: `Payment status is '${payment.status}', must be 'under_review'`,
          });
          continue;
        }

        // Approve the payment
        await approvePayment(paymentId, adminId);
        result.success_count++;
      } catch (error) {
        result.failure_count++;
        result.errors.push({
          payment_id: paymentId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Report progress for small selections too
      if (onProgress) {
        const processed = result.success_count + result.failure_count;
        onProgress(processed, paymentIds.length);
      }
    }
  }

  return result;
}

/**
 * Export selected payments to CSV
 *
 * @param paymentIds - Array of payment UUIDs to export
 * @returns CSV content as Blob
 * @throws Error if database query fails
 */
export async function exportPaymentsToCSV(paymentIds: string[]): Promise<Blob> {
  const { data: payments, error } = await supabase
    .from("manual_payments")
    .select(
      `
      *,
      payment_method:admin_payment_methods(name)
    `
    )
    .in("id", paymentIds);

  if (error) {
    throw new Error(`Failed to fetch payments for export: ${error.message}`);
  }

  // Create CSV header
  const headers = [
    "Número de Referência",
    "Cliente",
    "Email",
    "Valor",
    "Moeda",
    "Método de Pagamento",
    "Status",
    "Data de Criação",
    "Tipo de Pagamento",
  ];

  // Create CSV rows
  type ExportablePayment = {
    user_id: string;
    reference_number?: string | null;
    amount: number;
    currency: string;
    status?: string | null;
    created_at: string;
    payment_type?: string | null;
    payment_method?: { name?: string | null } | null;
  };

  const exportablePayments = (payments || []) as ExportablePayment[];
  const userIds = [...new Set(exportablePayments.map((payment) => payment.user_id).filter(Boolean))];
  const profileByUserId = new Map<string, { full_name: string | null; email: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (profilesError) {
      throw new Error(`Failed to load payment export profiles: ${profilesError.message}`);
    }

    for (const profile of profiles || []) {
      profileByUserId.set(profile.id, {
        full_name: profile.full_name,
        email: profile.email,
      });
    }
  }

  const rows = exportablePayments.map((payment) => [
    payment.reference_number || "",
    profileByUserId.get(payment.user_id)?.full_name || "Cliente",
    profileByUserId.get(payment.user_id)?.email || "",
    payment.amount.toString(),
    payment.currency,
    payment.payment_method?.name || "",
    payment.status,
    new Date(payment.created_at).toLocaleDateString("pt-BR"),
    payment.payment_type === "one_time" ? "Única" : "Recorrente",
  ]);

  // Combine header and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  // Create Blob
  return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
}

/**
 * Send bulk message to selected payments
 * Posts message to each payment's support conversation
 * Implements async processing for large selections (>10 items)
 *
 * @param paymentIds - Array of payment UUIDs
 * @param message - Message to send
 * @param adminId - Admin user ID
 * @param onProgress - Optional callback for progress updates
 * @returns Bulk operation result with success/failure counts
 * @throws Error if database operation fails
 */
export async function bulkSendMessage(
  paymentIds: string[],
  message: string,
  adminId: string,
  onProgress?: (processed: number, total: number) => void
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = {
    success_count: 0,
    failure_count: 0,
    errors: [],
  };

  const { messageService } = await import("@/services/support/message-service");

  // For large selections (>10 items), process in batches
  const BATCH_SIZE = 5;
  const isLargeSelection = paymentIds.length > 10;

  if (isLargeSelection) {
    // Process in batches for better performance and user feedback
    const totalBatches = Math.ceil(paymentIds.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, paymentIds.length);
      const batch = paymentIds.slice(startIdx, endIdx);

      // Process current batch
      for (const paymentId of batch) {
        try {
          // Get conversation for this payment
          const { data: conversation } = await supabase
            .from("support_conversations")
            .select("id")
            .eq("payment_id", paymentId)
            .single();

          if (!conversation) {
            result.failure_count++;
            result.errors.push({
              payment_id: paymentId,
              error: "No conversation found for this payment",
            });
            continue;
          }

          await messageService.sendMessage({
            conversation_id: conversation.id,
            sender_id: adminId,
            sender_type: "admin",
            message,
            is_internal: false,
          });
          result.success_count++;
        } catch (error) {
          result.failure_count++;
          result.errors.push({
            payment_id: paymentId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Report progress
      const processed = Math.min(endIdx, paymentIds.length);
      if (onProgress) {
        onProgress(processed, paymentIds.length);
      }

      // Small delay between batches for large operations
      if (isLargeSelection && batchIndex < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  } else {
    // Small selection: process all at once
    for (const paymentId of paymentIds) {
      try {
        // Get conversation for this payment
        const { data: conversation } = await supabase
          .from("support_conversations")
          .select("id")
          .eq("payment_id", paymentId)
          .single();

        if (!conversation) {
          result.failure_count++;
          result.errors.push({
            payment_id: paymentId,
            error: "No conversation found for this payment",
          });
          continue;
        }

        await messageService.sendMessage({
          conversation_id: conversation.id,
          sender_id: adminId,
          sender_type: "admin",
          message,
          is_internal: false,
        });
        result.success_count++;
      } catch (error) {
        result.failure_count++;
        result.errors.push({
          payment_id: paymentId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Report progress for small selections too
      if (onProgress) {
        const processed = result.success_count + result.failure_count;
        onProgress(processed, paymentIds.length);
      }
    }
  }

  return result;
}
