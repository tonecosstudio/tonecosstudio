import { describe, expect, it } from "vitest";
import type { PublicCatalogModel } from "./public-catalog-gateway";
import { buildTonartCatalogReviewCsv } from "./tonart-catalog-review-export";

const model: PublicCatalogModel = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "boneco-exemplo",
  code: "TS-01",
  name: "Boneco, edição especial",
  variantName: "V2",
  category: "Filmes",
  categorySlug: "filmes",
  franchise: "Clássicos",
  franchiseSlug: "classicos",
  collection: null,
  folderPath: null,
  imageCount: 3,
  galleryVersion: 1,
  coverStorageKey: "media/boneco/card.webp",
};

describe("TONART one-page editorial review export", () => {
  it("exports only the canonical records passed in, with no network reads or mutations", () => {
    const csv = buildTonartCatalogReviewCsv([model]);
    const lines = csv.trimEnd().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"ID canônico"');
    expect(lines[1]).toContain('"11111111-1111-4111-8111-111111111111"');
    expect(lines[1]).toContain('"Boneco, edição especial"');
    expect(lines[1]).toContain('"media/boneco/card.webp"');
    expect(lines[1]).toContain('"Chave cadastrada; entrega não verificada"');
  });

  it("marks only genuinely missing cover keys as needing investigation", () => {
    const csv = buildTonartCatalogReviewCsv([{ ...model, coverStorageKey: null, imageCount: 0 }]);
    expect(csv).toContain('"Sem chave de capa"');
    expect(csv).toContain(';"0";"";"Sem chave de capa"');
    expect(csv).not.toContain('"Chave cadastrada');
  });

  it("neutralizes formula injection, quotes and spreadsheet control characters", () => {
    const csv = buildTonartCatalogReviewCsv([
      { ...model, name: '=HYPERLINK("https://example.org")', code: "@SUM(1)", franchise: '+malicious\ncell' },
    ]);
    expect(csv).toContain('"\'=HYPERLINK(""https://example.org"")"');
    expect(csv).toContain('"\'@SUM(1)"');
    expect(csv).toContain('"\'+malicious cell"');
    expect(csv.split("\r\n")).toHaveLength(3); // Header, one row and final CRLF.
  });

  it("refuses empty or excessive pages instead of silently scanning the catalog", () => {
    expect(() => buildTonartCatalogReviewCsv([])).toThrow("tonart_catalog_export_page_invalid");
    expect(() => buildTonartCatalogReviewCsv(Array.from({ length: 13 }, () => model)))
      .toThrow("tonart_catalog_export_page_invalid");
  });

  it("rejects structurally inconsistent models", () => {
    expect(() => buildTonartCatalogReviewCsv([{ ...model, imageCount: -1 }]))
      .toThrow("tonart_catalog_export_model_invalid");
  });
});
