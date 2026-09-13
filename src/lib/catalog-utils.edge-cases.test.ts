import { describe, expect, it } from "vitest";

import {
  buildModelTitle,
  compactTags,
  getCatalogCharacterName,
  getCatalogPublicTags,
  getCatalogSensitivity,
  getCatalogSourceName,
  getCatalogTagFilterValues,
  getCatalogTitle,
  getCatalogVersionName,
  isInternalCatalogTag,
  isPublicCatalogTag,
  normalizeCatalogTag,
  normalizeCatalogTags,
} from "./catalog-utils";

describe("catalog utils edge cases", () => {
  describe("tag normalization and visibility", () => {
    it("normalizes empty values, accents, separators and file extensions", () => {
      expect(normalizeCatalogTag(null)).toBe("");
      expect(normalizeCatalogTag("  Máscara__Dourada.WEBP  ")).toBe(
        "mascara dourada",
      );
      expect(normalizeCatalogTag("Dragon---Ball___Z")).toBe("dragon ball z");
    });

    it("classifies empty, internal and blocked tags as non-public", () => {
      expect(isPublicCatalogTag(undefined)).toBe(false);
      expect(isPublicCatalogTag("drive-import")).toBe(false);
      expect(isPublicCatalogTag("revisar")).toBe(false);
      expect(isPublicCatalogTag("outros")).toBe(false);
      expect(isPublicCatalogTag("Batman")).toBe(true);
      expect(isInternalCatalogTag(null)).toBe(false);
    });

    it("deduplicates normalized tags and honors the requested limit", () => {
      expect(
        normalizeCatalogTags(
          ["Batman", "batman", "BATMAN", "Robin", "drive-import", null],
          1,
        ),
      ).toEqual(["batman"]);
      expect(normalizeCatalogTags([], 5)).toEqual([]);
    });

    it("returns no filter values for invalid tags", () => {
      expect(getCatalogTagFilterValues(null)).toEqual([]);
      expect(getCatalogTagFilterValues("drive-import")).toEqual([]);
    });
  });

  describe("display names and variants", () => {
    it("uses the character name, then model name, then the generic fallback", () => {
      expect(
        getCatalogCharacterName({ character_name: "Bruce Wayne", name: "Batman" }),
      ).toBe("Bruce Wayne");
      expect(getCatalogCharacterName({ name: "Batman" })).toBe("Batman");
      expect(getCatalogCharacterName(undefined)).toBe("Modelo");
    });

    it("uses source title before franchise and handles absent sources", () => {
      expect(
        getCatalogSourceName({ source_title: "The Batman", franchise: "DC" }),
      ).toBe("The Batman");
      expect(getCatalogSourceName({ franchise: "DC" })).toBe("DC");
      expect(getCatalogSourceName(null)).toBeNull();
    });

    it("prefers an explicit variant over any storage-path fallback", () => {
      expect(
        getCatalogVersionName({
          name: "Batman",
          variant_name: "Edição Definitiva",
          storage_path: "catalog/batman-throne-1-22.webp",
        }),
      ).toBe("Edição Definitiva");
    });

    it("derives phrase variants from Windows-style storage paths", () => {
      expect(
        getCatalogVersionName({
          name: "Batman",
          character_name: "Batman",
          storage_path: "catalog\\dc\\batman\\batman-throne-1-22.webp",
        }),
      ).toBe("No Trono");
    });

    it("returns no fallback when the storage filename contains only the character", () => {
      expect(
        getCatalogVersionName({
          name: "Batman",
          character_name: "Batman",
          storage_path: "catalog/dc/batman/batman-1-22.webp",
        }),
      ).toBeNull();
      expect(getCatalogVersionName({ name: "Batman" })).toBeNull();
    });

    it("title-cases unknown fallback variants", () => {
      expect(
        getCatalogVersionName({
          name: "Batman",
          character_name: "Batman",
          storage_path: "catalog/dc/batman/batman-dark-knight-1-22.webp",
        }),
      ).toBe("Dark Knight");
    });

    it("builds concise titles with and without source or version", () => {
      expect(buildModelTitle("Batman", null)).toBe("Batman");
      expect(buildModelTitle("Batman", "DC")).toBe("Batman (DC)");
      expect(
        getCatalogTitle({
          name: "Batman",
          source_title: "DC",
          variant_name: "No Trono",
        }),
      ).toBe("Batman - No Trono");
      expect(getCatalogTitle({ name: "Batman", source_title: "DC" })).toBe(
        "Batman (DC)",
      );
      expect(getCatalogTitle(undefined)).toBe("Modelo");
    });
  });

  describe("public catalog tags", () => {
    it("handles missing models and empty compact-tag inputs", () => {
      expect(getCatalogPublicTags(undefined)).toEqual([]);
      expect(compactTags(null)).toEqual([]);
      expect(compactTags([])).toEqual([]);
    });

    it("compacts normalized public tags without leaking internal values", () => {
      expect(
        compactTags(["Batman", "BATMAN", "Robin", "drive-import"], 2),
      ).toEqual(["batman", "robin"]);
    });

    it("maps object aliases and removes generic object/modifier noise", () => {
      const tags = getCatalogPublicTags({
        name: "Helmet vermelho Batman",
        character_name: "Helmet vermelho Batman",
        category: "dc",
        subcategory: "objetos",
        source_title: "Batman",
        source_type: "comic",
        tags: ["objeto", "helmet", "vermelho", "batman"],
      });

      expect(tags).toContain("mascara");
      expect(tags).toContain("batman");
      expect(tags).not.toContain("objeto");
    });

    it("adds Freeza and Ginyu group context only when matching members exist", () => {
      const freezaTags = getCatalogPublicTags({
        name: "Dodoria",
        character_name: "Dodoria",
        source_title: "Dragon Ball Z",
        category: "anime",
        tags: ["dodoria"],
      });
      expect(freezaTags).toContain("freeza");

      const ginyuTags = getCatalogPublicTags({
        name: "Jeice",
        character_name: "Jeice",
        source_title: "Dragon Ball Z",
        category: "anime",
        tags: ["jeice"],
      });
      expect(ginyuTags).toContain("forca ginyu");
      expect(ginyuTags).toContain("ginyu");

      const unrelatedTags = getCatalogPublicTags({
        name: "Piccolo",
        character_name: "Piccolo",
        source_title: "Dragon Ball Z",
        category: "anime",
        tags: ["piccolo"],
      });
      expect(unrelatedTags).not.toContain("freeza");
      expect(unrelatedTags).not.toContain("forca ginyu");
    });

    it("respects the public tag limit after enrichment", () => {
      expect(
        getCatalogPublicTags(
          {
            name: "Zarbon",
            character_name: "Zarbon",
            source_title: "Dragon Ball Z",
            source_type: "anime",
            category: "anime",
            tags: ["zarbon", "dragon ball z"],
          },
          2,
        ),
      ).toHaveLength(2);
    });
  });

  describe("sensitivity classification", () => {
    it("defaults to standard for absent or non-record metadata", () => {
      expect(getCatalogSensitivity(undefined)).toEqual({
        level: "standard",
        shouldBlur: false,
        label: null,
      });
      expect(getCatalogSensitivity({ metadata: [] })).toMatchObject({
        level: "standard",
        shouldBlur: false,
      });
    });

    it("treats explicit boolean-like NSFW metadata as authoritative", () => {
      expect(
        getCatalogSensitivity({ metadata: { should_blur: "sim" } }),
      ).toMatchObject({ level: "nsfw", shouldBlur: true });
      expect(getCatalogSensitivity({ metadata: { nsfw: "yes" } })).toMatchObject({
        level: "nsfw",
        shouldBlur: true,
      });
      expect(
        getCatalogSensitivity({ metadata: { is_nsfw: true } }),
      ).toMatchObject({ level: "nsfw", shouldBlur: true });
    });

    it("recognizes explicit safe boolean-like metadata", () => {
      expect(getCatalogSensitivity({ metadata: { nsfw: "não" } })).toEqual({
        level: "standard",
        shouldBlur: false,
        label: null,
      });
      expect(
        getCatalogSensitivity({ metadata: { should_blur: "0" } }),
      ).toMatchObject({ level: "standard", shouldBlur: false });
    });

    it("classifies explicit ratings from nested moderation metadata", () => {
      expect(
        getCatalogSensitivity({
          metadata: { moderation: { rating: "sensitive-review" } },
        }),
      ).toEqual({
        level: "sensitive-review",
        shouldBlur: true,
        label: "Revisao de conteudo",
      });
    });

    it("classifies sensitive blur and age-ambiguous review markers", () => {
      expect(getCatalogSensitivity({ tags: ["sensitive-blur"] })).toEqual({
        level: "sensitive-blur",
        shouldBlur: true,
        label: "Conteudo sensivel",
      });
      expect(
        getCatalogSensitivity({ tags: ["age-ambiguous-review"] }),
      ).toEqual({
        level: "age-ambiguous-review",
        shouldBlur: true,
        label: "Revisao necessaria",
      });
    });

    it("detects NSFW text hints when no explicit safe marker exists", () => {
      expect(
        getCatalogSensitivity({ alt_text: "Batman adult preview" }),
      ).toMatchObject({ level: "nsfw", shouldBlur: true });
    });

    it("keeps an explicit safe rating ahead of filename/text hints", () => {
      expect(
        getCatalogSensitivity({
          alt_text: "adult preview",
          storage_path: "catalog/nsfw/batman.webp",
          content_rating: "safe",
        }),
      ).toEqual({ level: "standard", shouldBlur: false, label: null });
    });
  });
});
