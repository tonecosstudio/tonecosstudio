import { supabase } from "@/integrations/supabase/client";
import {
  LOCAL_SUPABASE_FALLBACK,
  PREVIEW_READ_ONLY,
} from "@/config/supabase-environment";
import { requireAuthenticatedUserId } from "@/services/auth/current-user";
import {
  deletePaymentVoucher,
  uploadPaymentVoucher,
} from "@/services/payments/payment-voucher-storage-service";
import { getSubscriptionModelSelectionIssue } from "@/services/subscriptions/subscription-model-selection";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SubscriptionPaymentMethod = "pix" | "credit_card";

export type SubscribePlan = {
  id: string;
  name: string;
  description: string | null;
  plan_type: string;
  price_pix: number;
  price_full: number;
  deliveries_total: number;
  total_credits: number | null;
  model_selection_limit: 6 | 12;
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
  catalog_model_slugs: string[];
};

export type SubscriptionCheckoutResult = {
  subscriptionId: string;
  paymentId: string;
  referenceNumber: string;
  amount: number;
  status: "under_review";
};

export type CustomerSubscriptionPayment = {
  id: string;
  status: string;
  paymentStatus: string;
  amount: number;
  rejectionReason: string | null;
};

type SubscribeCollectionQueryRow = Omit<SubscribeCollectionOption, "image_url" | "catalog_model_slugs"> & {
  image_url?: string | null;
  cover_image_url?: string | null;
  catalog_model_slugs?: string[] | null;
};

type SubscribePlanQueryRow = Omit<
  SubscribePlan,
  "price_pix" | "price_full" | "deliveries_total" | "total_credits" | "model_selection_limit"
> & {
  price_pix: unknown;
  price_full: unknown;
  deliveries_total: unknown;
  total_credits: unknown;
  model_selection_limit: unknown;
};

interface SubscriptionCheckoutRpcClient {
  rpc(
    name: "create_subscription_checkout_for_current_user",
    args: {
      p_plan_id: string;
      p_collection_id: string;
      p_selected_model_slugs: string[];
      p_payment_method: SubscriptionPaymentMethod;
      p_payment_voucher_url: string;
    },
  ): Promise<{ data: unknown; error: Error | null }>;
}

const subscriptionCheckoutRpc = supabase as unknown as SubscriptionCheckoutRpcClient;

function assertSubscriptionPaymentWritesAllowed(): void {
  if (LOCAL_SUPABASE_FALLBACK || PREVIEW_READ_ONLY) {
    throw new Error("O envio de comprovantes está indisponível neste ambiente.");
  }
}

function toSubscribeCollectionOption(row: SubscribeCollectionQueryRow): SubscribeCollectionOption {
  return {
    ...row,
    image_url: row.image_url ?? row.cover_image_url ?? null,
    catalog_model_slugs: Array.isArray(row.catalog_model_slugs)
      ? row.catalog_model_slugs.filter((slug): slug is string => typeof slug === "string")
      : [],
  };
}

function normalizeSubscribePlan(row: SubscribePlanQueryRow): SubscribePlan {
  const priceFull = Number(row.price_full);
  const pricePix = Number(row.price_pix);
  const deliveriesTotal = Number(row.deliveries_total);
  const totalCredits = row.total_credits == null ? null : Number(row.total_credits);
  const modelSelectionLimit = Number(row.model_selection_limit);

  const invalidMoney =
    !Number.isFinite(priceFull) ||
    !Number.isFinite(pricePix) ||
    priceFull <= 0 ||
    pricePix <= 0 ||
    pricePix > priceFull;
  const invalidDeliveries =
    !Number.isFinite(deliveriesTotal) ||
    !Number.isInteger(deliveriesTotal) ||
    deliveriesTotal <= 0;
  const invalidCredits =
    totalCredits !== null &&
    (!Number.isFinite(totalCredits) || !Number.isInteger(totalCredits) || totalCredits < 0);
  const invalidSelectionLimit =
    modelSelectionLimit !== 6 && modelSelectionLimit !== 12;

  if (invalidMoney || invalidDeliveries || invalidCredits || invalidSelectionLimit) {
    throw new Error(`Configuração comercial inválida no plano ${row.id}`);
  }

  return {
    ...row,
    price_pix: pricePix,
    price_full: priceFull,
    deliveries_total: deliveriesTotal,
    total_credits: totalCredits,
    model_selection_limit: modelSelectionLimit,
  };
}

export async function listSubscribePlans(): Promise<SubscribePlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, description, plan_type, price_pix, price_full, deliveries_total, total_credits, model_selection_limit, is_active",
    )
    .eq("is_active", true)
    .in("model_selection_limit", [6, 12])
    .order("display_order", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as SubscribePlanQueryRow[]).map(normalizeSubscribePlan);
}

export async function listSubscribeCollections(): Promise<SubscribeCollectionOption[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, slug, description, image_url, cover_image_url, is_active, catalog_model_slugs")
    .eq("is_active", true)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as SubscribeCollectionQueryRow[]).map(toSubscribeCollectionOption);
}

export async function getSubscribeCollectionBySlug(
  slug: string,
): Promise<SubscribeCollectionOption | null> {
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, slug, description, image_url, cover_image_url, is_active, catalog_model_slugs")
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data ? toSubscribeCollectionOption(data as unknown as SubscribeCollectionQueryRow) : null;
}

/** Creates one pending subscription through the existing database authority. */
export async function createSubscriptionCheckoutForCurrentUser(input: {
  planId: string;
  collectionId: string;
  selectedModelSlugs: string[];
  modelSelectionLimit: 6 | 12;
  paymentMethod: SubscriptionPaymentMethod;
  voucher: File;
}): Promise<SubscriptionCheckoutResult> {
  assertSubscriptionPaymentWritesAllowed();
  if (
    !input ||
    !UUID_PATTERN.test(input.planId) ||
    !UUID_PATTERN.test(input.collectionId) ||
    (input.paymentMethod !== "pix" && input.paymentMethod !== "credit_card") ||
    getSubscriptionModelSelectionIssue({
      selectedSlugs: input.selectedModelSlugs,
      selectionLimit: input.modelSelectionLimit,
    }) !== null ||
    !(input.voucher instanceof File)
  ) {
    throw new Error("subscription_checkout_input_invalid");
  }

  const userId = await requireAuthenticatedUserId();
  const voucherPath = await uploadPaymentVoucher({
    file: input.voucher,
    userId,
    pathPrefix: "subscriptions",
  });

  let data: unknown;
  try {
    const result = await subscriptionCheckoutRpc.rpc("create_subscription_checkout_for_current_user", {
      p_plan_id: input.planId,
      p_collection_id: input.collectionId,
      p_selected_model_slugs: input.selectedModelSlugs,
      p_payment_method: input.paymentMethod,
      p_payment_voucher_url: voucherPath,
    });
    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    try {
      await deletePaymentVoucher(voucherPath, userId);
    } catch {
      // Preserve the checkout error; an orphaned private object is not exposed.
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("SUBSCRIPTION_CHECKOUT_EXISTS")) {
      throw new Error(
        "Já existe uma assinatura ativa ou em análise para esta coleção. Consulte Pagamentos na sua conta.",
      );
    }
    throw error;
  }

  try {
    return parseSubscriptionCheckoutResult(data);
  } catch {
    throw new Error(
      "Não foi possível confirmar o resultado. Sua solicitação pode ter sido registrada; confira Pagamentos na sua conta antes de tentar novamente.",
    );
  }
}

function parseSubscriptionCheckoutResult(data: unknown): SubscriptionCheckoutResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("subscription_checkout_result_invalid");
  }
  const result = data as Record<string, unknown>;
  const subscription =
    result.subscription && typeof result.subscription === "object"
      ? result.subscription as Record<string, unknown>
      : null;
  const payment =
    result.payment && typeof result.payment === "object"
      ? result.payment as Record<string, unknown>
      : null;
  const amount = Number(payment?.amount);
  if (
    !subscription ||
    !payment ||
    typeof subscription.id !== "string" ||
    !UUID_PATTERN.test(subscription.id) ||
    typeof payment.id !== "string" ||
    !UUID_PATTERN.test(payment.id) ||
    typeof payment.reference_number !== "string" ||
    payment.reference_number.length < 5 ||
    payment.reference_number.length > 80 ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    payment.status !== "under_review"
  ) {
    throw new Error("subscription_checkout_result_invalid");
  }

  return {
    subscriptionId: subscription.id,
    paymentId: payment.id,
    referenceNumber: payment.reference_number,
    amount,
    status: "under_review",
  };
}

/** Loads only the authenticated customer's subscription linked to this payment. */
export async function getMySubscriptionPayment(
  paymentId: string,
): Promise<CustomerSubscriptionPayment | null> {
  if (!UUID_PATTERN.test(paymentId)) return null;
  const userId = await requireAuthenticatedUserId();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id,status,payment_status,total_paid,payment_rejection_reason")
    .eq("payment_id", paymentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    status: String(data.status),
    paymentStatus: String(data.payment_status),
    amount: Number(data.total_paid ?? 0),
    rejectionReason: data.payment_rejection_reason,
  };
}

/** Re-uploads evidence for the same rejected subscription and payment, without creating a second charge. */
export async function resubmitSubscriptionPaymentVoucher(input: {
  subscriptionId: string;
  voucher: File;
}): Promise<SubscriptionCheckoutResult> {
  assertSubscriptionPaymentWritesAllowed();
  if (!UUID_PATTERN.test(input.subscriptionId) || !(input.voucher instanceof File)) {
    throw new Error("subscription_voucher_resubmission_invalid");
  }

  const userId = await requireAuthenticatedUserId();
  const voucherPath = await uploadPaymentVoucher({
    file: input.voucher,
    userId,
    pathPrefix: "subscriptions",
  });

  let data: unknown;
  try {
    const result = await supabase.rpc("resubmit_subscription_payment_voucher_for_current_user", {
      p_subscription_id: input.subscriptionId,
      p_payment_voucher_path: voucherPath,
    });
    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    try {
      await deletePaymentVoucher(voucherPath, userId);
    } catch {
      // Keep the RPC failure as the primary error.
    }
    throw error;
  }

  try {
    const checkout = parseSubscriptionCheckoutResult(data);
    if (checkout.subscriptionId !== input.subscriptionId) {
      throw new Error("subscription_voucher_resubmission_result_invalid");
    }
    return checkout;
  } catch {
    throw new Error(
      "Não foi possível confirmar o reenvio. Confira Pagamentos na sua conta antes de enviar outro comprovante.",
    );
  }
}
