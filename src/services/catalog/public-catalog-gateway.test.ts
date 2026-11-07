import { describe, expect, it, vi } from "vitest";
import specialstlQuarantine from "./specialstl-quarantine.json";
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
  cover_storage_key: "media/covers/mdl-123.webp",
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
          coverStorageKey: "media/covers/mdl-123.webp",
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
      "x".repeat(241),
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

  it("shares the Worker's 240-character folder limit in list and navigation", async () => {
    const io = vi.fn(async () => Response.json({ items: [], nextCursor: null }));
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    const overlong = "x".repeat(241);
    await expect(gateway.listPage({
      category: "games", franchise: "resident-evil", folder: overlong,
    })).rejects.toThrow("catalog_folder_invalid");
    await expect(gateway.listFolders({
      category: "games", franchise: "resident-evil", parent: overlong,
    })).rejects.toThrow("catalog_folder_path_invalid");
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

  it("rejects repeated or non-progressing catalog cursor pages", async () => {
    const io = vi.fn(async (url: string) =>
      Response.json({
        items: new URL(url).searchParams.has("cursor") ? [row] : [],
        nextCursor: "repeated",
      }),
    );
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    await expect(gateway.listPage()).rejects.toThrow(
      "invalid_catalog_page_cursor",
    );
    await expect(gateway.listPage({ cursor: "repeated" })).rejects.toThrow(
      "invalid_catalog_page_cursor",
    );
    expect(io).toHaveBeenCalledTimes(2);
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
        thumb: "media/gallery/thumb.webp",
        card: "media/gallery/card.webp",
        detail: "media/gallery/detail.webp",
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
    expect(page.items[0]?.variantKeys.detail).toBe("media/gallery/detail.webp");
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

describe("cross-endpoint published gallery integrity", () => {
  const galleryImage = {
    id: "image-1",
    role: "cover",
    width: 1280,
    height: 1600,
    bytes: 250000,
    mime: "image/webp",
    qualityScore: 96,
    sourceSha256: "a".repeat(64),
    variantKeys: {
      thumb: "media/mdl-123/1/thumb.webp",
      card: "media/mdl-123/1/card.webp",
      detail: "media/mdl-123/1/detail.webp",
      original: null,
    },
  };

  function gatewayFor(page: object) {
    const io = vi.fn(async () => Response.json(page));
    return {
      io,
      gateway: createPublicCatalogGateway(
        "https://example.test/catalogo-api",
        io as typeof fetch,
      ),
    };
  }

  const expected = {
    version: 9,
    limit: 8,
    expectedTotal: 1,
    expectedCoverStorageKey: "media/mdl-123/1/card.webp",
  };

  it("accepts one approved cover as a complete gallery without inventing further views", async () => {
    const { io, gateway } = gatewayFor({
      items: [galleryImage],
      nextCursor: null,
      total: 1,
      version: 9,
    });
    const page = await gateway.listGallery("animal-original", expected);
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(1);
    expect(io).toHaveBeenCalledTimes(1);
    expect(io.mock.calls[0]?.[0]).toBe(
      "https://example.test/catalogo-api/api/models/animal-original/images?limit=8&v=9",
    );
  });

  it("refuses a gallery count that disagrees with the published model detail", async () => {
    const { io, gateway } = gatewayFor({
      items: [galleryImage],
      nextCursor: null,
      total: 2,
      version: 9,
    });
    await expect(gateway.listGallery("animal-original", expected))
      .rejects.toThrow("catalog_gallery_count_mismatch");
    expect(io).toHaveBeenCalledTimes(1);
  });

  it("refuses a first-page cover that differs from the model's published cover", async () => {
    const { io, gateway } = gatewayFor({
      items: [{
        ...galleryImage,
        variantKeys: {
          ...galleryImage.variantKeys,
          card: "media/mdl-other/1/card.webp",
        },
      }],
      nextCursor: null,
      total: 1,
      version: 9,
    });
    await expect(gateway.listGallery("animal-original", expected))
      .rejects.toThrow("catalog_gallery_cover_mismatch");
    expect(io).toHaveBeenCalledTimes(1);
  });

  it("refuses a gallery whose first image is not the cover", async () => {
    const { gateway } = gatewayFor({
      items: [{ ...galleryImage, role: "gallery" }],
      nextCursor: null,
      total: 1,
      version: 9,
    });
    await expect(gateway.listGallery("animal-original", expected))
      .rejects.toThrow("catalog_gallery_cover_mismatch");
  });

  it("rejects duplicate gallery image IDs instead of rendering ambiguous thumbnails", async () => {
    const { io, gateway } = gatewayFor({
      items: [
        galleryImage,
        { ...galleryImage, role: "gallery" },
      ],
      nextCursor: null,
      total: 2,
      version: 9,
    });
    await expect(
      gateway.listGallery("animal-original", {
        version: 9,
        limit: 8,
      }),
    ).rejects.toThrow("duplicate_catalog_gallery_image");
    expect(io).toHaveBeenCalledTimes(1);
  });

  it("rejects a repeated gallery cursor and empty pages that claim more images", async () => {
    const { gateway: loopingGateway } = gatewayFor({
      items: [galleryImage],
      nextCursor: "repeated",
      total: 2,
      version: 9,
    });
    await expect(
      loopingGateway.listGallery("animal-original", {
        version: 9,
        cursor: "repeated",
      }),
    ).rejects.toThrow("invalid_catalog_gallery_cursor");

    const { gateway: emptyGateway } = gatewayFor({
      items: [],
      nextCursor: "page-2",
      total: 2,
      version: 9,
    });
    await expect(
      emptyGateway.listGallery("animal-original", { version: 9 }),
    ).rejects.toThrow("invalid_catalog_gallery_cursor");
  });

  it("does not require the original cover on later cursor pages", async () => {
    const { gateway } = gatewayFor({
      items: [{ ...galleryImage, id: "image-2", role: "gallery" }],
      nextCursor: null,
      total: 2,
      version: 9,
    });
    const page = await gateway.listGallery("animal-original", {
      ...expected,
      cursor: "page-2",
      expectedTotal: 2,
    });
    expect(page.items[0].role).toBe("gallery");
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

  it("rejects duplicate category IDs from a single bounded response", async () => {
    const io = vi.fn(async () => Response.json({
      items: [
        { id: "games", label: "Games", count: 2 },
        { id: "games", label: "Outra categoria", count: 1 },
      ],
    }));
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    await expect(gateway.listCategories()).rejects.toThrow(
      "duplicate_catalog_category",
    );
    expect(io).toHaveBeenCalledTimes(1);
  });

  it("rejects unsafe category route IDs from the bounded Worker response", async () => {
    const io = vi.fn(async () =>
      Response.json({
        items: [{ id: "../admin", label: "Malformed", count: 1 }],
      }),
    );
    const gateway = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    await expect(gateway.listCategories()).rejects.toThrow(
      "invalid_catalog_category_id",
    );
    expect(io).toHaveBeenCalledTimes(1);
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
    expect(gateway.mediaUrl("api/catalog")).toBeNull();
    expect(gateway.mediaUrl("api/quotes")).toBeNull();
    expect(gateway.mediaUrl("media/")).toBeNull();
    expect(gateway.mediaUrl("media/a//image.webp")).toBeNull();
    expect(gateway.mediaUrl("media/" + "a".repeat(257))).toBeNull();
    expect(gateway.mediaUrl("media/" + "x/".repeat(17) + "cover.webp")).toBeNull();
    expect(gateway.mediaUrl("media/images/" + String.fromCharCode(0) + "bad.webp")).toBeNull();
    expect(gateway.mediaUrl("media/images/" + String.fromCharCode(0xD800))).toBeNull();
    expect(gateway.mediaUrl("media/cards/café.webp")).toBe(
      "https://example.test/catalogo-api/media/cards/caf%C3%A9.webp",
    );
    expect(gateway.mediaUrl("media/cards/Hero (Edition 2)!.webp")).toBe(
      "https://example.test/catalogo-api/media/cards/Hero%20%28Edition%202%29%21.webp",
    );
    expect(() =>
      createPublicCatalogGateway("https://ordax.com.br", fetch),
    ).toThrow("catalog_endpoint_not_configured");
  });
});

describe("canonical folder discovery is scoped and fail-closed", () => {
  it("reads a single indexed root, with no catalog-wide scan", async () => {
    const io = vi.fn(async () => Response.json({
      current: null,
      trail: [],
      items: [{ id: "personagens", label: "Personagens", count: 3, hasChildren: true }],
    }));
    const gateway = createPublicCatalogGateway("https://example.test/catalogo-api", io as typeof fetch);
    const page = await gateway.listFolders({ category: "games", franchise: "resident-evil" });
    expect(page.items).toEqual([{ id: "personagens", label: "Personagens", count: 3, hasChildren: true }]);
    expect(io).toHaveBeenCalledExactlyOnceWith(
      "https://example.test/catalogo-api/api/folders?category=games&franchise=resident-evil",
      expect.objectContaining({ method: "GET", credentials: "omit" }),
    );
  });

  it("reads nested paths and the canonical breadcrumb without walking parent indexes", async () => {
    const io = vi.fn(async () => Response.json({
      current: { id: "personagens", label: "Personagens", count: 2 },
      trail: [{ id: "personagens", label: "Personagens" }],
      items: [{ id: "personagens/herois", label: "Heróis", count: 2, hasChildren: false }],
    }));
    const gateway = createPublicCatalogGateway("https://example.test/catalogo-api", io as typeof fetch);
    const data = await gateway.listFolders({ category: "games", franchise: "resident-evil", parent: "personagens" });
    expect(data.trail).toEqual([{ id: "personagens", label: "Personagens" }]);
    expect(data.items[0].id).toBe("personagens/herois");
    const [url] = io.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).searchParams.get("parent")).toBe("personagens");
    expect(io).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid scopes, traversal and oversized parent paths before I/O", async () => {
    const io = vi.fn(async () => Response.json({ current: null, trail: [], items: [] }));
    const gateway = createPublicCatalogGateway("https://example.test/catalogo-api", io as typeof fetch);
    await expect(gateway.listFolders({ category: "../admin", franchise: "resident-evil" })).rejects.toThrow("catalog_folder_scope_invalid");
    await expect(gateway.listFolders({ category: "games", franchise: "../admin" })).rejects.toThrow("catalog_folder_scope_invalid");
    await expect(gateway.listFolders({ category: "games", franchise: "resident-evil", parent: "a/../admin" })).rejects.toThrow("catalog_folder_path_invalid");
    await expect(gateway.listFolders({ category: "games", franchise: "resident-evil", parent: "x".repeat(241) })).rejects.toThrow("catalog_folder_path_invalid");
    expect(io).not.toHaveBeenCalled();
  });

  it("rejects untrusted parent identity and inconsistent breadcrumbs", async () => {
    const io = vi.fn(async () => Response.json({ current: null, trail: [], items: [] }));
    const gateway = createPublicCatalogGateway("https://example.test/catalogo-api", io as typeof fetch);
    await expect(gateway.listFolders({ category: "games", franchise: "resident-evil", parent: "personagens" })).rejects.toThrow("catalog_folder_parent_mismatch");
    io.mockImplementationOnce(async () => Response.json({
      current: { id: "personagens", label: "Personagens", count: 1 },
      trail: [],
      items: [],
    }));
    await expect(gateway.listFolders({ category: "games", franchise: "resident-evil", parent: "personagens" })).rejects.toThrow("catalog_folder_trail_mismatch");
  });

  it("rejects duplicate paths and children outside the requested parent", async () => {
    const io = vi.fn(async () => Response.json({
      current: null, trail: [],
      items: [
        { id: "a", label: "A", count: 1, hasChildren: false },
        { id: "a", label: "B", count: 1, hasChildren: false },
      ],
    }));
    const gateway = createPublicCatalogGateway("https://example.test/catalogo-api", io as typeof fetch);
    await expect(gateway.listFolders({ category: "games", franchise: "resident-evil" })).rejects.toThrow("duplicate_catalog_folder");
    io.mockImplementationOnce(async () => Response.json({
      current: { id: "personagens", label: "Personagens", count: 1 },
      trail: [{ id: "personagens", label: "Personagens" }],
      items: [{ id: "other", label: "Outro", count: 1, hasChildren: false }],
    }));
    await expect(gateway.listFolders({ category: "games", franchise: "resident-evil", parent: "personagens" })).rejects.toThrow("catalog_folder_child_outside_parent");
  });

  it("rejects malformed child counts and hasChildren without silent coercion", async () => {
    const io = vi.fn(async () => Response.json({
      current: null, trail: [],
      items: [{ id: "personagens", label: "Personagens", count: -1, hasChildren: true }],
    }));
    const gateway = createPublicCatalogGateway("https://example.test/catalogo-api", io as typeof fetch);
    await expect(gateway.listFolders({ category: "games", franchise: "resident-evil" })).rejects.toThrow("invalid_catalog_folder_count");
    io.mockImplementationOnce(async () => Response.json({
      current: null, trail: [],
      items: [{ id: "personagens", label: "Personagens", count: 1, hasChildren: "true" }],
    }));
    await expect(gateway.listFolders({ category: "games", franchise: "resident-evil" })).rejects.toThrow("invalid_catalog_folder_has_children");
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
        { items: [{ ...expected, id: "../admin" }], truncated: false },
        "invalid_catalog_franchise_id",
      ],
      [
        { items: [{ ...expected, category: "games/../admin" }], truncated: false },
        "invalid_catalog_franchise_category",
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

describe("indexed recent catalog publications", () => {
  it("loads a bounded set of recent published models using a single API read", async () => {
    const io = vi.fn(async () => Response.json({ items: [row] }));
    const api = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    const abort = new AbortController();
    const models = await api.listRecent(6, abort.signal);
    expect(models).toHaveLength(1);
    expect(models[0]).toMatchObject({ id: "mdl-123", slug: "animal-original" });
    expect(io).toHaveBeenCalledExactlyOnceWith(
      "https://example.test/catalogo-api/api/recent?limit=6",
      expect.objectContaining({
        method: "GET", credentials: "omit", signal: abort.signal,
      }),
    );
  });

  it("rejects invalid limits locally without contacting the Worker", async () => {
    const io = vi.fn(async () => Response.json({ items: [] }));
    const api = createPublicCatalogGateway(
      "https://example.test/catalogo-api",
      io as typeof fetch,
    );
    for (const limit of [0, 25, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(api.listRecent(limit)).rejects.toThrow("catalog_recent_limit_invalid");
    }
    expect(io).not.toHaveBeenCalled();
  });

  it("rejects malformed, oversized or duplicate recent results", async () => {
    const cases = [
      [{}, "invalid_catalog_recent_items"],
      [{ items: [row, row] }, "duplicate_catalog_recent_model"],
      [{ items: [row, { ...row, slug: "../admin", id: "mdl-124" }] }, "invalid_catalog_recent_slug"],
      [{ items: Array(25).fill(row) }, "invalid_catalog_recent_items"],
    ];
    for (const [payload, failure] of cases) {
      const io = vi.fn(async () => Response.json(payload));
      const api = createPublicCatalogGateway(
        "https://example.test/catalogo-api",
        io as typeof fetch,
      );
      await expect(api.listRecent(24)).rejects.toThrow(failure as string);
      expect(io).toHaveBeenCalledTimes(1);
    }
  });
});


describe("external catalog media branding quarantine", () => {
  const branded = {
    ...row,
    id: "mdl-specialstl",
    slug: "specialstl-figure",
    name: "Escultura promocional",
    variant_name: "SpecialSTL.com",
    cover_storage_key: "media/covers/specialstl.com/figure.webp",
  };

  it("hides identified branded models from list and recent without changing cursor or reading more pages", async () => {
    const io = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/recent?")) return Response.json({ items: [row, branded] });
      return Response.json({ items: [row, branded], nextCursor: "page-two" });
    });
    const api = createPublicCatalogGateway(
      "https://example.test/catalogo-api", io as typeof fetch,
    );
    const page = await api.listPage({ limit: 24 });
    expect(page.items.map((model) => model.slug)).toEqual(["animal-original"]);
    expect(page.nextCursor).toBe("page-two");
    expect((await api.listRecent(6)).map((model) => model.slug)).toEqual(["animal-original"]);
    expect(io).toHaveBeenCalledTimes(2);
  });

  it("protects all confirmed SpecialSTL IDs with a pending clean-photo replacement", async () => {
    // Quarantine must shrink safely when verified clean replacement photos arrive.
    expect(specialstlQuarantine.confirmed.length).toBeGreaterThan(0);
    for (const entry of specialstlQuarantine.confirmed) {
      expect(entry.replacement.status).toBe("pending_authorized_clean_photo");
      expect(entry.replacement.approvedImageStorageKey).toBeNull();
      const branded = {
        ...row,
        id: entry.modelId,
        slug: entry.slug,
        name: "Verified branded model",
        cover_storage_key: entry.coverStorageKey,
      };
      const io = vi.fn(async (request: RequestInfo | URL) => {
        const uri = String(request);
        if (uri.includes("/api/models/")) return Response.json(branded);
        if (uri.includes("/api/recent?")) return Response.json({ items: [row, branded] });
        return Response.json({ items: [row, branded], nextCursor: null });
      });
      const api = createPublicCatalogGateway("https://example.test/catalogo-api", io as typeof fetch);
      expect((await api.listPage({ limit: 8 })).items.map((item) => item.id)).toEqual([row.id]);
      expect((await api.listRecent(8)).map((item) => item.id)).toEqual([row.id]);
      await expect(api.getModel(entry.slug)).rejects.toThrow("catalog_model_media_restricted");
      expect(api.mediaUrl(entry.coverStorageKey)).toBeNull();
      expect(api.mediaUrl(`media/${entry.modelId}/another-image/detail.webp`)).toBeNull();
      expect(io).toHaveBeenCalledTimes(3);
    }
  });

  it("quarantines the exact Ace Duck SpecialSTL photo even without branded text metadata", async () => {
    // Public catalog: Ace Duck is the actual photo supplied by the owner.
    // All human-readable fields and storage paths lack SpecialSTL wording.
    const aceDuck = {
      ...row,
      id: "mdl_ae8d28d2fa93b1367b0a",
      slug: "as-tartarugas-ninja-ace-duck",
      name: "Ace duck",
      collection: "Ace Duck",
      cover_storage_key:
        "media/mdl_ae8d28d2fa93b1367b0a/img_1ccf2edb6736ca445dea/card.webp",
    };
    const io = vi.fn(async (request: RequestInfo | URL) => {
      const uri = String(request);
      if (uri.includes("/api/models/")) return Response.json(aceDuck);
      if (uri.includes("/api/recent?")) return Response.json({ items: [row, aceDuck] });
      return Response.json({ items: [row, aceDuck], nextCursor: "more-results" });
    });
    const api = createPublicCatalogGateway(
      "https://example.test/catalogo-api", io as typeof fetch,
    );
    const listing = await api.listPage({ limit: 8 });
    expect(listing.items.map((item) => item.id)).toEqual([row.id]);
    expect(listing.nextCursor).toBe("more-results");
    expect((await api.listRecent(6)).map((item) => item.id)).toEqual([row.id]);
    await expect(api.getModel(aceDuck.slug)).rejects.toThrow(
      "catalog_model_media_restricted",
    );
    expect(api.mediaUrl(aceDuck.cover_storage_key)).toBeNull();
    expect(api.mediaUrl(
      "media/mdl_ae8d28d2fa93b1367b0a/another-image/detail.webp",
    )).toBeNull();
    expect(api.mediaUrl(row.cover_storage_key)).not.toBeNull();
    expect(io).toHaveBeenCalledTimes(3);
  });

  it("keeps artist/studio credits visible; logos are not evidence of unauthorized redistribution", async () => {
    // These seven were previously incorrectly blocked solely because their
    // covers credit the sculptor or studio (including visible Patreon links).
    const creatorModels = [
      ["mdl_e8b7681b5258d694b9c4", "Neko Figurines"],
      ["mdl_027d30734c3c9227e9d5", "Bulkamancer"],
      ["mdl_0b1e74b6bb2af5eb9f40", "Chuya Factory"],
      ["mdl_2de23146ca8f98e21ac2", "Tanuki Figures"],
      ["mdl_ed5c4dfc82890a6b34d3", "Malix 3D"],
      ["mdl_0a45ae78a4b79c1998d7", "Kaidan 3D"],
      ["mdl_af4a36b38f96100159cb", "Artist logo"],
    ] as const;
    const credited = creatorModels.map(([id, artist], index) => ({
      ...row,
      id,
      slug: "creator-model-" + index,
      variant_name: artist,
      cover_storage_key: "media/" + id + "/img_original/card.webp",
    }));
    const bySlug = new Map(credited.map((item) => [item.slug, item]));
    const io = vi.fn(async (url: RequestInfo | URL) => {
      const request = String(url);
      if (request.includes("/api/recent?")) {
        return Response.json({ items: [row, ...credited] });
      }
      if (request.includes("/api/models/")) {
        return Response.json(bySlug.get(request.split("/api/models/")[1]));
      }
      return Response.json({ items: [row, ...credited], nextCursor: "more-items" });
    });
    const api = createPublicCatalogGateway(
      "https://example.test/catalogo-api", io as typeof fetch,
    );
    expect((await api.listPage({ limit: 8 })).items).toHaveLength(8);
    expect((await api.listRecent(8))).toHaveLength(8);
    for (const item of credited) {
      expect(api.mediaUrl(item.cover_storage_key)).not.toBeNull();
      await expect(api.getModel(item.slug)).resolves.toMatchObject({ id: item.id });
    }
    expect(io).toHaveBeenCalledTimes(9);
  });

  it("also quarantines publisher branding in collection and classification metadata", async () => {
    const collectionBranded = {
      ...row,
      id: "mdl-collection-branded",
      slug: "apparently-clean-model",
      collection: "SpecialSTL.com releases",
    };
    const categoryBranded = {
      ...row,
      id: "mdl-category-branded",
      slug: "another-clean-model",
      category_slug: "special-stl",
    };
    const io = vi.fn(async (url: RequestInfo | URL) => {
      const path = String(url);
      if (path.includes("/api/recent?")) {
        return Response.json({ items: [row, collectionBranded, categoryBranded] });
      }
      if (path.includes("/api/models/")) return Response.json(collectionBranded);
      return Response.json({ items: [row, collectionBranded, categoryBranded], nextCursor: null });
    });
    const api = createPublicCatalogGateway(
      "https://example.test/catalogo-api", io as typeof fetch,
    );
    expect((await api.listPage()).items.map((item) => item.id)).toEqual(["mdl-123"]);
    expect((await api.listRecent()).map((item) => item.id)).toEqual(["mdl-123"]);
    await expect(api.getModel("apparently-clean-model")).rejects.toThrow(
      "catalog_model_media_restricted",
    );
    expect(io).toHaveBeenCalledTimes(3);
  });

  it("does not expose identified branded models through a direct detail link", async () => {
    const io = vi.fn(async () => Response.json(branded));
    const api = createPublicCatalogGateway(
      "https://example.test/catalogo-api", io as typeof fetch,
    );
    await expect(api.getModel("specialstl-figure")).rejects.toThrow(
      "catalog_model_media_restricted",
    );
    expect(io).toHaveBeenCalledTimes(1);
  });

  it("blocks branded media paths even on folder/category/gallery thumbnails without affecting clean keys", () => {
    const api = createPublicCatalogGateway(
      "https://example.test/catalogo-api", vi.fn() as typeof fetch,
    );
    expect(api.mediaUrl("media/covers/SpecialSTL.com/promo.webp")).toBeNull();
    expect(api.mediaUrl("media/gallery/special-stl/photo.webp")).toBeNull();
    expect(api.mediaUrl("media/covers/mdl-123.webp")).toBe(
      "https://example.test/catalogo-api/media/covers/mdl-123.webp",
    );
  });
});
