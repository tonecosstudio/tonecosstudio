/**
 * Integration Service for Customer Sidebar
 * Fetches user orders, quotes, subscriptions, and payments
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 8.2, 8.3, 8.4, 9.1, 9.2, 19.1, 19.2, 19.5
 */

import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { updateManualPaymentStatus as updateManualPaymentStatusRpc } from "@/services/admin/admin-order-status-service";
import type { ManualPaymentStatus } from "@/types/admin/orders";

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

// Note: This is a simplified order interface for the integration service
// For full order management, use UnifiedOrder from @/types/admin/orders
export interface IntegrationOrder {
  id: string;
  reference_number: string;
  user_id: string;
  amount: number;
  status: string;
  payment_type: string;
  created_at: string;
  tracking_code?: string;
  production_stages?: OrderProductionStage[];
}

export type Order = IntegrationOrder;

export interface OrderProductionStage {
  id: string;
  order_id: string;
  stage: "molde_pronto" | "impressao_iniciada" | "pintura_iniciada" | "finalizacao";
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface Quote {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  items_summary?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  collection_id: string;
  plan_type: string;
  status: string;
  next_delivery_date: string;
  created_at: string;
}

export interface ManualPayment {
  id: string;
  reference_number: string;
  user_id: string;
  amount: number;
  status: string;
  payment_type: string;
  payment_method_id: string;
  created_at: string;
}

type ManualPaymentRow = {
  id: string;
  reference_number: string | null;
  reference_id?: string | null;
  user_id: string;
  amount: number;
  status: string | null;
  payment_type: string;
  payment_method_id: string | null;
  created_at: string;
};

type QuoteRow = {
  id: string;
  user_id: string;
  status: string;
  payment_status: string | null;
  total_amount: number | null;
  created_at: string;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  collection_id: string | null;
  plan_type: string | null;
  status: string;
  next_delivery_date?: string | null;
  next_delivery_at?: string | null;
  created_at: string;
};

function toIntegrationOrder(row: ManualPaymentRow): IntegrationOrder {
  return {
    id: row.id,
    reference_number: row.reference_number ?? row.reference_id ?? row.id,
    user_id: row.user_id,
    amount: row.amount,
    status: row.status ?? "pending",
    payment_type: row.payment_type,
    created_at: row.created_at,
  };
}

function toQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    user_id: row.user_id,
    status: row.status,
    payment_status: row.payment_status ?? "pending",
    total_amount: row.total_amount ?? 0,
    created_at: row.created_at,
  };
}

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    user_id: row.user_id,
    collection_id: row.collection_id ?? "",
    plan_type: row.plan_type ?? "",
    status: row.status,
    next_delivery_date: row.next_delivery_date ?? row.next_delivery_at ?? "",
    created_at: row.created_at,
  };
}

function toManualPayment(row: ManualPaymentRow): ManualPayment {
  return {
    id: row.id,
    reference_number: row.reference_number ?? row.reference_id ?? row.id,
    user_id: row.user_id,
    amount: row.amount,
    status: row.status ?? "pending",
    payment_type: row.payment_type,
    payment_method_id: row.payment_method_id ?? "",
    created_at: row.created_at,
  };
}

/**
 * Get all orders for a user
 * Requirements: 7.1, 7.2
 */
export async function getUserOrders(userId: string): Promise<IntegrationOrder[]> {
  const { data, error } = await supabase
    .from("manual_payments")
    .select("*")
    .eq("user_id", userId)
    .not("quote_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Erro ao buscar pedidos do usuário", { error, userId });
    throw error;
  }

  return ((data || []) as ManualPaymentRow[]).map(toIntegrationOrder);
}

/**
 * Get all quotes for a user
 * Requirements: 8.2, 8.3
 */
export async function getUserQuotes(userId: string): Promise<Quote[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Erro ao buscar orçamentos do usuário", { error, userId });
    throw error;
  }

  return ((data || []) as QuoteRow[]).map(toQuote);
}

/**
 * Get active subscription for a user
 * Requirements: 9.1, 9.2
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    log.error("Erro ao buscar assinatura ativa do usuário", { error, userId });
    return null;
  }

  return data ? toSubscription(data as SubscriptionRow) : null;
}

/**
 * Get all manual payments for a user
 * Requirements: 19.1, 19.2, 19.5
 */
export async function getUserPayments(userId: string): Promise<ManualPayment[]> {
  const { data, error } = await supabase
    .from("manual_payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Erro ao buscar pagamentos do usuário", { error, userId });
    throw error;
  }

  return ((data || []) as ManualPaymentRow[]).map(toManualPayment);
}

export async function getOrderProductionStages(orderId: string): Promise<OrderProductionStage[]> {
  log.debug("Histórico legado de estágios de produção indisponível neste boundary", { orderId });
  return [];
}

/**
 * Update order status
 * Requirements: 7.6
 */
export async function updateOrderStatus(
  orderId: string,
  status: string,
  _trackingCode?: string
): Promise<void> {
  // Note: tracking_code is not a column on manual_payments; tracking is handled via production_queue
  await updateManualPaymentStatusRpc(orderId, assertManualPaymentStatus(status));
}

/**
 * Update payment status
 * Requirements: 19.1, 19.2
 */
export async function updatePaymentStatus(paymentId: string, status: string): Promise<void> {
  await updateManualPaymentStatusRpc(paymentId, assertManualPaymentStatus(status));
}
