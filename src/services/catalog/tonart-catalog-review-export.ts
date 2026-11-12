/**
 * Offline editorial handoff for one already-loaded public catalog page.
 *
 * The Cloudflare Worker/D1/R2 remains the sole source of catalog data and
 * the sole writer. Exporting a CSV does not create a second editorial ledger.
 */
import type { PublicCatalogModel } from "./public-catalog-gateway";

const HEADERS = [
  "ID canônico", "Slug", "Código", "Modelo", "Variante", "Categoria",
  "Franquia", "Imagens declaradas", "Chave da capa", "Estado da capa",
] as const;

function cell(value: string | number): string {
  // Spreadsheet tools interpret =,+,-,@ as formulas, even in quoted CSV.
  // Strip C0 controls and neutralize formula-like cells before escaping.
  const text = String(value).replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  const safe = /^[=+\-@]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}

/** Exactly the loaded page (max 12 models), never a D1 scan or another fetch. */
export function buildTonartCatalogReviewCsv(models: readonly PublicCatalogModel[]): string {
  if (!Array.isArray(models) || models.length < 1 || models.length > 12) {
    throw new Error("tonart_catalog_export_page_invalid");
  }
  const lines = [HEADERS.map(cell).join(";")];
  for (const model of models) {
    if (!model || typeof model.id !== "string" || !model.id ||
        typeof model.slug !== "string" || !model.slug ||
        !Number.isSafeInteger(model.imageCount) || model.imageCount < 0) {
      throw new Error("tonart_catalog_export_model_invalid");
    }
    lines.push([
      model.id, model.slug, model.code, model.name, model.variantName,
      model.category, model.franchise, model.imageCount,
      model.coverStorageKey ?? "",
      model.coverStorageKey ? "Chave cadastrada; entrega não verificada" : "Sem chave de capa",
    ].map(cell).join(";"));
  }
  return lines.join("\r\n") + "\r\n";
}
