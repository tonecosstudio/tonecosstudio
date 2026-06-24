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

type RpcError = { message?: string } | null;

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

export interface CreatePendingSubscriptionInput {
  plan_type: string;
  payment_method: string;
}

interface SubscriptionMutationRpcClient {
  rpc(
    functionName: "create_pending_subscription_for_current_user",
    args: {
      p_plan_type: string;
      p_payment_method: string;
    },
  ): PromiseLike<{ data: unknown; error: RpcError }>;
}

const subscriptionMutationRpc =
  supabase as unknown as SubscriptionMutationRpcClient;

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

function mapCreateSubscriptionError(message: string | undefined): string {
  const value = message ?? "";

  if (value.includes("INVALID_SUBSCRIPTION_PLAN_TYPE")) return "Plano invalido";
  if (value.includes("INVALID_SUBSCRIPTION_PAYMENT_METHOD")) {
    return "Forma de pagamento indisponivel";
  }
  if (value.includes("SUBSCRIPTION_PLAN_NOT_FOUND"))
    return "Plano nao encontrado";
  if (value.includes("SUBSCRIPTION_ALREADY_EXISTS")) {
    return "Voce ja possui uma assinatura ativa ou pendente";
  }

  return value || "Erro ao criar assinatura";
}

export async function createPendingSubscriptionForCurrentUser(
  input: CreatePendingSubscriptionInput,
): Promise<{ success: true; subscription: DbSubscription }> {
  await requireAuthenticatedUserId();

  const { data, error } = await subscriptionMutationRpc.rpc(
    "create_pending_subscription_for_current_user",
    {
      p_plan_type: input.plan_type,
      p_payment_method: input.payment_method,
    },
  );

  if (error) {
    throw new Error(mapCreateSubscriptionError(error.message));
  }

  return { success: true, subscription: data as DbSubscription };
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
