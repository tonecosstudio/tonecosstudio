import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { transitionStandalonePurchaseStatus } from "@/services/payments/standalone-purchase-service";
import { fetchOrdersByUserId } from "@/services/admin/orders/orders-service";
import { updateDeliveryStatus } from "@/services/admin/delivery/delivery-detail-service";
import {
  fetchActiveSubscriptionSummary,
  type ActiveSubscriptionSummary,
} from "@/services/subscriptions/subscription-summary-service";
import {
  fetchCustomerProfile,
  type CustomerProfileData,
} from "@/services/admin/customers/customer-profile-service";
import { updateManualPaymentStatus as updateManualPaymentStatusRpc } from "@/services/admin/orders/admin-order-status-service";
import type { ManualPaymentStatus, UnifiedOrder, OrderStatus } from "@/types/admin/orders";

export type CustomerProfile = CustomerProfileData;

const MANUAL_PAYMENT_STATUS_VALUES: readonly ManualPaymentStatus[] = [
  "pending",
  "under_review",
  "requires_info",
  "approved",
  "rejected",
];

function assertManualPaymentStatus(status: string): ManualPaymentStatus {
  if (MANUAL_PAYMENT_STATUS_VALUES.includes(status as ManualPaymentStatus)) {
    return status as ManualPaymentStatus;
  }

  throw new Error("Status invalido para pagamento manual");
}

export interface OrderProductionStage {
  id: string;
  order_id: string;
  stage: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface CustomerSidebarOrder {
  id: string;
  type: "subscription_delivery" | "standalone_purchase";
  reference_number: string;
  user_id: string;
  amount: number;
  status: OrderStatus;
  payment_type: string | null;
  created_at: string;
  tracking_code?: string;
  production_stages?: OrderProductionStage[];
}

export interface CustomerSidebarQuote {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  items_count?: number;
  items_summary?: string;
  notes?: string | null;
}

export interface CustomerSidebarSubscription {
  id: string;
  user_id: string;
  collection_id: string;
  plan_type: string;
  status: string;
  next_delivery_date: string;
  created_at: string;
  updated_at: string;
  deliveries_completed: number;
  deliveries_total: number | null;
  total_paid: number | null;
  payment_method: string | null;
}

export interface CustomerSidebarPayment {
  id: string;
  reference_number: string;
  user_id: string;
  amount: number;
  status: string;
  payment_type: string;
  payment_method_label: string;
  created_at: string;
}

export interface CustomerSidebarData {
  profile: CustomerProfile | null;
  orders: CustomerSidebarOrder[];
  quotes: CustomerSidebarQuote[];
  subscription: CustomerSidebarSubscription | null;
  payments: CustomerSidebarPayment[];
}

type ProductionQueueRow = {
  id: string;
  order_id: string | null;
  order_type?: string | null;
  created_at?: string;
};

type ProductionStageRow = {
  id: string;
  production_queue_id: string;
  stage_name: string;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
};

function toSidebarOrder(order: UnifiedOrder): CustomerSidebarOrder | null {
  if (order.type !== "subscription_delivery" && order.type !== "standalone_purchase") {
    return null;
  }

  return {
    id: order.id,
    type: order.type,
    reference_number: order.id,
    user_id: order.customer.id,
    amount: order.amount,
    status: order.status,
    payment_type: order.type === "subscription_delivery" ? "subscription_delivery" : "standalone_purchase",
    created_at: order.createdAt,
    tracking_code: order.trackingCode ?? undefined,
  };
}

function toSidebarSubscription(row: ActiveSubscriptionSummary): CustomerSidebarSubscription {
  return {
    id: row.id,
    user_id: row.user_id,
    collection_id: row.collection_id ?? "",
    plan_type: row.plan_type ?? "",
    status: row.status,
    next_delivery_date: row.next_delivery_at ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    deliveries_completed: row.deliveries_completed,
    deliveries_total: row.deliveries_total,
    total_paid: row.total_paid,
    payment_method: row.payment_method,
  };
}

function toSidebarQuoteFromUnified(order: UnifiedOrder): CustomerSidebarQuote | null {
  if (order.type !== "quote" || !order.quote) {
    return null;
  }

  return {
    id: order.id,
    user_id: order.customer.id,
    status: order.status,
    payment_status: order.quote.paymentStatus ?? "pending",
    total_amount: order.amount,
    created_at: order.createdAt,
    items_count: order.quote.itemsCount ?? order.quote.items.length,
    items_summary: order.quote.itemsSummary ?? undefined,
    notes: order.quote.notes,
  };
}

function toSidebarPaymentFromUnified(order: UnifiedOrder): CustomerSidebarPayment | null {
  if (order.type !== "manual_payment" || !order.manualPayment) {
    return null;
  }

  return {
    id: order.id,
    reference_number: order.manualPayment.referenceId ?? order.id,
    user_id: order.customer.id,
    amount: order.amount,
    status: order.status,
    payment_type: order.manualPayment.referenceType ?? "manual_payment",
    payment_method_label: order.manualPayment.paymentMethod ?? "Nao informado",
    created_at: order.createdAt,
  };
}

export async function getUserSubscription(
  userId: string
): Promise<CustomerSidebarSubscription | null> {
  try {
    const subscription = await fetchActiveSubscriptionSummary(userId);
    return subscription ? toSidebarSubscription(subscription) : null;
  } catch (error) {
    log.error("Erro ao buscar assinatura ativa do usuario", { error, userId });
    return null;
  }
}

export async function getCustomerSidebarData(userId: string): Promise<CustomerSidebarData> {
  const [profile, unifiedOrders, subscription] = await Promise.all([
    fetchCustomerProfile(userId),
    fetchOrdersByUserId(userId),
    getUserSubscription(userId),
  ]);

  const orders = await hydrateOrderProductionStages(
    unifiedOrders
      .map(toSidebarOrder)
      .filter((order): order is CustomerSidebarOrder => order !== null)
  );
  const quotes = unifiedOrders
    .map(toSidebarQuoteFromUnified)
    .filter((quote): quote is CustomerSidebarQuote => quote !== null);
  const payments = unifiedOrders
    .map(toSidebarPaymentFromUnified)
    .filter((payment): payment is CustomerSidebarPayment => payment !== null);

  return {
    profile,
    orders,
    quotes,
    subscription,
    payments,
  };
}

export async function getOrderProductionStages(orderId: string): Promise<OrderProductionStage[]> {
  const { data, error } = await supabase
    .from("production_queue")
    .select("id, order_id, order_type, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    log.error("Erro ao buscar fila de producao do pedido", { error, orderId });
    return [];
  }

  const queueItem = (data as ProductionQueueRow[] | null)?.[0];
  if (!queueItem?.id) {
    return [];
  }

  return getProductionStagesByQueueMap([queueItem]).then((stageMap) => stageMap.get(orderId) ?? []);
}

export async function updateOrderStatus(
  orderId: string,
  orderType: CustomerSidebarOrder["type"],
  status: OrderStatus
): Promise<void> {
  if (orderType === "subscription_delivery") {
    await updateDeliveryStatus({
      deliveryId: orderId,
      newStatus: status,
    });
    return;
  }

  await transitionStandalonePurchaseStatus(orderId, status);
}

export async function updatePaymentStatus(paymentId: string, status: string): Promise<void> {
  await updateManualPaymentStatusRpc(paymentId, assertManualPaymentStatus(status));
}

async function hydrateOrderProductionStages(
  orders: CustomerSidebarOrder[]
): Promise<CustomerSidebarOrder[]> {
  if (orders.length === 0) {
    return orders;
  }

  const { data, error } = await supabase
    .from("production_queue")
    .select("id, order_id, order_type, created_at")
    .in(
      "order_id",
      orders.map((order) => order.id)
    )
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Erro ao buscar filas de producao dos pedidos", {
      error,
      orderIds: orders.map((order) => order.id),
    });
    return orders;
  }

  const stageMap = await getProductionStagesByQueueMap((data as ProductionQueueRow[] | null) ?? []);
  return orders.map((order) => ({
    ...order,
    production_stages: stageMap.get(order.id) ?? [],
  }));
}

async function getProductionStagesByQueueMap(
  queueRows: ProductionQueueRow[]
): Promise<Map<string, OrderProductionStage[]>> {
  const latestQueueByOrderId = new Map<string, string>();

  for (const row of queueRows) {
    if (row.order_id && !latestQueueByOrderId.has(row.order_id)) {
      latestQueueByOrderId.set(row.order_id, row.id);
    }
  }

  if (latestQueueByOrderId.size === 0) {
    return new Map();
  }

  const queueIds = [...latestQueueByOrderId.values()];
  const orderIdByQueueId = new Map(
    [...latestQueueByOrderId.entries()].map(([orderId, queueId]) => [queueId, orderId] as const)
  );

  const { data, error } = await supabase
    .from("production_stages")
    .select("id, production_queue_id, stage_name, notes, assigned_to, created_at")
    .in("production_queue_id", queueIds)
    .order("created_at", { ascending: true });

  if (error) {
    log.error("Erro ao buscar estagios de producao", { error, queueIds });
    return new Map();
  }

  const stageMap = new Map<string, OrderProductionStage[]>();
  for (const stage of (data as ProductionStageRow[] | null) ?? []) {
    const orderId = orderIdByQueueId.get(stage.production_queue_id);
    if (!orderId) {
      continue;
    }

    const currentStages = stageMap.get(orderId) ?? [];
    currentStages.push({
      id: stage.id,
      order_id: orderId,
      stage: stage.stage_name,
      notes: stage.notes ?? undefined,
      created_by: stage.assigned_to ?? "",
      created_at: stage.created_at,
    });
    stageMap.set(orderId, currentStages);
  }

  return stageMap;
}
