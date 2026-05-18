/**
 * Integration Service for Customer Sidebar
 * Fetches user orders, quotes, subscriptions, and payments
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 8.2, 8.3, 8.4, 9.1, 9.2, 19.1, 19.2, 19.5
 */

import { supabase } from "@/integrations/supabase/client";

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
    console.error("Error fetching user orders:", error);
    throw error;
  }

  return data || [];
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
    console.error("Error fetching user quotes:", error);
    throw error;
  }

  return data || [];
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
    console.error("Error fetching user subscription:", error);
    return null;
  }

  return data;
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
    console.error("Error fetching user payments:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get production stages for an order
 * Requirements: 25.3
 *
 * Note: This function is currently disabled because order_production_stages
 * table is not yet in the Supabase types. It will be enabled after migration.
 */
export async function getOrderProductionStages(_orderId: string): Promise<OrderProductionStage[]> {
  // TODO: Enable after order_production_stages table is added to Supabase types
  console.warn("getOrderProductionStages is not yet implemented - table not in types");
  return [];

  /* Uncomment after migration:
  const { data, error } = await supabase
    .from("order_production_stages")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching order production stages:", error);
    throw error;
  }

  return data || [];
  */
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
  const updateData: { status: string } = { status };
  // Note: tracking_code is not a column on manual_payments; tracking is handled via production_queue

  const { error } = await supabase.from("manual_payments").update(updateData).eq("id", orderId);

  if (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
}

/**
 * Update payment status
 * Requirements: 19.1, 19.2
 */
export async function updatePaymentStatus(paymentId: string, status: string): Promise<void> {
  const { error } = await supabase.from("manual_payments").update({ status }).eq("id", paymentId);

  if (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
}
