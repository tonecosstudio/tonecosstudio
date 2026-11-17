import { describe, expect, it } from "vitest";
import {
  getSubscriptionCurationIssue,
  getSubscriptionModelSelectionIssue,
  MAX_CURATED_SUBSCRIPTION_MODELS,
} from "./subscription-model-selection";

const curated = Array.from(
  { length: MAX_CURATED_SUBSCRIPTION_MODELS },
  (_, index) => `horror-model-${index + 1}`,
);

describe("subscription model selection", () => {
  it.each([6, 12] as const)(
    "accepts exactly %i curated models",
    (selectionLimit) => {
      const selectedSlugs = curated.slice(0, selectionLimit);
      expect(
        getSubscriptionModelSelectionIssue({
          selectedSlugs,
          selectionLimit,
          curatedSlugs: curated,
        }),
      ).toBeNull();
    },
  );

  it("requires the complete quantity configured by the plan", () => {
    expect(
      getSubscriptionModelSelectionIssue({
        selectedSlugs: curated.slice(0, 5),
        selectionLimit: 6,
        curatedSlugs: curated,
      }),
    ).toBe("selection_count_invalid");
  });

  it("rejects duplicate selections", () => {
    const selectedSlugs = [...curated.slice(0, 5), curated[0]];
    expect(
      getSubscriptionModelSelectionIssue({
        selectedSlugs,
        selectionLimit: 6,
        curatedSlugs: curated,
      }),
    ).toBe("selection_duplicate");
  });

  it("rejects a model that is outside the collection curation", () => {
    expect(
      getSubscriptionModelSelectionIssue({
        selectedSlugs: [...curated.slice(0, 5), "not-in-this-collection"],
        selectionLimit: 6,
        curatedSlugs: curated,
      }),
    ).toBe("selection_not_curated");
  });

  it("only allows the configured 6 or 12 model plans", () => {
    expect(
      getSubscriptionModelSelectionIssue({
        selectedSlugs: [],
        selectionLimit: 8,
      }),
    ).toBe("selection_limit_invalid");
  });

  it("caps collection curation at 20 unique canonical slugs", () => {
    expect(getSubscriptionCurationIssue(curated)).toBeNull();
    expect(getSubscriptionCurationIssue([...curated, "horror-model-21"])).toBe(
      "curation_count_invalid",
    );
    expect(
      getSubscriptionCurationIssue(["horror-model-1", "horror-model-1"]),
    ).toBe("curation_duplicate");
  });
});
