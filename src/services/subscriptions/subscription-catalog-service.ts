import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import {
  createPublicCatalogGateway,
  validCatalogSlug,
  type PublicCatalogDetail,
  type PublicCatalogPage,
  type PublicCatalogModel,
} from "@/services/catalog/public-catalog-gateway";
import { MAX_CURATED_SUBSCRIPTION_MODELS } from "@/services/subscriptions/subscription-model-selection";

export type SubscriptionCatalogModel = PublicCatalogDetail & {
  imageUrl: string | null;
};

export type SubscriptionCatalogPage = Omit<PublicCatalogPage, "items"> & {
  items: Array<PublicCatalogModel & { imageUrl: string | null }>;
};

function getCatalogGateway() {
  if (!CANONICAL_CATALOG_API_BASE) {
    throw new Error("catalog_endpoint_not_configured");
  }
  return createPublicCatalogGateway(CANONICAL_CATALOG_API_BASE, fetch);
}

function withPublicImage(
  gateway: ReturnType<typeof createPublicCatalogGateway>,
  model: PublicCatalogDetail,
): SubscriptionCatalogModel {
  return {
    ...model,
    imageUrl: gateway.mediaUrl(model.coverStorageKey),
  };
}

export async function loadSubscriptionCatalogModels(
  slugs: readonly string[],
  signal?: AbortSignal,
): Promise<SubscriptionCatalogModel[]> {
  if (
    slugs.length > MAX_CURATED_SUBSCRIPTION_MODELS ||
    slugs.some((slug) => !validCatalogSlug(slug)) ||
    new Set(slugs).size !== slugs.length
  ) {
    throw new Error("subscription_catalog_slugs_invalid");
  }

  const gateway = getCatalogGateway();
  const models = await Promise.all(slugs.map((slug) => gateway.getModel(slug, signal)));
  return models.map((model) => withPublicImage(gateway, model));
}

export async function searchSubscriptionCatalogModels(
  search: string,
  signal?: AbortSignal,
): Promise<SubscriptionCatalogPage> {
  const normalized = search.trim();
  if (Array.from(normalized).length < 3 || Array.from(normalized).length > 80) {
    throw new Error("catalog_search_length_invalid");
  }

  const gateway = getCatalogGateway();
  const page = await gateway.listPage({ search: normalized, limit: 60 }, signal);
  return {
    ...page,
    items: page.items.map((model) => ({
      ...model,
      imageUrl: gateway.mediaUrl(model.coverStorageKey),
    })),
  };
}
