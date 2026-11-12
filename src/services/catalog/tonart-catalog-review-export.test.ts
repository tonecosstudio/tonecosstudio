import { describe, expect, it } from "vitest";
import type { PublicCatalogModel } from "./public-catalog-gateway";
import { buildTonartCatalogReviewCsv, validateTonartCatalogEditorialProposal } from "./tonart-catalog-review-export";

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
    expect(lines[0]).toContain('"Novo nome";"Nova variante"');
    expect(lines[1]).toMatch(/;"";""$/);
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

  it("exports validated name and variant proposals in the original canonical row", () => {
    const proposals = new Map([[model.id, { name: "Boneco edição revisada", variant: "V3" }]]);
    const csv = buildTonartCatalogReviewCsv([model], proposals);
    const row = csv.trimEnd().split("\r\n")[1];
    expect(row).toContain('"Boneco, edição especial"');
    expect(row).toContain('"V2"');
    expect(row).toMatch(/;"Boneco edição revisada";"V3"$/);
    expect(validateTonartCatalogEditorialProposal(model, proposals.get(model.id))).toEqual({
      name: "Boneco edição revisada", variant: "V3",
    });
  });

  it("does not propose changing an unchanged value or a blank optional field", () => {
    const csv = buildTonartCatalogReviewCsv([model], new Map([
      [model.id, { name: "  Boneco, edição especial  ", variant: "   " }],
    ]));
    expect(csv.trimEnd().split("\r\n")[1]).toMatch(/;"";""$/);
  });

  it("rejects out-of-page drafts rather than exporting the wrong page", () => {
    expect(() => buildTonartCatalogReviewCsv([model], new Map([
      ["mdl_missing", { name: "Novo nome" }],
    ]))).toThrow("tonart_catalog_editorial_out_of_page");
  });

  it("rejects unsafe proposed labels before creating a CSV", () => {
    for (const name of ['=SUM(1)', "<script>", "Inadequado\nOutra linha", "A".repeat(121)]) {
      expect(() => buildTonartCatalogReviewCsv([model], new Map([
        [model.id, { name }],
      ]))).toThrow("tonart_catalog_editorial_invalid_label");
    }
    expect(() => buildTonartCatalogReviewCsv([model], new Map([
      [model.id, { variant: "@SUM(1)" }],
    ]))).toThrow("tonart_catalog_editorial_invalid_label");
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
