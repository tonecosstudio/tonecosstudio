import { describe, expect, it, vi } from "vitest";
import {
  createPublicCatalogGateway,
  resolveCatalogFetchCredentials,
} from "./public-catalog-gateway";

const row = {
  id: "mdl-123",
  slug: "animal-original",
  code: "TCS-123",
  name: "Escultura original",
  variant_name: "Versão A",
  category: "Originais",
  category_slug: "originais",
  franchise: "Autoral",
  franchise_slug: "autoral",
  collection: null,
  folder_path: null,
  image_count: 3,
  gallery_version: 1,
  cover_storage_key: "covers/mdl-123.webp",
};

describe("canonical catalog read boundary", () => {
  it("reads one page with cursor and never loads the whole acervo", async () => {
    const io = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [row], nextCursor: "next" }), {
          status: 200,
        }),
    );
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    const result = await gateway.listPage({
      category: "originais",
      search: "animal",
      limit: 24,
    });
    expect(io).toHaveBeenCalledTimes(1);
    const [url, options] = io.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://example.test/catalogo-api/api/catalog?limit=24&category=originais&q=animal",
    );
    expect(options).toMatchObject({ method: "GET", credentials: "omit" });
    expect(result).toEqual({
      items: [
        {
          id: "mdl-123",
          slug: "animal-original",
          code: "TCS-123",
          name: "Escultura original",
          variantName: "Versão A",
          category: "Originais",
          categorySlug: "originais",
          franchise: "Autoral",
          franchiseSlug: "autoral",
          collection: null,
          folderPath: null,
          imageCount: 3,
          galleryVersion: 1,
          coverStorageKey: "covers/mdl-123.webp",
        },
      ],
      nextCursor: "next",
    });
  });

  it("rejects invalid search, scope, and oversized pages without making a request", async () => {
    const io = vi.fn(async () => new Response("{}"));
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    await expect(gateway.listPage({ search: "ab" })).rejects.toThrow(
      "catalog_search_length_invalid",
    );
    await expect(gateway.listPage({ folder: "viloes" })).rejects.toThrow(
      "catalog_folder_requires_scope",
    );
    await expect(gateway.listPage({ limit: 100000 })).rejects.toThrow(
      "catalog_limit_invalid",
    );
    expect(io).not.toHaveBeenCalled();
  });

  it("blocks malformed catalog scopes and folder traversal without querying Worker", async () => {
    const io = vi.fn(async () =>
      Response.json({ items: [], nextCursor: null }),
    );
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    for (const category of ["../admin", "x".repeat(241), "categoria?x=1"]) {
      await expect(gateway.listPage({ category })).rejects.toThrow(
        "catalog_category_invalid",
      );
    }
    for (const franchise of ["../admin", "x".repeat(241), "autoral#x"]) {
      await expect(gateway.listPage({ franchise })).rejects.toThrow(
        "catalog_franchise_invalid",
      );
    }
    for (const folder of [
      "x".repeat(513),
      "games/../admin",
      "games" + String.fromCharCode(92) + ".." + String.fromCharCode(92) + "admin",
      "games" + String.fromCharCode(10) + "other",
    ]) {
      await expect(
        gateway.listPage({ category: "games", franchise: "autoral", folder }),
      ).rejects.toThrow("catalog_folder_invalid");
    }
    expect(io).not.toHaveBeenCalled();
  });

  it("preserves valid scoped filters without broadening catalog access", async () => {
    const io = vi.fn(async () =>
      Response.json({ items: [], nextCursor: null }),
    );
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    await gateway.listPage({
      category: "games",
      franchise: "resident-evil",
      folder: "games/resident-evil/figures",
      limit: 5,
    });
    expect(io).toHaveBeenCalledExactlyOnceWith(
      "https://example.test/catalogo-api/api/catalog?limit=5&category=games&franchise=resident-evil&folder=games%2Fresident-evil%2Ffigures",
      expect.objectContaining({ method: "GET", credentials: "omit" }),
    );
  });

  it("rejects oversized and empty pagination cursors before making requests", async () => {
    const io = vi.fn(async () => Response.json({ items: [], nextCursor: null }));
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    await expect(gateway.listPage({ cursor: "x".repeat(2049) })).rejects.toThrow(
      "catalog_cursor_invalid",
    );
    await expect(gateway.listPage({ cursor: "" })).rejects.toThrow(
      "catalog_cursor_invalid",
    );
    await expect(gateway.listGallery("animal-original", {
      version: 1,
      cursor: "x".repeat(2049),
    })).rejects.toThrow("catalog_gallery_cursor_invalid");
    await expect(gateway.listGallery("animal-original", {
      version: 1,
      cursor: "",
    })).rejects.toThrow("catalog_gallery_cursor_invalid");
    expect(io).not.toHaveBeenCalled();
  });

  it("rejects an oversized response cursor rather than propagating it", async () => {
    const io = vi.fn(async () =>
      Response.json({ items: [], nextCursor: "x".repeat(2049) }),
    );
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    await expect(gateway.listPage()).rejects.toThrow(
      "invalid_catalog_page_cursor",
    );
    expect(io).toHaveBeenCalledTimes(1);
  });

  it("fails closed on absent endpoint, HTTP failure and malformed data", async () => {
    expect(() => createPublicCatalogGateway("", fetch)).toThrow(
      "catalog_endpoint_not_configured",
    );
    expect(() =>
      createPublicCatalogGateway("http://old-domain.invalid", fetch),
    ).toThrow("catalog_endpoint_not_configured");
    const badIo = vi.fn(async () => new Response("not found", { status: 404 }));
    await expect(
      createPublicCatalogGateway(
        "https://example.test",
        badIo as typeof fetch,
      ).listPage(),
    ).rejects.toThrow("catalog_request_failed_404");
    const malformed = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            items: [{ ...row, id: "" }],
            nextCursor: null,
          }),
        ),
    );
    await expect(
      createPublicCatalogGateway(
        "https://example.test",
        malformed as typeof fetch,
      ).listPage(),
    ).rejects.toThrow("invalid_catalog_id");
  });

  it("never accepts duplicate IDs as distinct sellable models", async () => {
    const io = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [row, row], nextCursor: null })),
    );
    await expect(
      createPublicCatalogGateway(
        "https://example.test",
        io as typeof fetch,
      ).listPage(),
    ).rejects.toThrow("duplicate_catalog_model_id");
  });
  it("loads one versioned gallery page with a bounded request", async () => {
    const image = {
      id: "image-1",
      role: "cover",
      width: 1200,
      height: 1500,
      bytes: 240000,
      mime: "image/webp",
      qualityScore: 92,
      sourceSha256: "a".repeat(64),
      variantKeys: {
        thumb: "gallery/thumb.webp",
        card: "gallery/card.webp",
        detail: "gallery/detail.webp",
        original: null,
      },
    };
    const io = vi.fn(async () =>
      Response.json({
        items: [image],
        nextCursor: "page-2",
        total: 25,
        version: 1,
      }),
    );
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    const page = await gateway.listGallery("animal-original", {
      version: 1,
      limit: 12,
    });
    expect(io).toHaveBeenCalledTimes(1);
    expect(io.mock.calls[0]?.[0]).toBe(
      "https://example.test/catalogo-api/api/models/animal-original/images?limit=12&v=1",
    );
    expect(page.items[0]?.variantKeys.detail).toBe("gallery/detail.webp");
    expect(page).toMatchObject({ nextCursor: "page-2", total: 25, version: 1 });
  });

  it("rejects stale gallery versions and oversized responses", async () => {
    const stale = vi.fn(async () =>
      Response.json({ items: [], nextCursor: null, total: 0, version: 2 }),
    );
    const gateway = createPublicCatalogGateway(
      "https://example.test",
      stale as typeof fetch,
    );
    await expect(
      gateway.listGallery("animal-original", { version: 1 }),
    ).rejects.toThrow("catalog_gallery_version_mismatch");
    const oversized = vi.fn(async () =>
      Response.json({
        items: [{ id: "1" }, { id: "2" }],
        nextCursor: null,
        total: 2,
        version: 1,
      }),
    );
    const bounded = createPublicCatalogGateway(
      "https://example.test",
      oversized as typeof fetch,
    );
    await expect(
      bounded.listGallery("animal-original", { version: 1, limit: 1 }),
    ).rejects.toThrow("invalid_catalog_gallery_items");
  });
});

describe("read-only catalog discovery and detail", () => {
  it("decodes bounded categories without catalog scan or SQL access", async () => {
    const calls: string[] = [];
    const io = vi.fn(async (url: string) => {
      calls.push(url);
      return Response.json({
        items: [{ id: "originais", label: "Originais", count: 42 }],
      });
    });
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    expect(await gateway.listCategories()).toEqual([
      { id: "originais", label: "Originais", count: 42 },
    ]);
    expect(calls).toEqual(["https://example.test/catalogo-api/api/categories"]);
  });

  it("opens one canonical detail and refuses a mismatched slug", async () => {
    const io = vi.fn(async () =>
      Response.json({
        ...row,
        description: "Descrição editorial verificada",
        height_cm: null,
        material: null,
      }),
    );
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    const model = await gateway.getModel("animal-original");
    expect(model.id).toBe("mdl-123");
    expect(model.heightCm).toBeNull();
    expect(model.description).toBe("Descrição editorial verificada");
    await expect(gateway.getModel("../admin")).rejects.toThrow(
      "invalid_catalog_slug",
    );
    const wrong = createPublicCatalogGateway(
      "https://example.test",
      vi.fn(async () =>
        Response.json({ ...row, slug: "other" }),
      ) as typeof fetch,
    );
    await expect(wrong.getModel("animal-original")).rejects.toThrow(
      "invalid_catalog_model_slug",
    );
  });

  it("derives media only from the explicit catalog origin and blocks traversal", () => {
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      fetch,
    );
    expect(gateway.mediaUrl("media/cards/cover 1.webp")).toBe(
      "https://example.test/catalogo-api/media/cards/cover%201.webp",
    );
    expect(gateway.mediaUrl(null)).toBeNull();
    expect(gateway.mediaUrl("../admin")).toBeNull();
    expect(gateway.mediaUrl("https://evil.example/image")).toBeNull();
    expect(gateway.mediaUrl("media/%2e%2e/path")).toBeNull();
    expect(() =>
      createPublicCatalogGateway("https://ordax.com.br", fetch),
    ).toThrow("catalog_endpoint_not_configured");
  });
});

describe("franchise discovery stays bounded and uses Worker authority", () => {
  it("fetches only a small indexed franchise page, scoped by category and explicit search", async () => {
    const io = vi.fn(async () =>
      Response.json({
        items: [
          {
            id: "resident-evil",
            label: "Resident Evil",
            count: 120,
            category: "games",
          },
        ],
        truncated: true,
      }),
    );
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    const result = await gateway.listFranchises({
      category: "games",
      search: "resident",
      limit: 24,
    });
    expect(result).toEqual({
      items: [
        {
          id: "resident-evil",
          label: "Resident Evil",
          count: 120,
          category: "games",
        },
      ],
      truncated: true,
    });
    expect(io).toHaveBeenCalledExactlyOnceWith(
      "https://example.test/catalogo-api/api/franchises?category=games&q=resident&limit=24",
      expect.objectContaining({ method: "GET", credentials: "omit" }),
    );
  });

  it("rejects short search, invalid category and large windows before any HTTP request", async () => {
    const io = vi.fn(async () =>
      Response.json({ items: [], truncated: false }),
    );
    const gateway = createPublicCatalogGateway(
      "https://example.test",
      io as typeof fetch,
    );
    await expect(gateway.listFranchises({ search: "ab" })).rejects.toThrow(
      "catalog_franchise_search_length_invalid",
    );
    await expect(
      gateway.listFranchises({ search: "a".repeat(81) }),
    ).rejects.toThrow("catalog_franchise_search_length_invalid");
    await expect(
      gateway.listFranchises({ category: "../admin" }),
    ).rejects.toThrow("catalog_franchise_category_invalid");
    await expect(gateway.listFranchises({ limit: 5000 })).rejects.toThrow(
      "catalog_franchise_limit_invalid",
    );
    expect(io).not.toHaveBeenCalled();
  });

  it("rejects malformed discovery, oversized results, duplicated identifiers and mismatched category", async () => {
    const origin = "https://example.test/catalogo-api";
    const expected = {
      id: "resident-evil",
      label: "Resident Evil",
      count: 120,
      category: "games",
    };
    for (const [payload, code] of [
      [{ items: [], truncated: "false" }, "invalid_catalog_franchises"],
      [
        { items: [expected, expected], truncated: false },
        "invalid_catalog_franchises",
      ],
      [
        { items: [{ ...expected, count: -1 }], truncated: false },
        "invalid_catalog_franchise_count",
      ],
      [
        { items: [{ ...expected, category: "movies" }], truncated: false },
        "invalid_catalog_franchise_category",
      ],
    ] as const) {
      const fetcher = vi.fn(async () => Response.json(payload));
      const api = createPublicCatalogGateway(origin, fetcher as typeof fetch);
      await expect(
        api.listFranchises({ category: "games", limit: 1 }),
      ).rejects.toThrow(code);
    }
    const duplicate = createPublicCatalogGateway(
      origin,
      vi.fn(async () =>
        Response.json({ items: [expected, expected], truncated: false }),
      ) as typeof fetch,
    );
    await expect(
      duplicate.listFranchises({ category: "games", limit: 2 }),
    ).rejects.toThrow("duplicate_catalog_franchise");
  });
});

describe("catalog preview credential isolation", () => {
  it("sends Vercel protection cookies only through our exact same-origin proxy", () => {
    expect(resolveCatalogFetchCredentials(
      "https://tonecosstudio-preview.vercel.app",
      "https://tonecosstudio-preview.vercel.app",
    )).toBe("same-origin");
  });

  it("keeps Cloudflare Worker requests credential-free", () => {
    expect(resolveCatalogFetchCredentials(
      "https://tonecos-catalogo-api.tonecosstudio.workers.dev",
      "https://tonecosstudio-preview.vercel.app",
    )).toBe("omit");
  });

  it.each([undefined, "", "http://tonecosstudio-preview.vercel.app"])(
    "never sends cookies to an unverified or mismatched origin: %s",
    (origin) => {
      expect(resolveCatalogFetchCredentials(
        "https://tonecosstudio-preview.vercel.app",
        origin,
      )).toBe("omit");
    },
  );
});
