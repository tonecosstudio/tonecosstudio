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

export type PublicCatalogFranchise = PublicCatalogCategory & {
  category: string;
};

export type PublicCatalogFranchisePage = {
  items: PublicCatalogFranchise[];
  truncated: boolean;
};

export type PublicCatalogFranchiseFilters = {
  category?: string;
  search?: string;
  limit?: number;
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

export type PublicCatalogImage = {
  id: string;
  role: "cover" | "gallery";
  width: number;
  height: number;
  bytes: number;
  mime: string;
  qualityScore: number;
  sourceSha256: string;
  variantKeys: {
    thumb: string | null;
    card: string | null;
    detail: string | null;
    original: string | null;
  };
};

export type PublicCatalogGalleryPage = {
  items: PublicCatalogImage[];
  nextCursor: string | null;
  total: number;
  version: number;
};
export type PublicCatalogGalleryFilters = {
  version: number;
  cursor?: string;
  limit?: number;
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

function validateCatalogCursor(value: string | undefined, field: string): void {
  if (value !== undefined && (typeof value !== "string" || !value || value.length > 2048)) {
    throw new Error(field);
  }
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

/**
 * Cookies are needed only on our own protected Vercel preview proxy.
 * Cross-origin catalog origins must never receive session credentials.
 */
export function resolveCatalogFetchCredentials(
  catalogOrigin: string,
  siteOrigin?: string,
): RequestCredentials {
  return siteOrigin && siteOrigin === catalogOrigin ? "same-origin" : "omit";
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

  const credentials = resolveCatalogFetchCredentials(
    base.origin,
    typeof window === "undefined" ? undefined : window.location.origin,
  );

  async function read(path: string, signal?: AbortSignal): Promise<unknown> {
    const response = await fetcher(new URL(path, base).toString(), {
      method: "GET",
      credentials,
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

    async listFranchises(
      filters: PublicCatalogFranchiseFilters = {},
      signal?: AbortSignal,
    ): Promise<PublicCatalogFranchisePage> {
      const query = filters.search?.trim();
      if (
        query &&
        (Array.from(query).length < 3 || Array.from(query).length > 80)
      ) {
        throw new Error("catalog_franchise_search_length_invalid");
      }
      if (
        filters.category &&
        !/^[a-z0-9][a-z0-9-]{0,239}$/.test(filters.category)
      ) {
        throw new Error("catalog_franchise_category_invalid");
      }
      const limit = filters.limit ?? 24;
      if (!Number.isInteger(limit) || limit < 1 || limit > 48) {
        throw new Error("catalog_franchise_limit_invalid");
      }
      const params = new URLSearchParams();
      if (filters.category) params.set("category", filters.category);
      if (query) params.set("q", query);
      params.set("limit", String(limit));

      const payload = await read("api/franchises?" + params.toString(), signal);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("invalid_catalog_franchises");
      }
      const { items, truncated } = payload as {
        items?: unknown;
        truncated?: unknown;
      };
      if (
        !Array.isArray(items) ||
        items.length > limit ||
        typeof truncated !== "boolean"
      ) {
        throw new Error("invalid_catalog_franchises");
      }
      const seen = new Set<string>();
      return {
        items: items.map((value: unknown): PublicCatalogFranchise => {
          if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("invalid_catalog_franchise");
          }
          const row = value as {
            id?: unknown;
            label?: unknown;
            count?: unknown;
            category?: unknown;
          };
          const franchise = {
            id: requiredText(row.id, "franchise_id"),
            label: requiredText(row.label, "franchise_label"),
            count: wholeNumber(row.count, "franchise_count"),
            category: requiredText(row.category, "franchise_category"),
          };
          if (filters.category && franchise.category !== filters.category) {
            throw new Error("invalid_catalog_franchise_category");
          }
          const identity = franchise.category + "/" + franchise.id;
          if (seen.has(identity)) {
            throw new Error("duplicate_catalog_franchise");
          }
          seen.add(identity);
          return franchise;
        }),
        truncated,
      };
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

    async listGallery(
      slug: string,
      filters: PublicCatalogGalleryFilters,
      signal?: AbortSignal,
    ): Promise<PublicCatalogGalleryPage> {
      if (!/^[a-z0-9][a-z0-9-]{0,239}$/.test(slug))
        throw new Error("invalid_catalog_slug");
      if (!Number.isInteger(filters.version) || filters.version < 1)
        throw new Error("catalog_gallery_version_invalid");
      const limit = filters.limit ?? 24;
      if (!Number.isInteger(limit) || limit < 1 || limit > 60)
        throw new Error("catalog_gallery_limit_invalid");
      validateCatalogCursor(filters.cursor, "catalog_gallery_cursor_invalid");
      const url = new URL(
        "api/models/" + encodeURIComponent(slug) + "/images",
        base,
      );
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("v", String(filters.version));
      if (filters.cursor) url.searchParams.set("cursor", filters.cursor);
      const response = await fetcher(url.toString(), {
        method: "GET",
        credentials,
        headers: { Accept: "application/json" },
        signal,
      });
      if (!response.ok)
        throw new Error("catalog_request_failed_" + response.status);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload))
        throw new Error("invalid_catalog_gallery");
      const row = payload as {
        items?: unknown;
        nextCursor?: unknown;
        total?: unknown;
        version?: unknown;
      };
      if (!Array.isArray(row.items) || row.items.length > limit)
        throw new Error("invalid_catalog_gallery_items");
      const total = wholeNumber(row.total, "gallery_total");
      const version = wholeNumber(row.version, "gallery_version");
      if (version !== filters.version)
        throw new Error("catalog_gallery_version_mismatch");
      const nextCursor = row.nextCursor;
      if (
        nextCursor !== null &&
        nextCursor !== undefined &&
        (typeof nextCursor !== "string" ||
          !nextCursor ||
          nextCursor.length > 2048)
      )
        throw new Error("invalid_catalog_gallery_cursor");
      const items = row.items.map((value: unknown): PublicCatalogImage => {
        if (!value || typeof value !== "object" || Array.isArray(value))
          throw new Error("invalid_catalog_gallery_image");
        const image = value as {
          id?: unknown;
          role?: unknown;
          width?: unknown;
          height?: unknown;
          bytes?: unknown;
          mime?: unknown;
          qualityScore?: unknown;
          sourceSha256?: unknown;
          variantKeys?: unknown;
        };
        if (image.role !== "cover" && image.role !== "gallery")
          throw new Error("invalid_catalog_gallery_role");
        if (
          typeof image.qualityScore !== "number" ||
          !Number.isFinite(image.qualityScore)
        )
          throw new Error("invalid_catalog_gallery_quality");
        if (
          !image.variantKeys ||
          typeof image.variantKeys !== "object" ||
          Array.isArray(image.variantKeys)
        )
          throw new Error("invalid_catalog_gallery_variants");
        const variants = image.variantKeys as {
          thumb?: unknown;
          card?: unknown;
          detail?: unknown;
          original?: unknown;
        };
        return {
          id: requiredText(image.id, "gallery_image_id"),
          role: image.role,
          width: wholeNumber(image.width, "gallery_width"),
          height: wholeNumber(image.height, "gallery_height"),
          bytes: wholeNumber(image.bytes, "gallery_bytes"),
          mime: requiredText(image.mime, "gallery_mime"),
          qualityScore: image.qualityScore,
          sourceSha256: requiredText(
            image.sourceSha256,
            "gallery_source_sha256",
          ),
          variantKeys: {
            thumb: optionalText(variants.thumb, "gallery_thumb"),
            card: optionalText(variants.card, "gallery_card"),
            detail: optionalText(variants.detail, "gallery_detail"),
            original: optionalText(variants.original, "gallery_original"),
          },
        };
      });
      return {
        items,
        nextCursor: (nextCursor as string | null | undefined) ?? null,
        total,
        version,
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
      validateCatalogCursor(filters.cursor, "catalog_cursor_invalid");
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
        credentials,
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
        (typeof nextCursor !== "string" || !nextCursor || nextCursor.length > 2048)
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
