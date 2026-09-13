import { supabase } from "@/integrations/supabase/client";
import {
  assertCurrentUserId,
  requireAuthenticatedUserId,
} from "@/services/auth/current-user";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";
import {
  fetchActiveSubscriptionSummary,
  type ActiveSubscriptionSummary,
} from "@/services/subscriptions/subscription-summary-service";

export type DbSubscription = ActiveSubscriptionSummary;

export interface DbSubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_interval: string;
  deliveries_per_cycle: number;
  is_active: boolean;
  slug: string | null;
  tier_id: string | null;
  features: unknown;
  created_at: string;
  updated_at: string;
}

interface CancelSubscriptionResponse {
  success?: boolean;
  error?: string;
  message?: string;
  deliveries_completed?: number;
  cancelled_deliveries?: number;
  capacity_released?: number;
  before_cutoff?: boolean;
}

export async function fetchSubscriptionForUser(
  userId?: string | null,
): Promise<DbSubscription | null> {
  const targetUserId = userId ?? (await requireAuthenticatedUserId());

  if (userId) {
    await assertCurrentUserId(userId);
  }

  return fetchActiveSubscriptionSummary(targetUserId);
}

export async function fetchSubscriptionPlan(
  planId: string,
  _context: { userId?: string | null } = {},
): Promise<DbSubscriptionPlan | null> {
  const { data: plan, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar plano de assinatura: ${error.message}`);
  }

  return plan;
}

export async function listAvailableSubscriptionPlans(): Promise<
  DbSubscriptionPlan[]
> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar planos: ${error.message}`);
  }

  return data || [];
}

export async function cancelSubscriptionById(
  subscriptionId: string,
): Promise<{ success: true }> {
  const fallbackError = "Erro ao cancelar assinatura";
  const result = await callAuthenticatedEdgeFunction<
    CancelSubscriptionResponse | null
  >("cancel-subscription", { subscriptionId }, fallbackError);

  if (!result?.success) {
    throw new Error(result?.error ?? fallbackError);
  }

  return { success: true };
}
