import type { PublicCatalogModel } from "./public-catalog-gateway";

/** Quote selection is provisional. No client-side selection authorizes an order or a price. */
export const MAX_CANONICAL_SELECTION = 50;

export function toggleCanonicalSelection(
  current: readonly PublicCatalogModel[],
  model: PublicCatalogModel,
): PublicCatalogModel[] {
  if (current.some((entry) => entry.id === model.id)) {
    return current.filter((entry) => entry.id !== model.id);
  }
  if (current.length >= MAX_CANONICAL_SELECTION) return [...current];
  return [...current, model];
}
