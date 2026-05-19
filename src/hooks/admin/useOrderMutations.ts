import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { ORDERS_QUERY_KEY } from "./useOrdersQuery";
import type { BulkActionResult, OrderStatus, UnifiedOrder } from "@/types/admin/orders";

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

interface DeliveryDateUpdate {
  updated_at: string;
  actual_delivery_date?: string;
}

type StatusTransitionMap = Partial<Record<OrderStatus, OrderStatus[]>>;

const SUBSCRIPTION_TRANSITIONS: StatusTransitionMap = {
  scheduled: ["pending_choice", "cancelled"],
  pending_choice: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["revealed"],
  revealed: [],
  cancelled: [],
};

const PURCHASE_TRANSITIONS: StatusTransitionMap = {
  awaiting_deposit: ["deposit_paid", "cancelled"],
  deposit_paid: ["awaiting_balance", "cancelled"],
  awaiting_balance: ["balance_paid", "cancelled"],
  balance_paid: ["completed"],
  completed: [],
  cancelled: [],
};

const MANUAL_PAYMENT_TRANSITIONS: StatusTransitionMap = {
  pending: ["under_review", "rejected"],
  under_review: ["requires_info", "approved", "rejected"],
  requires_info: ["under_review", "rejected"],
  approved: [],
  rejected: [],
};

const QUOTE_TRANSITIONS: StatusTransitionMap = {
  pending: ["reviewing", "archived"],
  reviewing: ["answered", "archived"],
  answered: ["archived"],
  archived: [],
};

const STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  scheduled: "Agendada",
  pending_choice: "Aguardando Escolha",
  confirmed: "Confirmada",
  in_production: "Em Producao",
  shipped: "Enviada",
  delivered: "Entregue",
  revealed: "Revelada",
  awaiting_deposit: "Aguardando Deposito",
  deposit_paid: "Deposito Pago",
  awaiting_balance: "Aguardando Saldo",
  balance_paid: "Saldo Pago",
  completed: "Completa",
  pending: "Pendente",
  under_review: "Em Analise",
  requires_info: "Requer Informacoes",
  approved: "Aprovado",
  rejected: "Rejeitado",
  reviewing: "Em Analise",
  answered: "Respondido",
  archived: "Arquivado",
  cancelled: "Cancelada",
};

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

function createUpdatedAtPatch() {
  return { updated_at: new Date().toISOString() };
}

function getTransitionMap(orderType: OrderType): StatusTransitionMap {
  if (orderType === "subscription_delivery") return SUBSCRIPTION_TRANSITIONS;
  if (orderType === "standalone_purchase") return PURCHASE_TRANSITIONS;
  if (orderType === "manual_payment") return MANUAL_PAYMENT_TRANSITIONS;
  return QUOTE_TRANSITIONS;
}

async function updateOrderStatusRecord(
  orderId: string,
  orderType: OrderType,
  newStatus: OrderStatus
) {
  const update = { status: newStatus, ...createUpdatedAtPatch() };

  if (orderType === "subscription_delivery") {
    const { data, error } = await supabase
      .from("subscription_deliveries")
      .update(update)
      .eq("id", orderId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  if (orderType === "standalone_purchase") {
    const { data, error } = await supabase
      .from("standalone_purchases")
      .update(update)
      .eq("id", orderId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  if (orderType === "manual_payment") {
    const { data, error } = await supabase
      .from("manual_payments")
      .update(update)
      .eq("id", orderId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("quotes")
    .update(update)
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateOrderTrackingCodeRecord({
  orderId,
  orderType,
  trackingCode,
}: UpdateTrackingCodeParams) {
  const update = { tracking_code: trackingCode, ...createUpdatedAtPatch() };

  if (orderType === "subscription_delivery") {
    const { data, error } = await supabase
      .from("subscription_deliveries")
      .update(update)
      .eq("id", orderId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  if (orderType === "standalone_purchase") {
    const { data, error } = await supabase
      .from("standalone_purchases")
      .update(update)
      .eq("id", orderId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  if (orderType === "quote") {
    const { data, error } = await supabase
      .from("quotes")
      .update(update)
      .eq("id", orderId)
      .select()
      .single();
    if (error) throw error;
    return data;
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

  const updates: DeliveryDateUpdate = createUpdatedAtPatch();
  if (actualDate !== undefined) updates.actual_delivery_date = actualDate;

  const { data, error } = await supabase
    .from("subscription_deliveries")
    .update(updates)
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function useOrderMutations() {
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async (params: UpdateOrderStatusParams) =>
      updateOrderStatusRecord(params.orderId, params.orderType, params.newStatus),
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
  const validNextStatuses = getTransitionMap(orderType)[currentStatus] || [];

  if (!validNextStatuses.includes(newStatus)) {
    return {
      valid: false,
      error: `Transition from "${currentStatus}" to "${newStatus}" is not allowed`,
    };
  }

  return { valid: true };
}

export function getValidNextStatuses(
  currentStatus: OrderStatus,
  orderType: OrderType
): OrderStatus[] {
  return getTransitionMap(orderType)[currentStatus] || [];
}

export function isFinalStatus(status: OrderStatus): boolean {
  return ["revealed", "completed", "cancelled", "approved", "rejected", "answered", "archived"].includes(
    status
  );
}

export function getStatusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status] || status;
}

export function getStatusColor(status: OrderStatus): string {
  return STATUS_COLORS[status] || "gray";
}

export function useApproveManualPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { approveManualPayment } = await import("@/services/admin/orders-service");
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
      const { rejectManualPayment } = await import("@/services/admin/orders-service");
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
      const { requestManualPaymentInfo } = await import("@/services/admin/orders-service");
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
