/**
 * Read-only boundary for the canonical Tonecos catalog.
 *
 * Authority: the catalog's Cloudflare Worker (D1/R2), not Supabase.
 * No model mirroring, write path, token or implicit health preflight.
 * This is staged until the commercial site has a verified first-party API proxy.
 */
export type PublicCatalogModel = {
  id: string;
  slug: string;
  code: string;
  name: string;
  variantName: string;
  category: string;
  categorySlug: string;
  franchise: string;
  franchiseSlug: string;
  collection: string | null;
  folderPath: string | null;
  imageCount: number;
  galleryVersion: number;
  coverStorageKey: string | null;
};

export type PublicCatalogCategory = {
  id: string;
  label: string;
  count: number;
};

export type PublicCatalogDetail = PublicCatalogModel & {
  description: string | null;
  material: string | null;
  heightCm: number | null;
};

export type PublicCatalogPage = {
  items: PublicCatalogModel[];
  nextCursor: string | null;
};

export type PublicCatalogFilters = {
  category?: string;
  franchise?: string;
  folder?: string;
  search?: string;
  cursor?: string;
  limit?: number;
};

type CatalogWireModel = {
  id?: unknown;
  slug?: unknown;
  code?: unknown;
  name?: unknown;
  variant_name?: unknown;
  category?: unknown;
  category_slug?: unknown;
  franchise?: unknown;
  franchise_slug?: unknown;
  collection?: unknown;
  folder_path?: unknown;
  image_count?: unknown;
  gallery_version?: unknown;
  cover_storage_key?: unknown;
  description?: unknown;
  material?: unknown;
  height_cm?: unknown;
};

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`invalid_catalog_${field}`);
  }
  return value;
}

function optionalText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`invalid_catalog_${field}`);
  return value;
}

function wholeNumber(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`invalid_catalog_${field}`);
  }
  return value as number;
}

function decodeModel(value: unknown): PublicCatalogModel {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_catalog_model");
  }
  const row = value as CatalogWireModel;
  return {
    id: requiredText(row.id, "id"),
    slug: requiredText(row.slug, "slug"),
    code: requiredText(row.code, "code"),
    name: requiredText(row.name, "name"),
    variantName: optionalText(row.variant_name, "variant_name") ?? "",
    category: requiredText(row.category, "category"),
    categorySlug: requiredText(row.category_slug, "category_slug"),
    franchise: requiredText(row.franchise, "franchise"),
    franchiseSlug: requiredText(row.franchise_slug, "franchise_slug"),
    collection: optionalText(row.collection, "collection"),
    folderPath: optionalText(row.folder_path, "folder_path"),
    imageCount: wholeNumber(row.image_count, "image_count"),
    galleryVersion: wholeNumber(row.gallery_version, "gallery_version"),
    coverStorageKey: optionalText(row.cover_storage_key, "cover_storage_key"),
  };
}

export function createPublicCatalogGateway(
  baseUrl: string,
  fetcher: typeof fetch,
) {
  // A base URL is an explicit deployment setting, never inferred from old
  // ordax.com.br defaults or synthesized from a user-entered search term.
  let base: URL;
  try {
    const raw = baseUrl.trim();
    if (!raw || !raw.startsWith("https://")) throw new Error("invalid_origin");
    base = new URL(raw.endsWith("/") ? raw : `${raw}/`);
    if (base.username || base.password || base.search || base.hash) {
      throw new Error("invalid_origin");
    }
  } catch {
    throw new Error("catalog_endpoint_not_configured");
  }

  if (
    base.hostname === "ordax.com.br" ||
    base.hostname === "www.ordax.com.br"
  ) {
    throw new Error("catalog_endpoint_not_configured");
  }

  async function read(path: string, signal?: AbortSignal): Promise<unknown> {
    const response = await fetcher(new URL(path, base).toString(), {
      method: "GET",
      credentials: "omit",
      headers: { Accept: "application/json" },
      signal,
    });
    if (!response.ok)
      throw new Error(`catalog_request_failed_${response.status}`);
    return response.json() as Promise<unknown>;
  }

  return {
    mediaUrl(key: string | null): string | null {
      if (!key) return null;
      const segments = key.split("/");
      if (
        segments.length > 16 ||
        segments.some(
          (part) =>
            !part ||
            part === "." ||
            part === ".." ||
            part.includes(":") ||
            part.includes("?") ||
            part.includes("#") ||
            part.includes("%") ||
            part.includes("\\"),
        )
      ) {
        return null;
      }
      return new URL(
        segments.map(encodeURIComponent).join("/"),
        base,
      ).toString();
    },

    async listCategories(
      signal?: AbortSignal,
    ): Promise<PublicCatalogCategory[]> {
      const result = await read("api/categories", signal);
      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error("invalid_catalog_categories");
      }
      const { items } = result as { items?: unknown };
      if (!Array.isArray(items) || items.length > 100) {
        throw new Error("invalid_catalog_categories");
      }
      return items.map((value: unknown) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new Error("invalid_catalog_category");
        }
        const category = value as {
          id?: unknown;
          label?: unknown;
          count?: unknown;
        };
        return {
          id: requiredText(category.id, "category_id"),
          label: requiredText(category.label, "category_label"),
          count: wholeNumber(category.count, "category_count"),
        };
      });
    },

    async getModel(
      slug: string,
      signal?: AbortSignal,
    ): Promise<PublicCatalogDetail> {
      if (!/^[a-z0-9][a-z0-9-]{0,239}$/.test(slug))
        throw new Error("invalid_catalog_slug");
      const result = await read(
        `api/models/${encodeURIComponent(slug)}`,
        signal,
      );
      const model = decodeModel(result);
      if (model.slug !== slug) throw new Error("invalid_catalog_model_slug");
      const row = result as CatalogWireModel;
      if (
        row.height_cm !== null &&
        row.height_cm !== undefined &&
        (typeof row.height_cm !== "number" ||
          !Number.isFinite(row.height_cm) ||
          row.height_cm < 0)
      ) {
        throw new Error("invalid_catalog_height");
      }
      return {
        ...model,
        description: optionalText(row.description, "description"),
        material: optionalText(row.material, "material"),
        heightCm: (row.height_cm as number | null) ?? null,
      };
    },

    async listPage(
      filters: PublicCatalogFilters = {},
      signal?: AbortSignal,
    ): Promise<PublicCatalogPage> {
      const url = new URL("api/catalog", base);
      const query = filters.search?.trim();
      if (
        query &&
        (Array.from(query).length < 3 || Array.from(query).length > 80)
      ) {
        throw new Error("catalog_search_length_invalid");
      }
      if (filters.folder && (!filters.category || !filters.franchise)) {
        throw new Error("catalog_folder_requires_scope");
      }
      const limit = filters.limit ?? 24;
      if (!Number.isInteger(limit) || limit < 1 || limit > 60) {
        throw new Error("catalog_limit_invalid");
      }
      url.searchParams.set("limit", String(limit));
      if (filters.category && filters.category !== "all")
        url.searchParams.set("category", filters.category);
      if (filters.franchise)
        url.searchParams.set("franchise", filters.franchise);
      if (filters.folder) url.searchParams.set("folder", filters.folder);
      if (query) url.searchParams.set("q", query);
      if (filters.cursor) url.searchParams.set("cursor", filters.cursor);

      const response = await fetcher(url.toString(), {
        method: "GET",
        credentials: "omit",
        headers: { Accept: "application/json" },
        signal,
      });
      if (!response.ok)
        throw new Error(`catalog_request_failed_${response.status}`);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("invalid_catalog_page");
      }
      const { items, nextCursor } = payload as {
        items?: unknown;
        nextCursor?: unknown;
      };
      if (!Array.isArray(items) || items.length > limit) {
        throw new Error("invalid_catalog_page_items");
      }
      if (
        nextCursor !== null &&
        nextCursor !== undefined &&
        (typeof nextCursor !== "string" || !nextCursor)
      ) {
        throw new Error("invalid_catalog_page_cursor");
      }
      const seen = new Set<string>();
      const models = items.map((item: unknown) => {
        const model = decodeModel(item);
        if (seen.has(model.id)) throw new Error("duplicate_catalog_model_id");
        seen.add(model.id);
        return model;
      });
      return {
        items: models,
        nextCursor: (nextCursor as string | null | undefined) ?? null,
      };
    },
  };
}
