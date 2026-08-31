import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
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
  context: { userId?: string | null } = {},
): Promise<DbSubscriptionPlan | null> {
  const { data: plan, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    log.error("Failed to fetch subscription plan", {
      error,
      userId: context.userId,
      planId,
    });
    return null;
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
  const result = await callAuthenticatedEdgeFunction<{ error?: string } | null>(
    "cancel-subscription",
    { subscriptionId },
    "Erro ao cancelar assinatura",
  );
  if (result?.error) {
    throw new Error(result.error);
  }

  return { success: true };
}
