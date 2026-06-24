import { useMutation, useQueryClient } from "@tanstack/react-query";
import { log } from "@/lib/logger";
import {
  transitionStandalonePurchaseStatus,
  updateStandaloneTrackingCode,
} from "@/services/payments/standalone-purchase-service";
import { updateDeliveryStatus } from "@/services/admin/delivery/delivery-detail-service";
import {
  updateManualPaymentStatus,
  updateQuoteTrackingCode,
  updateQuoteStatusRpc,
  updateSubscriptionDeliveryDates,
} from "@/services/admin/orders/admin-order-status-service";
import { ORDERS_QUERY_KEY } from "./useOrdersQuery";
import type { BulkActionResult, OrderStatus, UnifiedOrder } from "@/types/admin/orders";
import { getOrderStatusLabel } from "@/config/admin-order-status";
import {
  getValidTransitions as getValidOrderTransitions,
  isFinalStatus as isOrderFinalStatus,
  validateStatusTransition as validateOrderStatusTransition,
} from "@/services/admin/orders/orders-validator";

type OrderType = UnifiedOrder["type"];

export interface UpdateOrderStatusParams {
  orderId: string;
  orderType: OrderType;
  newStatus: OrderStatus;
  notes?: string;
}

export interface BulkUpdateStatusParams {
  orderIds: string[];
  orderType: OrderType;
  newStatus: OrderStatus;
}

export interface UpdateTrackingCodeParams {
  orderId: string;
  orderType: OrderType;
  trackingCode: string;
}

interface BulkStatusOrder {
  id: string;
  type: OrderType;
  status: OrderStatus;
}

interface UpdateDeliveryDateParams {
  orderId: string;
  orderType: OrderType;
  expectedDate?: string;
  actualDate?: string;
}

const STATUS_COLORS: Partial<Record<OrderStatus, string>> = {
  scheduled: "blue",
  pending_choice: "yellow",
  confirmed: "green",
  in_production: "purple",
  shipped: "indigo",
  delivered: "green",
  revealed: "teal",
  awaiting_deposit: "orange",
  deposit_paid: "lime",
  awaiting_balance: "orange",
  balance_paid: "lime",
  completed: "green",
  pending: "gray",
  under_review: "blue",
  requires_info: "yellow",
  approved: "green",
  rejected: "red",
  reviewing: "blue",
  answered: "green",
  archived: "gray",
  cancelled: "red",
};

async function updateOrderStatusRecord(
  orderId: string,
  orderType: OrderType,
  newStatus: OrderStatus,
  notes?: string
) {
  if (orderType === "subscription_delivery") {
    const result = await updateDeliveryStatus({
      deliveryId: orderId,
      newStatus,
    });
    return result.delivery ?? { id: orderId, status: newStatus };
  }

  if (orderType === "standalone_purchase") {
    await transitionStandalonePurchaseStatus(orderId, newStatus);
    return { id: orderId, status: newStatus };
  }

  if (orderType === "manual_payment") {
    const rejectionReason =
      newStatus === "rejected" ? notes?.trim() || "Rejeitado pelo painel admin" : null;
    await updateManualPaymentStatus(orderId, newStatus, rejectionReason);
    return { id: orderId, status: newStatus };
  }

  await updateQuoteStatusRpc(orderId, newStatus);
  return { id: orderId, status: newStatus };
}

async function updateOrderTrackingCodeRecord({
  orderId,
  orderType,
  trackingCode,
}: UpdateTrackingCodeParams) {
  if (orderType === "subscription_delivery") {
    const result = await updateDeliveryStatus({
      deliveryId: orderId,
      newStatus: "shipped",
      trackingCode,
      notes: "Codigo de rastreamento atualizado pelo painel admin",
    });
    return result.delivery ?? { id: orderId, tracking_code: trackingCode };
  }

  if (orderType === "standalone_purchase") {
    await updateStandaloneTrackingCode(orderId, trackingCode);
    return { id: orderId, tracking_code: trackingCode };
  }

  if (orderType === "quote") {
    await updateQuoteTrackingCode(orderId, trackingCode);
    return { id: orderId, tracking_code: trackingCode };
  }

  throw new Error("Manual payments do not support tracking codes");
}

async function updateOrderDeliveryDateRecord({
  orderId,
  orderType,
  actualDate,
}: UpdateDeliveryDateParams) {
  if (orderType !== "subscription_delivery") {
    throw new Error("Delivery dates can only be updated on subscription deliveries");
  }

  const actualDeliveryDate = actualDate ?? null;
  await updateSubscriptionDeliveryDates(orderId, actualDeliveryDate);
  return { id: orderId, actual_delivery_date: actualDeliveryDate };
}

export function useOrderMutations() {
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async (params: UpdateOrderStatusParams) =>
      updateOrderStatusRecord(params.orderId, params.orderType, params.newStatus, params.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      log.error("Failed to update order status", { error });
    },
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: async (params: {
      orders: BulkStatusOrder[];
      newStatus: OrderStatus;
      onProgress?: (current: number, total: number) => void;
    }): Promise<BulkActionResult> => {
      const { orders, newStatus, onProgress } = params;
      const result: BulkActionResult = { successful: [], failed: [] };

      for (let index = 0; index < orders.length; index += 1) {
        const order = orders[index];
        const transition = validateStatusTransition(order.status, newStatus, order.type);

        if (!transition.valid) {
          result.failed.push({
            id: order.id,
            error: transition.error || "Invalid status transition",
          });
          onProgress?.(index + 1, orders.length);
          continue;
        }

        try {
          await updateOrderStatusRecord(order.id, order.type, newStatus);
          result.successful.push(order.id);
        } catch (error) {
          result.failed.push({
            id: order.id,
            error: error instanceof Error ? error.message : "Unknown update error",
          });
        }

        onProgress?.(index + 1, orders.length);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      log.error("Failed to bulk update order statuses", { error });
    },
  });

  const updateTrackingCode = useMutation({
    mutationFn: async (params: UpdateTrackingCodeParams) => updateOrderTrackingCodeRecord(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      log.error("Failed to update order tracking code", { error });
    },
  });

  const updateDeliveryDate = useMutation({
    mutationFn: async (params: UpdateDeliveryDateParams) => updateOrderDeliveryDateRecord(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      log.error("Failed to update order delivery date", { error });
    },
  });

  return {
    updateStatus,
    bulkUpdateStatus,
    updateTrackingCode,
    updateDeliveryDate,
  };
}

export function useUpdateOrderStatus() {
  const { updateStatus } = useOrderMutations();
  return updateStatus;
}

export function useBulkUpdateStatus() {
  const { bulkUpdateStatus } = useOrderMutations();
  return bulkUpdateStatus;
}

export function useUpdateTrackingCode() {
  const { updateTrackingCode } = useOrderMutations();
  return updateTrackingCode;
}

export function validateStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  orderType: OrderType
): { valid: boolean; error?: string } {
  const validationError = validateOrderStatusTransition(currentStatus, newStatus, orderType);

  if (validationError) {
    return {
      valid: false,
      error: validationError.message,
    };
  }

  return { valid: true };
}

export function getValidNextStatuses(
  currentStatus: OrderStatus,
  orderType: OrderType
): OrderStatus[] {
  return getValidOrderTransitions(currentStatus, orderType);
}

export function isFinalStatus(status: OrderStatus, orderType?: OrderType): boolean {
  return isOrderFinalStatus(status, orderType);
}

export function getStatusLabel(status: OrderStatus): string {
  return getOrderStatusLabel(status);
}

export function getStatusColor(status: OrderStatus): string {
  return STATUS_COLORS[status] || "gray";
}

export function useApproveManualPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { approveManualPayment } = await import("@/services/admin/orders/orders-service");
      await approveManualPayment(paymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      queryClient.refetchQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      log.error("Failed to approve manual payment", { error });
    },
  });
}

export function useRejectManualPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { paymentId: string; reason: string }) => {
      const { rejectManualPayment } = await import("@/services/admin/orders/orders-service");
      await rejectManualPayment(params.paymentId, params.reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      queryClient.refetchQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      log.error("Failed to reject manual payment", { error });
    },
  });
}

export function useRequestManualPaymentInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { paymentId: string; message: string }) => {
      const { requestManualPaymentInfo } = await import("@/services/admin/orders/orders-service");
      await requestManualPaymentInfo(params.paymentId, params.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      queryClient.refetchQueries({ queryKey: [ORDERS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      log.error("Failed to request manual payment information", { error });
    },
  });
}
