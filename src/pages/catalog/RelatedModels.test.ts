import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPublicCatalogGateway,
  type PublicCatalogDetail,
  type PublicCatalogModel,
} from "@/services/catalog/public-catalog-gateway";
import {
  RelatedModels,
  catalogDiscoveryTags,
  relatedCatalogReturnState,
  selectRelatedModelGroups,
} from "./RelatedModels";

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

describe("related-model navigation context", () => {
  it("preserves the validated catalog query without sibling snapshots", () => {
    expect(
      relatedCatalogReturnState(
        "/modelos?q=escultura&category=games&franchise=nier",
      ),
    ).toEqual({
      catalogReturnSearch: "q=escultura&category=games&franchise=nier",
    });
    expect(relatedCatalogReturnState("/modelos")).toEqual({
      catalogReturnSearch: "",
    });
  });

  it("preserves the exact canonical Universe folder without external state", () => {
    expect(
      relatedCatalogReturnState("/universo/games/nier?folder=heroes%2Ffigures"),
    ).toEqual({
      catalogReturnUniverse: {
        category: "games",
        franchise: "nier",
        folder: "heroes/figures",
      },
    });
    expect(relatedCatalogReturnState("/universo/games/nier")).toEqual({
      catalogReturnUniverse: { category: "games", franchise: "nier" },
    });
  });

  it("fails closed on unexpected or unsafe return paths", () => {
    expect(relatedCatalogReturnState("https://outside.test")).toEqual({
      catalogReturnSearch: "",
    });
    expect(relatedCatalogReturnState("/universo/../admin")).toEqual({
      catalogReturnSearch: "",
    });
  });
});

describe("TONART related model selection", () => {
  it("prioritizes exact same-character variants, collection and franchise without overlap", () => {
    const groups = selectRelatedModelGroups(current, [
      related("goku-ssj", "Goku", "Super Saiyajin"),
      related("vegeta", "Vegeta", "Armadura"),
      related("piccolo", "Piccolo", "Pose", { collection: "Outra saga" }),
      related("goku-clone", "Goku", "Super Saiyajin"),
      related("goku-current-copy", "Goku", "Clássico"),
      related("goku-other-franchise", "Goku", "Outra", {
        franchiseSlug: "marvel",
      }),
      related("without-photo", "Trunks", "Pose", { imageCount: 0 }),
      related("unsafe-slug", "Gohan", "Pose", { slug: "../admin" }),
      related("wrong-category", "Krillin", "Pose", { categorySlug: "games" }),
    ]);

    expect(groups.map((group) => group.title)).toEqual([
      "Outras versões de Goku",
      "Da mesma coleção",
      "Explore Dragon Ball",
    ]);
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([
      ["goku-ssj", "goku-clone", "goku-current-copy"],
      ["vegeta"],
      ["piccolo"],
    ]);
  });

  it("never creates empty groups or suggests the current record", () => {
    expect(
      selectRelatedModelGroups(current, [
        related("mdl-current", "Goku", "Outra", { slug: "goku-original" }),
        related("elsewhere", "Vegeta", "Pose", { franchiseSlug: "naruto" }),
        related("no-image", "Yamcha", "Pose", { coverStorageKey: null }),
        related("same-code", "Goku", "Outra", { code: current.code }),
      ]),
    ).toEqual([]);
  });

  it("caps each group at four distinct published models", () => {
    const variants = Array.from({ length: 9 }, (_, index) =>
      related("goku-" + index, "Goku", "Variação " + index),
    );
    const groups = selectRelatedModelGroups(current, variants);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(4);
    expect(groups[0].items.map((item) => item.slug)).toEqual([
      "goku-0",
      "goku-1",
      "goku-2",
      "goku-3",
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

describe("TONART canonical discovery tags", () => {
  it("links category and universe from the published catalog without another index", () => {
    expect(catalogDiscoveryTags(current)).toEqual([
      {
        kind: "category",
        label: "Anime",
        accessibleLabel: "Ver categoria Anime",
        to: "/modelos?category=anime",
      },
      {
        kind: "universe",
        label: "Dragon Ball",
        accessibleLabel: "Explorar universo Dragon Ball",
        to: "/universo/anime/dragon-ball",
      },
      {
        kind: "name-search",
        label: "Goku",
        accessibleLabel: "Buscar modelos pelo nome Goku",
        to: "/modelos?q=Goku&category=anime&franchise=dragon-ball",
      },
    ]);
  });

  it("encodes names as bounded search hints, not invented character-page identities", () => {
    const tags = catalogDiscoveryTags({
      ...current,
      name: "Roronoa Zoro & Sanji",
      franchise: "One Piece",
      franchiseSlug: "one-piece",
    });
    expect(tags.map((tag) => tag.label)).toEqual([
      "Anime",
      "One Piece",
      "Roronoa Zoro & Sanji",
    ]);
    expect(tags[2].kind).toBe("name-search");
    expect(tags[2].to).toBe(
      "/modelos?q=Roronoa+Zoro+%26+Sanji&category=anime&franchise=one-piece",
    );
    expect(tags.every((tag) => !tag.to.includes("/personagem/"))).toBe(true);
  });

  it("skips unsafe or unsupported name queries while retaining valid taxonomy", () => {
    expect(catalogDiscoveryTags({ ...current, name: "Go" })).toHaveLength(2);
    expect(
      catalogDiscoveryTags({ ...current, name: "A".repeat(81) }),
    ).toHaveLength(2);
    expect(
      catalogDiscoveryTags({
        ...current,
        name: "Goku" + String.fromCharCode(10) + "Admin",
      }),
    ).toHaveLength(2);
    expect(catalogDiscoveryTags({ ...current, name: "<admin>" })).toHaveLength(
      2,
    );
  });

  it("fails closed on invalid catalog scope and never constructs external links", () => {
    expect(
      catalogDiscoveryTags({ ...current, categorySlug: "../admin" }),
    ).toEqual([]);
    expect(
      catalogDiscoveryTags({ ...current, franchiseSlug: "https://evil.test" }),
    ).toEqual([]);
    expect(catalogDiscoveryTags({ ...current, category: "   " })).toEqual([]);
    expect(catalogDiscoveryTags({ ...current, franchise: "   " })).toEqual([]);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TONART catalog discovery visibility", () => {
  function renderDiscovery() {
    const gateway = {
      listPage: vi.fn(async () => ({ items: [], nextCursor: null })),
      mediaUrl: vi.fn(() => null),
    } as unknown as ReturnType<typeof createPublicCatalogGateway>;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const view = render(
      createElement(
        MemoryRouter,
        null,
        createElement(
          QueryClientProvider,
          { client },
          createElement(RelatedModels, {
            model: current,
            gateway,
            returnPath: "/modelos",
          }),
        ),
      ),
    );
    return { ...view, gateway };
  }

  it("shows taxonomy links without triggering a related-model query until in view", () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const { gateway } = renderDiscovery();
    expect(
      screen.getByRole("navigation", { name: "Explorar filtros do catálogo" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Explorar universo Dragon Ball" })
        .getAttribute("href"),
    ).toBe("/universo/anime/dragon-ball");
    expect(
      screen.queryByRole("heading", { name: "Explore mais modelos" }),
    ).toBeNull();
    expect(gateway.listPage).not.toHaveBeenCalled();
  });

  it("keeps category, universe and name search accessible with no eligible siblings", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { gateway } = renderDiscovery();
    fireEvent.click(
      screen.getByRole("button", { name: "Ver sugestões relacionadas" }),
    );
    await waitFor(() => {
      expect(gateway.listPage).toHaveBeenCalledTimes(2);
      expect(
        screen.queryByRole("heading", { name: "Explore mais modelos" }),
      ).toBeNull();
    });
    expect(
      screen
        .getByRole("link", { name: "Ver categoria Anime" })
        .getAttribute("href"),
    ).toBe("/modelos?category=anime");
    expect(
      screen.getByRole("link", { name: "Explorar universo Dragon Ball" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Buscar modelos pelo nome Goku" }),
    ).toBeTruthy();
  });
});
