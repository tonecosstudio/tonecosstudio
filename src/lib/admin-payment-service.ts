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
    query = query.or(
      `reference_number.ilike.%${filters.search}%,profiles.full_name.ilike.%${filters.search}%`
    );
  }

  // Order by creation date (newest first) by default
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list pending payments: ${error.message}`);
  }

  // Transform data to PaymentListItem format
  const paymentListItems: PaymentListItem[] = await Promise.all(
    (data || []).map(async (payment) => {
      // Get file count
      const { count: fileCount } = await supabase
        .from("payment_files")
        .select("*", { count: "exact", head: true })
        .eq("payment_id", payment.id);

      // Get unread message count (simplified - would need conversation integration)
      const unreadMessages = 0; // TODO: Implement conversation integration

      return {
        id: payment.id,
        reference_number: payment.reference_number,
        customer_name: `Cliente ${payment.reference_number}`, // Temporário - precisa de view ou RPC
        customer_email: "", // Temporário - precisa de view ou RPC
        amount: payment.amount,
        currency: payment.currency,
        payment_method_name: payment.payment_method?.name || "Método desconhecido",
        status: payment.status as PaymentStatus,
        created_at: payment.created_at,
        file_count: fileCount || 0,
        unread_messages: unreadMessages,
      };
    })
  );

  return paymentListItems;
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

  // Calculate average processing time (simplified - would need more complex query)
  const avgProcessingTimeHours = 24; // TODO: Implement actual calculation

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
  const { approvePayment } = await import("./payment-service");

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
      payment_method:admin_payment_methods(name),
      profiles(full_name, email)
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
  const rows = (payments || []).map((payment) => [
    payment.reference_number,
    payment.profiles?.full_name || "",
    payment.profiles?.email || "",
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
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
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

  // Import conversation service
  const { sendMessage } = await import("./conversation-service");

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

          // Send message
          await sendMessage(conversation.id, adminId, message, [], false);
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

        // Send message
        await sendMessage(conversation.id, adminId, message, [], false);
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
 * Start async bulk approve operation
 * Creates a bulk operation record and returns immediately
 * The operation will be processed asynchronously
 *
 * @param paymentIds - Array of payment UUIDs to approve
 * @param adminId - Admin user ID
 * @returns Bulk operation ID for tracking
 * @throws Error if database operation fails
 */
export async function startAsyncBulkApprove(
  paymentIds: string[],
  adminId: string
): Promise<string> {
  // Create bulk operation record
  const { data, error } = await supabase
    .from("bulk_operations")
    .insert({
      operation_type: "approve",
      payment_ids: paymentIds,
      admin_id: adminId,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create bulk operation: ${error.message}`);
  }

  // Start processing in background (non-blocking)
  processBulkApproveAsync(data.id).catch((error) => {
    console.error(`Async bulk approve failed for operation ${data.id}:`, error);
  });

  return data.id;
}

/**
 * Start async bulk message operation
 * Creates a bulk operation record and returns immediately
 * The operation will be processed asynchronously
 *
 * @param paymentIds - Array of payment UUIDs
 * @param message - Message to send
 * @param adminId - Admin user ID
 * @returns Bulk operation ID for tracking
 * @throws Error if database operation fails
 */
export async function startAsyncBulkMessage(
  paymentIds: string[],
  message: string,
  adminId: string
): Promise<string> {
  // Create bulk operation record
  const { data, error } = await supabase
    .from("bulk_operations")
    .insert({
      operation_type: "message",
      payment_ids: paymentIds,
      admin_id: adminId,
      message: message,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create bulk operation: ${error.message}`);
  }

  // Start processing in background (non-blocking)
  processBulkMessageAsync(data.id).catch((error) => {
    console.error(`Async bulk message failed for operation ${data.id}:`, error);
  });

  return data.id;
}

/**
 * Start async bulk export operation
 * Creates a bulk operation record and returns immediately
 * The operation will be processed asynchronously
 *
 * @param paymentIds - Array of payment UUIDs to export
 * @param adminId - Admin user ID
 * @returns Bulk operation ID for tracking
 * @throws Error if database operation fails
 */
export async function startAsyncBulkExport(paymentIds: string[], adminId: string): Promise<string> {
  // Create bulk operation record
  const { data, error } = await supabase
    .from("bulk_operations")
    .insert({
      operation_type: "export",
      payment_ids: paymentIds,
      admin_id: adminId,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create bulk operation: ${error.message}`);
  }

  // Start processing in background (non-blocking)
  processBulkExportAsync(data.id).catch((error) => {
    console.error(`Async bulk export failed for operation ${data.id}:`, error);
  });

  return data.id;
}

/**
 * Get bulk operation status
 *
 * @param operationId - Bulk operation ID
 * @returns Bulk operation status and results
 * @throws Error if database query fails
 */
export async function getBulkOperationStatus(operationId: string): Promise<any> {
  const { data, error } = await supabase
    .from("bulk_operations")
    .select("*")
    .eq("id", operationId)
    .single();

  if (error) {
    throw new Error(`Failed to get bulk operation status: ${error.message}`);
  }

  return data;
}

/**
 * Process bulk approve operation asynchronously
 * Internal function - called by startAsyncBulkApprove
 *
 * @param operationId - Bulk operation ID
 */
async function processBulkApproveAsync(operationId: string): Promise<void> {
  try {
    // Get operation details
    const { data: operation } = await supabase
      .from("bulk_operations")
      .select("*")
      .eq("id", operationId)
      .single();

    if (!operation) {
      throw new Error(`Bulk operation ${operationId} not found`);
    }

    // Update status to processing
    await supabase
      .from("bulk_operations")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", operationId);

    const paymentIds = operation.payment_ids as string[];
    const adminId = operation.admin_id;
    const result: BulkOperationResult = {
      success_count: 0,
      failure_count: 0,
      errors: [],
    };

    // Import payment service for approval
    const { approvePayment } = await import("./payment-service");

    // Process in batches
    const BATCH_SIZE = 10;
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

      // Update progress periodically
      if (batchIndex % 2 === 0 || batchIndex === totalBatches - 1) {
        await supabase
          .from("bulk_operations")
          .update({
            success_count: result.success_count,
            failure_count: result.failure_count,
            errors: result.errors,
          })
          .eq("id", operationId);
      }

      // Small delay between batches
      if (batchIndex < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Mark as completed
    await supabase
      .from("bulk_operations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        success_count: result.success_count,
        failure_count: result.failure_count,
        errors: result.errors,
      })
      .eq("id", operationId);
  } catch (error) {
    // Mark as failed
    await supabase
      .from("bulk_operations")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        errors: [{ error: error instanceof Error ? error.message : "Unknown error" }],
      })
      .eq("id", operationId);
  }
}

/**
 * Process bulk message operation asynchronously
 * Internal function - called by startAsyncBulkMessage
 *
 * @param operationId - Bulk operation ID
 */
async function processBulkMessageAsync(operationId: string): Promise<void> {
  try {
    // Get operation details
    const { data: operation } = await supabase
      .from("bulk_operations")
      .select("*")
      .eq("id", operationId)
      .single();

    if (!operation) {
      throw new Error(`Bulk operation ${operationId} not found`);
    }

    // Update status to processing
    await supabase
      .from("bulk_operations")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", operationId);

    const paymentIds = operation.payment_ids as string[];
    const adminId = operation.admin_id;
    const message = operation.message as string;
    const result: BulkOperationResult = {
      success_count: 0,
      failure_count: 0,
      errors: [],
    };

    // Import conversation service
    const { sendMessage } = await import("./conversation-service");

    // Process in batches
    const BATCH_SIZE = 10;
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

          // Send message
          await sendMessage(conversation.id, adminId, message, [], false);
          result.success_count++;
        } catch (error) {
          result.failure_count++;
          result.errors.push({
            payment_id: paymentId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Update progress periodically
      if (batchIndex % 2 === 0 || batchIndex === totalBatches - 1) {
        await supabase
          .from("bulk_operations")
          .update({
            success_count: result.success_count,
            failure_count: result.failure_count,
            errors: result.errors,
          })
          .eq("id", operationId);
      }

      // Small delay between batches
      if (batchIndex < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Mark as completed
    await supabase
      .from("bulk_operations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        success_count: result.success_count,
        failure_count: result.failure_count,
        errors: result.errors,
      })
      .eq("id", operationId);
  } catch (error) {
    // Mark as failed
    await supabase
      .from("bulk_operations")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        errors: [{ error: error instanceof Error ? error.message : "Unknown error" }],
      })
      .eq("id", operationId);
  }
}

/**
 * Process bulk export operation asynchronously
 * Internal function - called by startAsyncBulkExport
 *
 * @param operationId - Bulk operation ID
 */
async function processBulkExportAsync(operationId: string): Promise<void> {
  try {
    // Get operation details
    const { data: operation } = await supabase
      .from("bulk_operations")
      .select("*")
      .eq("id", operationId)
      .single();

    if (!operation) {
      throw new Error(`Bulk operation ${operationId} not found`);
    }

    // Update status to processing
    await supabase
      .from("bulk_operations")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", operationId);

    const paymentIds = operation.payment_ids as string[];

    // Generate CSV
    const csvBlob = await exportPaymentsToCSV(paymentIds);

    // Upload to Supabase Storage
    const fileName = `export-${operationId}-${Date.now()}.csv`;
    const filePath = `bulk-exports/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(filePath, csvBlob, {
        contentType: "text/csv",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload export file: ${uploadError.message}`);
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(filePath, 3600); // 1 hour expiration

    // Mark as completed
    await supabase
      .from("bulk_operations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        success_count: paymentIds.length,
        failure_count: 0,
        export_file_path: filePath,
        export_file_url: urlData?.signedUrl,
      })
      .eq("id", operationId);
  } catch (error) {
    // Mark as failed
    await supabase
      .from("bulk_operations")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        errors: [{ error: error instanceof Error ? error.message : "Unknown error" }],
      })
      .eq("id", operationId);
  }
}
