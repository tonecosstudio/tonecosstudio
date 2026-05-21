import { supabase } from "@/integrations/supabase/client";

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

export async function listSubscribePlans(): Promise<SubscribePlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SubscribePlan[];
}

export async function listSubscribeCollections(): Promise<SubscribeCollectionOption[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_characters (id, name, status)")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SubscribeCollectionOption[];
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
  return (data ?? null) as SubscribeCollectionOption | null;
}

export async function createSubscriptionCheckout(params: {
  userId: string;
  selectedPlan: SubscribePlan;
  activeCollectionId: string;
  paymentMethod: SubscriptionPaymentMethod;
  paymentVoucherUrl: string | null;
}) {
  const { userId, selectedPlan, activeCollectionId, paymentMethod, paymentVoucherUrl } = params;

  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan_id: selectedPlan.id,
      plan_type: selectedPlan.plan_type,
      status: "pending_payment",
      collection_id: activeCollectionId,
      payment_method: paymentMethod,
      notes: paymentVoucherUrl ? `Comprovante: ${paymentVoucherUrl}` : null,
    })
    .select()
    .single();

  if (subError) throw subError;

  const amount = paymentMethod === "pix" ? selectedPlan.price_pix : selectedPlan.price_full;
  const paymentStatus = paymentVoucherUrl ? "under_review" : "pending";

  const { data: payment, error: payError } = await supabase
    .from("manual_payments")
    .insert({
      user_id: userId,
      amount: Number(amount),
      reference_type: "subscription",
      reference_id: subscription.id,
      status: paymentStatus,
      payment_method: paymentMethod,
      notes: paymentVoucherUrl ? `Comprovante: ${paymentVoucherUrl}` : null,
    })
    .select()
    .single();

  if (payError) throw payError;

  return { subscription, payment };
}
