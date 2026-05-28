import { supabase } from "@/integrations/supabase/client";
import type { OrderStatus } from "@/types/admin/orders";

interface AdminOrderStatusRpcError {
  message: string;
}

interface AdminOrderStatusRpcClient {
  rpc(
    name: "admin_update_manual_payment_status",
    args: {
      p_payment_id: string;
      p_status: string;
      p_rejection_reason?: string | null;
    }
  ): Promise<{ data: string | null; error: AdminOrderStatusRpcError | null }>;
  rpc(
    name: "admin_update_quote_status",
    args: {
      p_quote_id: string;
      p_status: string;
    }
  ): Promise<{ data: string | null; error: AdminOrderStatusRpcError | null }>;
  rpc(
    name: "admin_update_subscription_delivery_dates",
    args: {
      p_delivery_id: string;
      p_actual_delivery_date?: string | null;
    }
  ): Promise<{ data: string | null; error: AdminOrderStatusRpcError | null }>;
  rpc(
    name: "admin_update_quote_tracking_code",
    args: {
      p_quote_id: string;
      p_tracking_code: string;
    }
  ): Promise<{ data: string | null; error: AdminOrderStatusRpcError | null }>;
  rpc(
    name: "admin_record_order_status_history",
    args: {
      p_order_id: string;
      p_order_type: string;
      p_old_status: string | null;
      p_new_status: string;
      p_notes?: string | null;
    }
  ): Promise<{ data: string | null; error: AdminOrderStatusRpcError | null }>;
  rpc(
    name: "admin_request_manual_payment_info",
    args: { p_payment_id: string; p_message: string }
  ): Promise<{ data: null; error: AdminOrderStatusRpcError | null }>;
  rpc(
    name: "admin_approve_manual_payment_with_notification",
    args: { p_payment_id: string }
  ): Promise<{ data: null; error: AdminOrderStatusRpcError | null }>;
  rpc(
    name: "admin_reject_manual_payment_with_notification",
    args: { p_payment_id: string; p_reason: string }
  ): Promise<{ data: null; error: AdminOrderStatusRpcError | null }>;
}

const adminOrderStatusRpc = supabase as unknown as AdminOrderStatusRpcClient;

export async function updateManualPaymentStatus(
  paymentId: string,
  status: OrderStatus,
  rejectionReason?: string | null
): Promise<void> {
  const { error } = await adminOrderStatusRpc.rpc("admin_update_manual_payment_status", {
    p_payment_id: paymentId,
    p_status: status,
    p_rejection_reason: rejectionReason ?? null,
  });

  if (error) throw error;
}

export async function updateQuoteStatusRpc(quoteId: string, status: string): Promise<void> {
  const { error } = await adminOrderStatusRpc.rpc("admin_update_quote_status", {
    p_quote_id: quoteId,
    p_status: status,
  });

  if (error) throw error;
}

export async function updateSubscriptionDeliveryDates(
  deliveryId: string,
  actualDeliveryDate?: string | null
): Promise<void> {
  const { error } = await adminOrderStatusRpc.rpc("admin_update_subscription_delivery_dates", {
    p_delivery_id: deliveryId,
    p_actual_delivery_date: actualDeliveryDate ?? null,
  });

  if (error) throw error;
}

export async function updateQuoteTrackingCode(quoteId: string, trackingCode: string): Promise<void> {
  const { error } = await adminOrderStatusRpc.rpc("admin_update_quote_tracking_code", {
    p_quote_id: quoteId,
    p_tracking_code: trackingCode,
  });

  if (error) throw error;
}

export async function recordOrderStatusHistory(input: {
  orderId: string;
  orderType: string;
  oldStatus: string | null;
  newStatus: string;
  notes?: string | null;
}): Promise<void> {
  const { error } = await adminOrderStatusRpc.rpc("admin_record_order_status_history", {
    p_order_id: input.orderId,
    p_order_type: input.orderType,
    p_old_status: input.oldStatus,
    p_new_status: input.newStatus,
    p_notes: input.notes ?? null,
  });

  if (error) throw error;
}

export async function requestManualPaymentInfoRpc(
  paymentId: string,
  message: string
): Promise<void> {
  const { error } = await adminOrderStatusRpc.rpc("admin_request_manual_payment_info", {
    p_payment_id: paymentId,
    p_message: message,
  });

  if (error) throw error;
}

export async function approveManualPaymentWithNotification(paymentId: string): Promise<void> {
  const { error } = await adminOrderStatusRpc.rpc("admin_approve_manual_payment_with_notification", {
    p_payment_id: paymentId,
  });

  if (error) throw error;
}

export async function rejectManualPaymentWithNotification(
  paymentId: string,
  reason: string
): Promise<void> {
  const { error } = await adminOrderStatusRpc.rpc("admin_reject_manual_payment_with_notification", {
    p_payment_id: paymentId,
    p_reason: reason,
  });

  if (error) throw error;
}
