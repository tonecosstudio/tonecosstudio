import { describe, expect, it, vi } from "vitest";
import { createPublicCatalogGateway } from "./public-catalog-gateway";

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
    const io = vi.fn(async () =>
      new Response(JSON.stringify({ items: [row], nextCursor: "next" }), { status: 200 }),
    );
    const gateway = createPublicCatalogGateway("https://example.test/catalogo-api", io as typeof fetch);
    const result = await gateway.listPage({ category: "originais", search: "animal", limit: 24 });
    expect(io).toHaveBeenCalledTimes(1);
    const [url, options] = io.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://example.test/catalogo-api/api/catalog?limit=24&category=originais&q=animal");
    expect(options).toMatchObject({ method: "GET", credentials: "omit" });
    expect(result).toEqual({
      items: [{
        id: "mdl-123", slug: "animal-original", code: "TCS-123", name: "Escultura original",
        variantName: "Versão A", category: "Originais", categorySlug: "originais",
        franchise: "Autoral", franchiseSlug: "autoral", collection: null, folderPath: null,
        imageCount: 3, galleryVersion: 1, coverStorageKey: "covers/mdl-123.webp",
      }],
      nextCursor: "next",
    });
  });

  it("rejects invalid search, scope, and oversized pages without making a request", async () => {
    const io = vi.fn(async () => new Response("{}"));
    const gateway = createPublicCatalogGateway("https://example.test/catalogo-api", io as typeof fetch);
    await expect(gateway.listPage({ search: "ab" })).rejects.toThrow("catalog_search_length_invalid");
    await expect(gateway.listPage({ folder: "viloes" })).rejects.toThrow("catalog_folder_requires_scope");
    await expect(gateway.listPage({ limit: 100000 })).rejects.toThrow("catalog_limit_invalid");
    expect(io).not.toHaveBeenCalled();
  });

  it("fails closed on absent endpoint, HTTP failure and malformed data", async () => {
    expect(() => createPublicCatalogGateway("", fetch)).toThrow("catalog_endpoint_not_configured");
    expect(() => createPublicCatalogGateway("http://old-domain.invalid", fetch)).toThrow("catalog_endpoint_not_configured");
    const badIo = vi.fn(async () => new Response("not found", { status: 404 }));
    await expect(createPublicCatalogGateway("https://example.test", badIo as typeof fetch).listPage())
      .rejects.toThrow("catalog_request_failed_404");
    const malformed = vi.fn(async () => new Response(JSON.stringify({
      items: [{ ...row, id: "" }], nextCursor: null,
    })));
    await expect(createPublicCatalogGateway("https://example.test", malformed as typeof fetch).listPage())
      .rejects.toThrow("invalid_catalog_id");
  });

  it("never accepts duplicate IDs as distinct sellable models", async () => {
    const io = vi.fn(async () => new Response(JSON.stringify({ items: [row, row], nextCursor: null })));
    await expect(createPublicCatalogGateway("https://example.test", io as typeof fetch).listPage())
      .rejects.toThrow("duplicate_catalog_model_id");
  });
});
