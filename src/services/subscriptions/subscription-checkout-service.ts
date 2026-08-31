import { supabase } from "@/integrations/supabase/client";

export type SubscribePlan = {
  id: string;
  name: string;
  description: string | null;
  plan_type: string;
  price_pix: number;
  price_full: number;
  deliveries_total: number;
  total_credits: number | null;
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

type SubscribeCollectionQueryRow = Omit<SubscribeCollectionOption, "image_url" | "collection_characters"> & {
  image_url?: string | null;
  cover_image_url?: string | null;
  collection_characters?: SubscribeCollectionOption["collection_characters"] | null;
};

type SubscribePlanQueryRow = Omit<
  SubscribePlan,
  "price_pix" | "price_full" | "deliveries_total" | "total_credits"
> & {
  price_pix: unknown;
  price_full: unknown;
  deliveries_total: unknown;
  total_credits: unknown;
};

function toSubscribeCollectionOption(row: SubscribeCollectionQueryRow): SubscribeCollectionOption {
  return {
    ...row,
    image_url: row.image_url ?? row.cover_image_url ?? null,
    collection_characters: row.collection_characters ?? [],
  };
}

function normalizeSubscribePlan(row: SubscribePlanQueryRow): SubscribePlan {
  const priceFull = Number(row.price_full);
  const pricePix = Number(row.price_pix);
  const deliveriesTotal = Number(row.deliveries_total);
  const totalCredits = row.total_credits == null ? null : Number(row.total_credits);

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

  if (invalidMoney || invalidDeliveries || invalidCredits) {
    throw new Error(`Configuração comercial inválida no plano ${row.id}`);
  }

  return {
    ...row,
    price_pix: pricePix,
    price_full: priceFull,
    deliveries_total: deliveriesTotal,
    total_credits: totalCredits,
  };
}

export async function listSubscribePlans(): Promise<SubscribePlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, description, plan_type, price_pix, price_full, deliveries_total, total_credits, is_active",
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as SubscribePlanQueryRow[]).map(normalizeSubscribePlan);
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
