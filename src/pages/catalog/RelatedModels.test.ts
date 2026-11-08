import { describe, expect, it } from "vitest";
import type {
  PublicCatalogDetail,
  PublicCatalogModel,
} from "@/services/catalog/public-catalog-gateway";
import { selectRelatedModelGroups } from "./RelatedModels";

const current: PublicCatalogDetail = {
  id: "mdl-current",
  slug: "goku-original",
  code: "TS-001",
  name: "Goku",
  variantName: "Clássico",
  category: "Anime",
  categorySlug: "anime",
  franchise: "Dragon Ball",
  franchiseSlug: "dragon-ball",
  collection: "Saga Saiyajin",
  folderPath: null,
  imageCount: 1,
  galleryVersion: 1,
  coverStorageKey: "media/mdl-current/cover.webp",
  description: null,
  material: null,
  heightCm: null,
};

function related(
  id: string,
  name: string,
  variantName: string,
  changes: Partial<PublicCatalogModel> = {},
): PublicCatalogModel {
  return {
    ...current,
    id,
    code: "TS-" + id,
    slug: id,
    name,
    variantName,
    coverStorageKey: "media/" + id + "/cover.webp",
    ...changes,
  };
}

describe("TONART related model selection", () => {
  it("prioritizes exact same-character variants, collection and franchise without overlap", () => {
    const groups = selectRelatedModelGroups(current, [
      related("goku-ssj", "Goku", "Super Saiyajin"),
      related("vegeta", "Vegeta", "Armadura"),
      related("piccolo", "Piccolo", "Pose", { collection: "Outra saga" }),
      related("goku-clone", "Goku", "Super Saiyajin"),
      related("goku-current-copy", "Goku", "Clássico"),
      related("goku-other-franchise", "Goku", "Outra", { franchiseSlug: "marvel" }),
      related("without-photo", "Trunks", "Pose", { imageCount: 0 }),
      related("unsafe-slug", "Gohan", "Pose", { slug: "../admin" }),
      related("wrong-category", "Krillin", "Pose", { categorySlug: "games" }),
    ]);

    expect(groups.map((group) => group.title)).toEqual([
      "Outras versões de Goku", "Da mesma coleção", "Explore Dragon Ball",
    ]);
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([
      ["goku-ssj"], ["vegeta"], ["piccolo"],
    ]);
  });

  it("never creates empty groups or suggests the current record", () => {
    expect(selectRelatedModelGroups(current, [
      related("mdl-current", "Goku", "Outra", { slug: "goku-original" }),
      related("elsewhere", "Vegeta", "Pose", { franchiseSlug: "naruto" }),
      related("no-image", "Yamcha", "Pose", { coverStorageKey: null }),
    ])).toEqual([]);
  });

  it("caps each group at four distinct published models", () => {
    const variants = Array.from({ length: 9 }, (_, index) =>
      related("goku-" + index, "Goku", "Variação " + index),
    );
    const groups = selectRelatedModelGroups(current, variants);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(4);
    expect(groups[0].items.map((item) => item.slug)).toEqual([
      "goku-0", "goku-1", "goku-2", "goku-3",
    ]);
  });

  it("does not infer a common character from similar or partial titles", () => {
    const groups = selectRelatedModelGroups(current, [
      related("goku-black", "Goku Black", "Pose", { collection: null }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe("Explore Dragon Ball");
  });
});
