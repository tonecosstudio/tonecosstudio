/**
 * Offline editorial handoff for one already-loaded public catalog page.
 *
 * The Cloudflare Worker/D1/R2 remains the sole source of catalog data and
 * the sole writer. Exporting a CSV does not create a second editorial ledger.
 * The two blank proposal columns are applied only by the original repository's
 * existing production identity contract after offline review and explicit approval.
 */
import type { PublicCatalogModel } from "./public-catalog-gateway";

export type TonartCatalogEditorialProposal = {
  name?: string;
  variant?: string;
};

/** The same ASCII control-character policy as the original editorial applier. */
function isAsciiControl(character: string): boolean {
  const code = character.charCodeAt(0);
  return code <= 31 || code === 127;
}

/** Keep browser validation aligned with the source contract applier. */
function cleanProposal(
  value: string | undefined,
  original: string,
  limit: number,
): string {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string" || Array.from(value).some(isAsciiControl)) {
    throw new Error("tonart_catalog_editorial_invalid_label");
  }
  const normalized = value.trim();
  if (!normalized || normalized === original) return "";
  if (
    Array.from(normalized).length > limit ||
    /^[=+@-]/.test(normalized) ||
    /[<>]/.test(normalized)
  ) {
    throw new Error("tonart_catalog_editorial_invalid_label");
  }
  return normalized;
}

export function validateTonartCatalogEditorialProposal(
  model: PublicCatalogModel,
  proposal: TonartCatalogEditorialProposal | undefined,
): { name: string; variant: string } {
  return {
    name: cleanProposal(proposal?.name, model.name, 120),
    variant: cleanProposal(proposal?.variant, model.variantName, 160),
  };
}

const HEADERS = [
  "ID canônico",
  "Slug",
  "Código",
  "Modelo",
  "Variante",
  "Categoria",
  "Franquia",
  "Imagens declaradas",
  "Chave da capa",
  "Estado da capa",
  "Novo nome",
  "Nova variante",
] as const;

function cell(value: string | number): string {
  // Spreadsheet tools interpret =,+,-,@ as formulas, even in quoted CSV.
  // Strip C0 controls and neutralize formula-like cells before escaping.
  const text = Array.from(String(value), (character) =>
    isAsciiControl(character) ? " " : character,
  )
    .join("")
    .trim();
  const safe = /^[=+\-@]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}

/** Exactly the loaded page (max 12 models), never a D1 scan or another fetch. */
export function buildTonartCatalogReviewCsv(
  models: readonly PublicCatalogModel[],
  proposals: ReadonlyMap<string, TonartCatalogEditorialProposal> = new Map(),
): string {
  if (!Array.isArray(models) || models.length < 1 || models.length > 12) {
    throw new Error("tonart_catalog_export_page_invalid");
  }
  const ids = new Set(models.map((model) => model.id));
  for (const id of proposals.keys()) {
    if (!ids.has(id)) throw new Error("tonart_catalog_editorial_out_of_page");
  }
  const lines = [HEADERS.map(cell).join(";")];
  for (const model of models) {
    if (
      !model ||
      typeof model.id !== "string" ||
      !model.id ||
      typeof model.slug !== "string" ||
      !model.slug ||
      !Number.isSafeInteger(model.imageCount) ||
      model.imageCount < 0
    ) {
      throw new Error("tonart_catalog_export_model_invalid");
    }
    const proposal = validateTonartCatalogEditorialProposal(
      model,
      proposals.get(model.id),
    );
    lines.push(
      [
        model.id,
        model.slug,
        model.code,
        model.name,
        model.variantName,
        model.category,
        model.franchise,
        model.imageCount,
        model.coverStorageKey ?? "",
        model.coverStorageKey
          ? "Chave cadastrada; entrega não verificada"
          : "Sem chave de capa",
        proposal.name,
        proposal.variant, // Blank unless explicitly proposed.
      ]
        .map(cell)
        .join(";"),
    );
  }
  return lines.join("\r\n") + "\r\n";
}
