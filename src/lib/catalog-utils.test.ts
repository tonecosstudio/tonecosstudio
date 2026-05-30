import { describe, expect, it } from "vitest";

import {
  getCatalogPublicTags,
  getCatalogTagFilterValues,
  isInternalCatalogTag,
  normalizeCatalogTag,
  normalizeCatalogTags,
} from "./catalog-utils";

describe("catalog utils", () => {
  it("normalizes public tag aliases from the catalog policy", () => {
    expect(normalizeCatalogTag("Animes")).toBe("anime");
    expect(normalizeCatalogTag("Filmes")).toBe("filme");
    expect(normalizeCatalogTag("Séries")).toBe("serie");
    expect(normalizeCatalogTag("HQ")).toBe("quadrinhos");
    expect(normalizeCatalogTag("Jogos")).toBe("game");
  });

  it("filters internal operational tags from public tag lists", () => {
    expect(isInternalCatalogTag("drive-id-123")).toBe(true);
    expect(isInternalCatalogTag("price-consultation")).toBe(true);
    expect(isInternalCatalogTag("revisar")).toBe(true);

    expect(
      normalizeCatalogTags([
        "Dragon Ball Z",
        "Zarbon",
        "anime",
        "drive-import",
        "source-dragon-ball-z",
        "IA",
        "Revisar",
      ]),
    ).toEqual(["dragon ball z", "zarbon", "anime"]);
  });

  it("expands canonical tag filters to legacy aliases", () => {
    expect(getCatalogTagFilterValues("filmes")).toEqual([
      "filme",
      "filmes",
      "movie",
    ]);
    expect(getCatalogTagFilterValues("HQ")).toEqual([
      "quadrinhos",
      "quadrinho",
      "comic",
      "comics",
      "hq",
    ]);
  });

  it("builds public tags from canonical model taxonomy", () => {
    expect(
      getCatalogPublicTags({
        name: "Zarbon",
        character_name: "Zarbon",
        source_title: "Dragon Ball Z",
        source_type: "anime",
        category: "animes",
        tags: ["source-dragon-ball-z", "price-consultation", "zarbon"],
      }),
    ).toEqual(["dragon ball z", "zarbon", "anime"]);
  });
});
