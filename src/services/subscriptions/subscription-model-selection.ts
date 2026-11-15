import {
  TONART_PLAN_PIECE_COUNTS,
  type TonartPlanPieceCount,
} from "@/services/commercial/tonart-commerce-rules";

export type SubscriptionModelSelectionLimit = TonartPlanPieceCount;

const CATALOG_SLUG = /^[a-z0-9][a-z0-9-]{0,239}$/;
export const MAX_CURATED_SUBSCRIPTION_MODELS = 20;

export type SubscriptionModelSelectionIssue =
  | "selection_limit_invalid"
  | "selection_count_invalid"
  | "selection_model_invalid"
  | "selection_duplicate"
  | "selection_not_curated"
  | "curation_count_invalid"
  | "curation_model_invalid"
  | "curation_duplicate";

export function getSubscriptionModelSelectionIssue(input: {
  selectedSlugs: readonly string[];
  selectionLimit: number;
  curatedSlugs?: readonly string[];
}): SubscriptionModelSelectionIssue | null {
  if (!TONART_PLAN_PIECE_COUNTS.includes(input.selectionLimit as TonartPlanPieceCount)) {
    return "selection_limit_invalid";
  }
  if (input.selectedSlugs.length !== input.selectionLimit) {
    return "selection_count_invalid";
  }
  if (input.selectedSlugs.some((slug) => !CATALOG_SLUG.test(slug))) {
    return "selection_model_invalid";
  }
  if (new Set(input.selectedSlugs).size !== input.selectedSlugs.length) {
    return "selection_duplicate";
  }
  if (
    input.curatedSlugs &&
    input.selectedSlugs.some((slug) => !input.curatedSlugs?.includes(slug))
  ) {
    return "selection_not_curated";
  }
  return null;
}

export function getSubscriptionCurationIssue(
  slugs: readonly string[],
): SubscriptionModelSelectionIssue | null {
  if (slugs.length > MAX_CURATED_SUBSCRIPTION_MODELS) {
    return "curation_count_invalid";
  }
  if (slugs.some((slug) => !CATALOG_SLUG.test(slug))) {
    return "curation_model_invalid";
  }
  if (new Set(slugs).size !== slugs.length) {
    return "curation_duplicate";
  }
  return null;
}
