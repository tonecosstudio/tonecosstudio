import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { requireAdminRpcMatchingId } from "@/services/admin/rpc/admin-rpc-results";
import { getSubscriptionCurationIssue } from "@/services/subscriptions/subscription-model-selection";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminSubscriptionCollection = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  catalog_model_slugs: string[];
};

export async function listAdminSubscriptionCollections(): Promise<AdminSubscriptionCollection[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, slug, is_active, catalog_model_slugs")
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as AdminSubscriptionCollection[]).map((collection) => ({
    ...collection,
    catalog_model_slugs: Array.isArray(collection.catalog_model_slugs)
      ? collection.catalog_model_slugs.filter((slug): slug is string => typeof slug === "string")
      : [],
  }));
}

export async function saveAdminSubscriptionCollectionModels(input: {
  collectionId: string;
  modelSlugs: string[];
}): Promise<void> {
  if (!UUID_PATTERN.test(input.collectionId)) {
    throw new Error("subscription_collection_id_invalid");
  }
  if (getSubscriptionCurationIssue(input.modelSlugs)) {
    throw new Error("subscription_collection_models_invalid");
  }

  const result = await callAdminRpc<unknown>("admin_set_subscription_collection_models", {
    p_collection_id: input.collectionId,
    p_model_slugs: input.modelSlugs,
  });
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("subscription_collection_models_result_invalid");
  }
  requireAdminRpcMatchingId(
    (result as Record<string, unknown>).id,
    input.collectionId,
    "Subscription collection curation",
  );
}
