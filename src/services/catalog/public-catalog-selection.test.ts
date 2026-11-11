import { describe, expect, it } from "vitest";
import {
  MAX_CANONICAL_SELECTION,
  toggleCanonicalSelection,
} from "./public-catalog-selection";
import type { PublicCatalogModel } from "./public-catalog-gateway";

function model(id: string): PublicCatalogModel {
  return {
    id,
    slug: id,
    code: id,
    name: "Escultura de referência",
    variantName: "",
    category: "originais",
    categorySlug: "originais",
    franchise: "Autoral",
    franchiseSlug: "autoral",
    collection: null,
    folderPath: null,
    imageCount: 1,
    galleryVersion: 1,
    coverStorageKey: null,
  };
}

describe("provisional quote selection", () => {
  it("adds and removes by canonical model ID, without duplicates", () => {
    const first = model("mdl-1");
    expect(toggleCanonicalSelection([], first)).toEqual([first]);
    expect(toggleCanonicalSelection([first], first)).toEqual([]);
  });

  it("rejects a 51st model without removing the 50 already selected", () => {
    const selected = Array.from(
      { length: MAX_CANONICAL_SELECTION },
      (_, index) => model("mdl-" + String(index)),
    );
    expect(toggleCanonicalSelection(selected, model("mdl-51"))).toEqual(
      selected,
    );
    expect(toggleCanonicalSelection(selected, selected[2])).toHaveLength(49);
  });

  it("does not mutate the original selection", () => {
    const current = [model("mdl-1")];
    const next = toggleCanonicalSelection(current, model("mdl-2"));
    expect(current).toHaveLength(1);
    expect(next).toHaveLength(2);
    expect(next).not.toBe(current);
  });
});
