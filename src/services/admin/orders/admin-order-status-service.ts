import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { requireAdminRpcMatchingId } from "@/services/admin/rpc/admin-rpc-results";
import type { OrderStatus } from "@/types/admin/orders";

async function callAdminRpcExpectingId(
  functionName: string,
  args: Record<string, unknown>,
  expectedId: string,
  operation: string,
): Promise<void> {
  const result = await callAdminRpc<unknown>(functionName, args);
  requireAdminRpcMatchingId(result, expectedId, operation);
}

export async function updateManualPaymentStatus(
  paymentId: string,
  status: OrderStatus,
  rejectionReason?: string | null
): Promise<void> {
  await callAdminRpcExpectingId(
    "admin_update_manual_payment_status",
    {
      p_payment_id: paymentId,
      p_status: status,
      p_rejection_reason: rejectionReason ?? null,
    },
    paymentId,
    "Manual payment status update",
  );
}

export async function updateQuoteStatusRpc(quoteId: string, status: string): Promise<void> {
  await callAdminRpcExpectingId(
    "admin_update_quote_status",
    {
      p_quote_id: quoteId,
      p_status: status,
    },
    quoteId,
    "Quote status update",
  );
}

export async function updateSubscriptionDeliveryDates(
  deliveryId: string,
  actualDeliveryDate?: string | null
): Promise<void> {
  await callAdminRpcExpectingId(
    "admin_update_subscription_delivery_dates",
    {
      p_delivery_id: deliveryId,
      p_actual_delivery_date: actualDeliveryDate ?? null,
    },
    deliveryId,
    "Subscription delivery date update",
  );
}

export async function updateQuoteTrackingCode(quoteId: string, trackingCode: string): Promise<void> {
  await callAdminRpcExpectingId(
    "admin_update_quote_tracking_code",
    {
      p_quote_id: quoteId,
      p_tracking_code: trackingCode,
    },
    quoteId,
    "Quote tracking update",
  );
}

export async function recordOrderStatusHistory(input: {
  orderId: string;
  orderType: string;
  oldStatus: string | null;
  newStatus: string;
  notes?: string | null;
}): Promise<void> {
  await callAdminRpc("admin_record_order_status_history", {
    p_order_id: input.orderId,
    p_order_type: input.orderType,
    p_old_status: input.oldStatus,
    p_new_status: input.newStatus,
    p_notes: input.notes ?? null,
  });
}

export async function requestManualPaymentInfoRpc(
  paymentId: string,
  message: string
): Promise<void> {
  await callAdminRpc("admin_request_manual_payment_info", {
    p_payment_id: paymentId,
    p_message: message,
  });
}

export async function approveManualPaymentWithNotification(paymentId: string): Promise<void> {
  await callAdminRpc("admin_approve_manual_payment_with_notification", {
    p_payment_id: paymentId,
  });
}

export async function rejectManualPaymentWithNotification(
  paymentId: string,
  reason: string
): Promise<void> {
  await callAdminRpc("admin_reject_manual_payment_with_notification", {
    p_payment_id: paymentId,
    p_reason: reason,
  });
}
