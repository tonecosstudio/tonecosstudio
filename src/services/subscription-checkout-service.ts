import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";

type RpcError = { message?: string } | null;

type CheckoutRow = Record<string, unknown> & { id: string };

type SubscriptionCheckoutResult = {
  subscription: CheckoutRow;
  payment: CheckoutRow;
};

interface SubscriptionCheckoutRpcClient {
  rpc(functionName: "create_subscription_checkout_for_current_user", args: {
    p_plan_id: string;
    p_collection_id: string;
    p_payment_method: SubscriptionPaymentMethod;
    p_payment_voucher_url: string | null;
  }): PromiseLike<{ data: unknown; error: RpcError }>;
}

const subscriptionCheckoutRpc = supabase as unknown as SubscriptionCheckoutRpcClient;

export type SubscribePlan = {
  id: string;
  name: string;
  description: string | null;
  plan_type: string;
  price_pix: number | string | null;
  price_full: number | string | null;
  deliveries_total: number;
  is_active: boolean;
};

export type SubscribeCollectionOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  cover_image_url?: string | null;
  is_active: boolean;
  collection_characters?: Array<{
    id: string;
    name: string;
    status: string | null;
  }>;
};

export type SubscriptionPaymentMethod = "pix" | "credit_card";

type SubscribeCollectionQueryRow = Omit<SubscribeCollectionOption, "image_url" | "collection_characters"> & {
  image_url?: string | null;
  cover_image_url?: string | null;
  collection_characters?: SubscribeCollectionOption["collection_characters"] | null;
};

function toSubscribeCollectionOption(row: SubscribeCollectionQueryRow): SubscribeCollectionOption {
  return {
    ...row,
    image_url: row.image_url ?? row.cover_image_url ?? null,
    collection_characters: row.collection_characters ?? [],
  };
}

function mapSubscriptionCheckoutError(message: string | undefined): string {
  const value = message ?? "";

  if (value.includes("SUBSCRIPTION_PLAN_REQUIRED")) return "Selecione um plano";
  if (value.includes("SUBSCRIPTION_COLLECTION_REQUIRED")) return "Selecione uma colecao ativa";
  if (value.includes("INVALID_SUBSCRIPTION_PAYMENT_METHOD")) {
    return "Forma de pagamento indisponivel";
  }
  if (value.includes("INVALID_PAYMENT_VOUCHER_URL")) {
    return "Comprovante de pagamento invalido";
  }
  if (value.includes("SUBSCRIPTION_PLAN_NOT_FOUND")) {
    return "Plano de assinatura indisponivel";
  }
  if (value.includes("SUBSCRIPTION_COLLECTION_NOT_FOUND")) {
    return "Colecao indisponivel para assinatura";
  }
  if (value.includes("SUBSCRIPTION_CHECKOUT_EXISTS")) {
    return "Ja existe uma assinatura ativa ou pendente para esta colecao";
  }
  if (value.includes("SUBSCRIPTION_PRICE_NOT_CONFIGURED")) {
    return "Preco do plano indisponivel";
  }
  if (value.includes("PAYMENT_REFERENCE_EXHAUSTED")) {
    return "Nao foi possivel gerar a referencia de pagamento";
  }

  return value || "Erro ao criar assinatura";
}

export async function listSubscribePlans(): Promise<SubscribePlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, name, description, plan_type, price_pix, price_full, deliveries_total, is_active")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as SubscribePlan[];
}

export async function listSubscribeCollections(): Promise<SubscribeCollectionOption[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_characters (id, name, status)")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as SubscribeCollectionQueryRow[]).map(toSubscribeCollectionOption);
}

export async function getSubscribeCollectionBySlug(
  slug: string,
): Promise<SubscribeCollectionOption | null> {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data ? toSubscribeCollectionOption(data as unknown as SubscribeCollectionQueryRow) : null;
}

export async function createSubscriptionCheckout(params: {
  userId: string;
  selectedPlan: SubscribePlan;
  activeCollectionId: string;
  paymentMethod: SubscriptionPaymentMethod;
  paymentVoucherUrl: string | null;
}) {
  const { userId, selectedPlan, activeCollectionId, paymentMethod, paymentVoucherUrl } = params;
  await assertCurrentUserId(userId);

  const { data, error } = await subscriptionCheckoutRpc.rpc(
    "create_subscription_checkout_for_current_user",
    {
      p_plan_id: selectedPlan.id,
      p_collection_id: activeCollectionId,
      p_payment_method: paymentMethod,
      p_payment_voucher_url: paymentVoucherUrl,
    },
  );

  if (error) {
    throw new Error(mapSubscriptionCheckoutError(error.message));
  }

  return data as SubscriptionCheckoutResult;
}
