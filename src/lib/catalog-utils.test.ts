import { describe, expect, it } from "vitest";

import {
  getCatalogSensitivity,
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
    expect(normalizeCatalogTag("Desenhos Animação")).toBe("desenhos");
    expect(normalizeCatalogTag("X-23")).toBe("x-23");
    expect(normalizeCatalogTag("Adulto")).toBe("nsfw");
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
        "outros",
        "other",
        "catalogo geral",
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
    expect(getCatalogTagFilterValues("Adulto")).toEqual([
      "nsfw",
      "adulto",
      "improprio",
      "conteudo adulto",
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
    ).toEqual(["anime", "zarbon", "dragon ball z"]);

    expect(
      getCatalogPublicTags({
        name: "Bebop",
        character_name: "Bebop",
        source_title: "Tartarugas Ninja",
        source_type: "other",
        category: "desenhos-animacao",
        tags: ["desenhos-animacao", "bebop", "tartarugas ninja"],
      }),
    ).toEqual(["desenhos", "bebop", "tartarugas ninja"]);
  });

  it("breaks object title phrases into public concept tags", () => {
    expect(
      getCatalogPublicTags({
        name: "Goku e Chi-Chi",
        character_name: "Goku e Chi-Chi",
        source_title: "Dragon Ball",
        source_type: "anime",
        category: "animes",
        tags: ["dragon ball", "goku", "chi chi"],
      }),
    ).toEqual(["anime", "goku", "chi chi", "dragon ball"]);

    expect(
      getCatalogPublicTags(
        {
          name: "Coroa Chifres Loki",
          character_name: "Coroa Chifres Loki",
          source_title: "Thor",
          source_type: "comic",
          category: "marvel",
          subcategory: "objetos",
          tags: ["marvel", "thor", "loki", "coroa chifres loki"],
        },
        3,
      ),
    ).toEqual(["marvel", "mascara", "loki"]);

    const maskTags = getCatalogPublicTags({
      name: "Mascaras Deadpool e Venom",
      character_name: "Mascaras Deadpool e Venom",
      source_title: "Deadpool",
      source_type: "comic",
      category: "marvel",
      subcategory: "objetos",
      tags: [
        "marvel",
        "deadpool",
        "venom",
        "mascara",
        "objeto",
        "mascara deadpool venom",
        "mascaras deadpool e venom",
      ],
    });
    expect(maskTags.slice(0, 4)).toEqual([
      "marvel",
      "mascara",
      "deadpool",
      "venom",
    ]);
    expect(maskTags).not.toContain("deadpool venom");
  });

  it("keeps official multi-word names as one public concept", () => {
    const tags = getCatalogPublicTags({
      name: "Homem Aranha",
      character_name: "Homem Aranha",
      source_title: "Homem Aranha",
      source_type: "comic",
      category: "marvel",
      subcategory: "herois",
      tags: ["homem aranha", "herois"],
    });

    expect(tags).toContain("homem aranha");
    expect(tags).not.toContain("homem");
    expect(tags).not.toContain("aranha");

    const ironManObjectTags = getCatalogPublicTags({
      name: "Capacete Homem de Ferro",
      character_name: "Capacete Homem de Ferro",
      source_title: "Homem de Ferro",
      source_type: "comic",
      category: "marvel",
      subcategory: "objetos",
      tags: ["marvel", "capacete homem de ferro"],
    });

    expect(ironManObjectTags).toContain("mascara");
    expect(ironManObjectTags).toContain("homem de ferro");
    expect(ironManObjectTags).not.toContain("homem");
    expect(ironManObjectTags).not.toContain("ferro");

    const redHoodBustTags = getCatalogPublicTags({
      name: "Busto Capuz Vermelho",
      character_name: "Busto Capuz Vermelho",
      source_title: "Batman",
      source_type: "comic",
      category: "dc",
      subcategory: "anti-herois",
      tags: ["dc", "busto capuz vermelho"],
    });

    expect(redHoodBustTags).toContain("busto");
    expect(redHoodBustTags).toContain("capuz vermelho");
    expect(redHoodBustTags).not.toContain("capuz");
    expect(redHoodBustTags).not.toContain("vermelho");
  });

  it("keeps variant-level sensitive markers from blurring the whole model", () => {
    expect(
      getCatalogSensitivity({
        name: "Android 18",
        tags: ["sensitive-has-variant"],
      }),
    ).toMatchObject({ level: "standard", shouldBlur: false });

    expect(
      getCatalogSensitivity({
        alt_text: "Android 18 NSFW variant",
        metadata: { content_rating: "nsfw" },
      }),
    ).toMatchObject({ level: "nsfw", shouldBlur: true });

    expect(
      getCatalogSensitivity({
        storage_path: "catalog/anime/android-18/nsfw/normal-view.webp",
        metadata: { content_rating: "safe" },
      }),
    ).toMatchObject({ level: "standard", shouldBlur: false });
  });
});
