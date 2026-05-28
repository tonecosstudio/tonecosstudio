import { describe, expect, it } from "vitest";

import { slugifyCollectionName } from "./admin-collections.utils";

describe("slugifyCollectionName", () => {
  it("normalizes names to safe URL slugs", () => {
    expect(slugifyCollectionName("  Colecao Herois & Viloes!!  ")).toBe("colecao-herois-viloes");
    expect(slugifyCollectionName("X-Men / 97")).toBe("x-men-97");
    expect(slugifyCollectionName("\u00c1\u00e7\u00e3o \u00c9pica")).toBe("acao-epica");
  });

  it("drops input without slug-safe content", () => {
    expect(slugifyCollectionName("!!!")).toBe("");
  });
});
