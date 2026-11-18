import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { CatalogBrowsingProvider } from "@/services/catalog/catalog-browsing-context";
import type { PublicCatalogModel } from "@/services/catalog/public-catalog-gateway";
import specialstlQuarantine from "@/services/catalog/specialstl-quarantine.json";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/config/canonical-catalog-endpoint", () => ({
  CANONICAL_CATALOG_API_BASE: "https://catalog.example.test/catalogo-api",
}));

const offerServiceMocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/services/commercial/tonart-commercial-offers-service", () => ({
  listTonartCommercialOffersForModel: offerServiceMocks.list,
}));

const accountServiceMocks = vi.hoisted(() => ({ currentUser: vi.fn() }));
vi.mock("@/services/customer/tonecos-account-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/services/customer/tonecos-account-service")
  >();
  return {
    ...actual,
    getTonecosCurrentUser: accountServiceMocks.currentUser,
  };
});

vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeCard: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
  ArcadeSectionTitle: ({ children }: { children: ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

import CanonicalModelDetails from "./CanonicalModelDetails";

const coverKey = "media/mdl-123/1/card.webp";
const model = {
  id: "mdl-123",
  slug: "animal-original",
  code: "TS-123",
  name: "Animal original",
  variant_name: "Modelo principal",
  category: "Games",
  category_slug: "games",
  franchise: "Exemplo",
  franchise_slug: "exemplo",
  collection: null,
  folder_path: null,
  image_count: 1,
  gallery_version: 9,
  cover_storage_key: coverKey,
  material: null,
  height_cm: null,
  description: null,
};
const image = {
  id: "img-1",
  role: "cover",
  width: 1200,
  height: 1600,
  bytes: 200000,
  mime: "image/webp",
  qualityScore: 88,
  sourceSha256: "a".repeat(64),
  variantKeys: {
    thumb: "media/mdl-123/1/thumb.webp",
    card: coverKey,
    detail: "media/mdl-123/1/detail.webp",
    original: null,
  },
};

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  offerServiceMocks.list.mockReset().mockResolvedValue([]);
  accountServiceMocks.currentUser.mockReset().mockResolvedValue(null);
});

function mountGallery(options: {
  total: number;
  coverKey?: string;
  returnState?: unknown;
  cyclicPage?: boolean;
  repeatedImageAcrossPages?: boolean;
  completeWithStrayCursor?: boolean;
  incompleteWithoutCursor?: boolean;
  restricted?: boolean;
  relatedItems?: Array<typeof model>;
  cachedFranchiseItems?: Array<typeof model>;
  characterItems?: Array<typeof model>;
  editorialModelCharacters?: unknown;
  relatedSearchError?: boolean;
  relatedPageFailsFirst?: boolean;
}) {
  let relatedPageAttempts = 0;
  const io = vi.fn(async (input: string, _init: RequestInit) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/api/catalog")) {
      if (url.searchParams.has("q")) {
        if (options.relatedSearchError) {
          return Response.json(
            { error: "search unavailable" },
            { status: 503 },
          );
        }
        return Response.json({
          items: options.characterItems ?? [],
          nextCursor: null,
        });
      }
      relatedPageAttempts += 1;
      if (options.relatedPageFailsFirst && relatedPageAttempts === 1) {
        return Response.json({ error: "catalog unavailable" }, { status: 503 });
      }
      return Response.json({
        items: options.relatedItems ?? [],
        nextCursor: null,
      });
    }
    if (url.pathname.endsWith("/api/editorial/v1/models/mdl-123/characters")) {
      return Response.json(
        options.editorialModelCharacters ?? { items: [], truncated: false },
      );
    }
    if (url.pathname.endsWith("/api/models/animal-nova-pose")) {
      return Response.json({
        ...model,
        id: "mdl-124",
        slug: "animal-nova-pose",
        code: "TS-124",
        variant_name: "Nova pose",
        image_count: 0,
        gallery_version: 0,
        cover_storage_key: null,
      });
    }
    if (url.pathname.endsWith("/api/models/animal-original")) {
      if (options.restricted) {
        return Response.json({
          ...model,
          id: specialstlQuarantine.confirmed[0].modelId,
        });
      }
      return Response.json(
        options.cyclicPage
          ? { ...model, image_count: 3 }
          : options.repeatedImageAcrossPages ||
              options.completeWithStrayCursor ||
              options.incompleteWithoutCursor
            ? { ...model, image_count: 2 }
            : model,
      );
    }
    if (url.pathname.endsWith("/api/models/animal-original/images")) {
      if (options.completeWithStrayCursor) {
        const cursor = url.searchParams.get("cursor");
        if (cursor !== null && cursor !== "page-2") {
          throw new Error("unexpected_extra_gallery_read");
        }
        return Response.json({
          items: [
            {
              ...image,
              id: cursor === null ? "img-1" : "img-2",
              role: cursor === null ? "cover" : "gallery",
              variantKeys:
                cursor === null
                  ? image.variantKeys
                  : {
                      thumb: "media/mdl-123/2/thumb.webp",
                      card: "media/mdl-123/2/card.webp",
                      detail: "media/mdl-123/2/detail.webp",
                      original: null,
                    },
            },
          ],
          total: 2,
          // The Worker erroneously announces another page after all images arrived.
          nextCursor: cursor === null ? "page-2" : "page-3",
          version: 9,
        });
      }
      if (options.incompleteWithoutCursor) {
        return Response.json({
          items: [image],
          total: 2,
          nextCursor: null,
          version: 9,
        });
      }
      if (options.repeatedImageAcrossPages) {
        const cursor = url.searchParams.get("cursor");
        if (cursor !== null && cursor !== "page-2") {
          throw new Error("unexpected_gallery_cursor");
        }
        return Response.json({
          items: [{ ...image, role: cursor === null ? "cover" : "gallery" }],
          total: 2,
          nextCursor: cursor === null ? "page-2" : null,
          version: 9,
        });
      }
      if (options.cyclicPage) {
        const cursor = url.searchParams.get("cursor");
        const nextCursor =
          cursor === null
            ? "page-2"
            : cursor === "page-2"
              ? "page-3"
              : "page-2";
        const imageId =
          cursor === null ? "img-1" : cursor === "page-2" ? "img-2" : "img-3";
        if (cursor !== null && cursor !== "page-2" && cursor !== "page-3") {
          throw new Error("unexpected_gallery_cursor");
        }
        return Response.json({
          items: [
            {
              ...image,
              id: imageId,
              role: cursor === null ? "cover" : "gallery",
            },
          ],
          total: 3,
          nextCursor,
          version: 9,
        });
      }
      return Response.json({
        items: [
          {
            ...image,
            variantKeys: {
              ...image.variantKeys,
              card: options.coverKey ?? coverKey,
            },
          },
        ],
        total: options.total,
        nextCursor: null,
        version: 9,
      });
    }
    throw new Error("unexpected_catalog_request: " + url.pathname);
  });
  vi.stubGlobal("fetch", io);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (options.cachedFranchiseItems) {
    const decoded: PublicCatalogModel[] = options.cachedFranchiseItems.map(
      (row) => ({
        id: row.id,
        slug: row.slug,
        code: row.code,
        name: row.name,
        variantName: row.variant_name,
        category: row.category,
        categorySlug: row.category_slug,
        franchise: row.franchise,
        franchiseSlug: row.franchise_slug,
        collection: row.collection,
        folderPath: row.folder_path,
        imageCount: row.image_count,
        galleryVersion: row.gallery_version,
        coverStorageKey: row.cover_storage_key,
      }),
    );
    client.setQueryData(
      [
        "tonecos-catalog-list",
        JSON.stringify(["", "games", "exemplo", ""]),
        undefined,
      ],
      { items: decoded, nextCursor: null },
    );
  }
  const view = render(
    <QueryClientProvider client={client}>
      <CatalogBrowsingProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/modelos/animal-original",
              state: options.returnState,
            },
          ]}
        >
          <Routes>
            <Route path="/modelos/:id" element={<CanonicalModelDetails />} />
          </Routes>
        </MemoryRouter>
      </CatalogBrowsingProvider>
    </QueryClientProvider>,
  );
  return { io, ...view };
}

describe("published model/gallery identity on the public detail page", () => {
  it("loads ordinary model details in public mode despite the retired blanket flag", async () => {
    vi.stubEnv("VITE_TONART_HIDE_CATALOG_MEDIA", "true");
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "true");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    const { io } = mountGallery({ total: 1 });
    expect(
      await screen.findByRole("heading", { name: "Animal original" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: "Ver imagem 1 de Animal original",
      }),
    ).toBeInTheDocument();
    expect(io).toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "Ficha em preparação" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Como usar Coins no orçamento"),
    ).not.toBeInTheDocument();
    expect(
      io.mock.calls.some(([input]) =>
        String(input).includes("/api/editorial/v1/models/"),
      ),
    ).toBe(false);
  });

  it("shows multiple independently approved characters linked to one canonical model", async () => {
    vi.stubEnv("VITE_TONECOS_PUBLIC_EDITORIAL_PROJECTION", "v1");
    const source = (id: string, title: string) => ({
      id,
      title,
      url: `https://publisher.example/${id}`,
      kind: "official",
    });
    const editorialModelCharacters = {
      items: [
        {
          publication: {
            contractVersion: 1,
            editorialStatus: "approved",
            visibility: "public",
            revision: "character-1",
            reviewedAt: "2026-11-17T12:00:00.000Z",
          },
          character: {
            id: "character-zoro",
            slug: "roronoa-zoro",
            name: "Roronoa Zoro",
            evidenceIds: ["official-zoro"],
          },
          universe: { slug: "one-piece", categorySlug: "anime" },
          relationEvidenceIds: ["official-zoro"],
          evidence: [source("official-zoro", "Fonte oficial de Roronoa Zoro")],
        },
        {
          publication: {
            contractVersion: 1,
            editorialStatus: "approved",
            visibility: "public",
            revision: "character-2",
            reviewedAt: "2026-11-17T12:00:00.000Z",
          },
          character: {
            id: "character-luffy",
            slug: "monkey-d-luffy",
            name: "Monkey D. Luffy",
            evidenceIds: ["official-luffy"],
          },
          universe: { slug: "one-piece", categorySlug: "anime" },
          relationEvidenceIds: ["official-luffy"],
          evidence: [source("official-luffy", "Fonte oficial de Monkey D. Luffy")],
        },
      ],
      truncated: false,
    };
    const { io } = mountGallery({ total: 1, editorialModelCharacters });

    expect(
      await screen.findByRole("heading", { name: "Personagens desta peça" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Roronoa Zoro" }),
    ).toHaveAttribute(
      "href",
      "/universo/anime/one-piece/roronoa-zoro",
    );
    expect(
      await screen.findByRole("link", { name: "Monkey D. Luffy" }),
    ).toHaveAttribute("href", "/universo/anime/one-piece/monkey-d-luffy");
    expect(
      io.mock.calls.some(([input]) =>
        String(input).endsWith("/api/editorial/v1/models/mdl-123/characters"),
      ),
    ).toBe(true);
  });

  it("explains that Coins apply only to eligible extras, not quotes or plan payments", async () => {
    vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    const { io } = mountGallery({ total: 1 });

    expect(
      await screen.findByRole("heading", { name: "Animal original" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Como funcionam as Coins"));

    expect(
      screen.getByText(
        /Orçamentos, entrada de pré-venda, parcelas de plano e frete ficam fora do uso de Coins/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Consultar saldo e movimentações de Coins",
      }),
    ).toHaveAttribute("href", "/moedas");
    expect(io).toHaveBeenCalled();
  });

  it("shows the configured offer and requires an account before Coins or checkout", async () => {
    vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    offerServiceMocks.list.mockResolvedValue([
      {
        id: "8c10a7c6-46f0-49a6-99be-820c43a9e6f0",
        catalogModelSlug: "animal-original",
        scale: "1/10",
        finishing: "painted",
        contentsDescription: "Peça pintada, com base incluída.",
        itemPriceBrl: 237.5,
        shippingMode: "quote_required",
        shippingAmountBrl: null,
        deliveryTerms: "Prazo informado após confirmação do CEP.",
        coinsEligible: true,
        subscriberDiscountEligible: false,
        isActive: true,
        updatedAt: "2026-11-15T20:00:00.000Z",
      },
    ]);
    const { io } = mountGallery({ total: 1 });

    expect(
      await screen.findByRole("heading", { name: "Condições da peça" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Escala 1/10 · Pintado")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*237,50/)).toBeInTheDocument();
    expect(
      await screen.findByText(
        /Entre para consultar seu saldo e simular o abatimento de Coins/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Entre para pedir esta peça" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmar pedido/i })).not.toBeInTheDocument();
    expect(offerServiceMocks.list).toHaveBeenCalledWith("animal-original");
    expect(io).toHaveBeenCalled();
  });

  it("keeps the gallery operational despite the retired media-review flag", async () => {
    vi.stubEnv("VITE_TONART_HIDE_CATALOG_MEDIA", "true");
    vi.stubGlobal("IntersectionObserver", undefined);
    const { io } = mountGallery({ total: 1 });
    expect(
      await screen.findByRole("heading", { name: "Animal original" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: "Ver imagem 1 de Animal original",
      }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        io.mock.calls.some(([url]) => String(url).includes("/images?")),
      ).toBe(true),
    );
    expect(screen.queryByText("Imagem em revisão")).not.toBeInTheDocument();
  });

  it("preserves filtered catalog return and supports returning to prior suggested model", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    const { io } = mountGallery({
      total: 1,
      returnState: {
        catalogReturnSearch: "q=escultura&category=games&franchise=exemplo",
        catalogSiblingSlugs: ["animal-original", "robo-armadura"],
      },
      relatedItems: [
        {
          ...model,
          id: "mdl-124",
          code: "TS-124",
          slug: "animal-nova-pose",
          variant_name: "Nova pose",
          cover_storage_key: "media/mdl-124/card.webp",
        },
      ],
    });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Ver sugestões relacionadas" }),
    );
    const suggestion = await screen.findByRole("link", {
      name: "Ver modelo Animal original — Nova pose",
    });
    fireEvent.click(suggestion);

    const previous = await screen.findByRole("link", {
      name: "Voltar ao modelo anterior",
    });
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Animal original" }),
      ).toHaveFocus();
      expect(scrollTo).toHaveBeenCalledWith({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(previous).toHaveAttribute("href", "/modelos/animal-original");
    expect(
      screen.getByRole("link", { name: "Voltar ao catálogo" }),
    ).toHaveAttribute(
      "href",
      "/modelos?q=escultura&category=games&franchise=exemplo",
    );
    // Stale adjacent-sibling snapshots from the source page must not be reused.
    expect(
      screen.queryByRole("link", { name: "Próximo modelo" }),
    ).not.toBeInTheDocument();

    fireEvent.click(previous);
    expect(
      await screen.findByRole("heading", { name: "Animal original" }),
    ).toBeInTheDocument();
    // This explicit return must not reset the reader's position again.
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("link", { name: "Voltar ao modelo anterior" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voltar ao catálogo" }),
    ).toHaveAttribute(
      "href",
      "/modelos?q=escultura&category=games&franchise=exemplo",
    );
    expect(
      io.mock.calls.filter(([url]) => url.includes("/api/catalog")),
    ).toHaveLength(1);
  });

  it("preserves Universe folder return on a recommended model", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    mountGallery({
      total: 1,
      returnState: {
        catalogReturnUniverse: {
          category: "games",
          franchise: "exemplo",
          folder: "heroes/figures",
        },
      },
      relatedItems: [
        {
          ...model,
          id: "mdl-124",
          code: "TS-124",
          slug: "animal-nova-pose",
          variant_name: "Nova pose",
          cover_storage_key: "media/mdl-124/card.webp",
        },
      ],
    });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Ver sugestões relacionadas" }),
    );
    fireEvent.click(
      await screen.findByRole("link", {
        name: "Ver modelo Animal original — Nova pose",
      }),
    );
    expect(
      await screen.findByRole("link", { name: "Voltar à pasta" }),
    ).toHaveAttribute(
      "href",
      "/universo/games/exemplo?folder=heroes%2Ffigures",
    );
    expect(
      screen.getByRole("link", { name: "Voltar ao modelo anterior" }),
    ).toHaveAttribute("href", "/modelos/animal-original");
  });

  it("automatically loads exactly one related page when scrolled near the hidden section", async () => {
    let onIntersect:
      | ((entries: Array<{ isIntersecting: boolean }>) => void)
      | undefined;
    class FakeIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        onIntersect = (entries) =>
          callback(
            entries as IntersectionObserverEntry[],
            this as unknown as IntersectionObserver,
          );
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);

    const { io } = mountGallery({
      total: 1,
      relatedItems: [
        {
          ...model,
          id: "mdl-124",
          code: "TS-124",
          slug: "animal-nova-pose",
          variant_name: "Nova pose",
          cover_storage_key: "media/mdl-124/card.webp",
        },
      ],
    });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    expect(
      screen.queryByRole("heading", { name: "Explore mais modelos" }),
    ).not.toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(2);

    await act(async () => {
      onIntersect?.([{ isIntersecting: true }]);
    });
    expect(
      await screen.findByRole("heading", {
        name: "Outras versões de Animal original",
      }),
    ).toBeInTheDocument();
    expect(
      io.mock.calls.filter(([url]) => url.includes("/api/catalog")),
    ).toHaveLength(1);
  });

  it("offers one user-initiated retry when suggestions fail, with no automatic retry", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { io } = mountGallery({
      total: 1,
      relatedPageFailsFirst: true,
      relatedItems: [
        {
          ...model,
          id: "mdl-124",
          code: "TS-124",
          slug: "animal-nova-pose",
          variant_name: "Nova pose",
          cover_storage_key: "media/mdl-124/card.webp",
        },
      ],
    });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Ver sugestões relacionadas" }),
    );

    const retry = await screen.findByRole("button", {
      name: "Tentar novamente",
    });
    expect(
      screen.getByText("Não foi possível carregar sugestões agora."),
    ).toBeInTheDocument();
    expect(
      io.mock.calls.filter(([url]) => url.includes("/api/catalog")),
    ).toHaveLength(1);

    fireEvent.click(retry);
    expect(
      await screen.findByRole("link", {
        name: "Ver modelo Animal original — Nova pose",
      }),
    ).toHaveAttribute("href", "/modelos/animal-nova-pose");
    expect(
      io.mock.calls.filter(([url]) => url.includes("/api/catalog")),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Tentar novamente" }),
    ).not.toBeInTheDocument();
  });

  it("hides the section when its single bounded response has no eligible related models", async () => {
    // Exercise the manual fallback regardless of environment polyfills.
    vi.stubGlobal("IntersectionObserver", undefined);
    const { io } = mountGallery({
      total: 1,
      relatedItems: [
        {
          ...model,
          id: "mdl-other",
          slug: "outro-universo",
          code: "TS-other",
          franchise_slug: "outra-franquia",
        },
        {
          ...model,
          id: specialstlQuarantine.confirmed[0].modelId,
          slug: "modelo-em-quarentena",
          code: "TS-quarentena",
        },
      ],
    });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Ver sugestões relacionadas" }),
    );
    await waitFor(() => {
      expect(
        io.mock.calls.filter(([url]) => url.includes("/api/catalog")),
      ).toHaveLength(2);
    });
    expect(
      screen.queryByRole("heading", { name: "Explore mais modelos" }),
    ).not.toBeInTheDocument();
  });

  it("finds an exact character beyond the first franchise page with one bounded fallback", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { io } = mountGallery({
      total: 1,
      relatedItems: [
        {
          ...model,
          id: "mdl-125",
          code: "TS-125",
          slug: "robo-armadura",
          name: "Robô",
          variant_name: "Armadura",
          cover_storage_key: "media/mdl-125/card.webp",
        },
      ],
      characterItems: [
        {
          ...model,
          id: "mdl-124",
          code: "TS-124",
          slug: "animal-nova-pose",
          variant_name: "Nova pose",
          cover_storage_key: "media/mdl-124/card.webp",
        },
        {
          ...model,
          id: "mdl-126",
          code: "TS-126",
          slug: "animal-parecido",
          name: "Animal original preto",
          variant_name: "Escultura",
          cover_storage_key: "media/mdl-126/card.webp",
        },
      ],
    });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    expect(io).toHaveBeenCalledTimes(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Ver sugestões relacionadas" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Outras versões de Animal original",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Explore Exemplo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Ver modelo Animal original — Nova pose",
      }),
    ).toHaveAttribute("href", "/modelos/animal-nova-pose");
    expect(
      screen.queryByRole("link", { name: /Animal original preto/ }),
    ).not.toBeInTheDocument();

    const requests = io.mock.calls
      .filter(([url]) => url.includes("/api/catalog"))
      .map(([url]) => new URL(url));
    expect(requests).toHaveLength(2);
    expect(requests[0].searchParams.has("q")).toBe(false);
    expect(requests[1].searchParams.get("q")).toBe("Animal original");
    expect(requests[1].searchParams.get("category")).toBe("games");
    expect(requests[1].searchParams.get("franchise")).toBe("exemplo");
    expect(requests[1].searchParams.get("limit")).toBe("36");
    expect(requests[1].searchParams.has("cursor")).toBe(false);
    expect(io).toHaveBeenCalledTimes(4);
  });

  it("keeps verified franchise links when the optional character search fails", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { io } = mountGallery({
      total: 1,
      relatedItems: [
        {
          ...model,
          id: "mdl-125",
          code: "TS-125",
          slug: "robo-armadura",
          name: "Robô",
          variant_name: "Armadura",
          cover_storage_key: "media/mdl-125/card.webp",
        },
      ],
      relatedSearchError: true,
    });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Ver sugestões relacionadas" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Explore Exemplo" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Outras versões de Animal original",
      }),
    ).not.toBeInTheDocument();
    expect(
      io.mock.calls.filter(([url]) => url.includes("/api/catalog")),
    ).toHaveLength(2);
  });

  it("reuses the validated first page from the franchise catalog without a second read", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { io } = mountGallery({
      total: 1,
      cachedFranchiseItems: [
        {
          ...model,
          id: "mdl-124",
          code: "TS-124",
          slug: "animal-nova-pose",
          variant_name: "Nova pose",
          cover_storage_key: "media/mdl-124/card.webp",
        },
      ],
    });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    expect(io).toHaveBeenCalledTimes(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Ver sugestões relacionadas" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Outras versões de Animal original",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Ver modelo Animal original — Nova pose",
      }),
    ).toHaveAttribute("href", "/modelos/animal-nova-pose");
    expect(
      io.mock.calls.filter(([url]) => url.includes("/api/catalog")),
    ).toHaveLength(0);
    expect(io).toHaveBeenCalledTimes(2);
  });

  it("loads bounded related suggestions only on demand and respects exact franchise/character matches", async () => {
    // Exercise the manual fallback regardless of environment polyfills.
    vi.stubGlobal("IntersectionObserver", undefined);
    const { io } = mountGallery({
      total: 1,
      relatedItems: [
        {
          ...model,
          id: "mdl-124",
          code: "TS-124",
          slug: "animal-nova-pose",
          variant_name: "Nova pose",
          cover_storage_key: "media/mdl-124/card.webp",
        },
        {
          ...model,
          id: "mdl-125",
          code: "TS-125",
          slug: "robo-armadura",
          name: "Robô",
          variant_name: "Armadura",
          cover_storage_key: "media/mdl-125/card.webp",
        },
        {
          ...model,
          id: "mdl-126",
          code: "TS-126",
          slug: "outro-universo",
          name: "Outro",
          variant_name: "Pose",
          franchise_slug: "outro",
          cover_storage_key: "media/mdl-126/card.webp",
        },
        {
          ...model,
          id: specialstlQuarantine.confirmed[0].modelId,
          code: "TS-127",
          slug: "modelo-em-revisao",
          name: "Em revisão",
          variant_name: "Pose",
          cover_storage_key: "media/mdl-127/card.webp",
        },
      ],
    });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    expect(io).toHaveBeenCalledTimes(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Ver sugestões relacionadas" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Outras versões de Animal original",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Explore Exemplo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver todos de Exemplo" }),
    ).toHaveAttribute("href", "/modelos?category=games&franchise=exemplo");
    expect(
      screen.getByRole("link", {
        name: "Ver modelo Animal original — Nova pose",
      }),
    ).toHaveAttribute("href", "/modelos/animal-nova-pose");
    expect(
      screen.queryByRole("link", { name: /Ver modelo Outro/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Em revisão/ }),
    ).not.toBeInTheDocument();

    const catalogRequests = io.mock.calls.filter(([url]) =>
      url.includes("/api/catalog"),
    );
    expect(catalogRequests).toHaveLength(1);
    const request = new URL(catalogRequests[0][0]);
    expect(request.searchParams.get("category")).toBe("games");
    expect(request.searchParams.get("franchise")).toBe("exemplo");
    expect(request.searchParams.get("limit")).toBe("36");
    expect(request.searchParams.has("cursor")).toBe(false);
    expect(io).toHaveBeenCalledTimes(3);
  });

  it("explains intentionally quarantined image without offering a retry or gallery", async () => {
    const { io } = mountGallery({ total: 1, restricted: true });
    expect(
      await screen.findByRole("heading", { name: "Modelo indisponível" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Esta referência não está disponível no momento",
    );
    expect(
      screen.queryByRole("button", { name: "Tentar novamente" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: /Referência visual de/ }),
    ).not.toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(1);
  });

  it("allows provisional selection directly from the model detail without a write request", async () => {
    const { io } = mountGallery({ total: 1 });
    const add = await screen.findByRole("button", {
      name: "Adicionar à seleção",
    });
    expect(add).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByText(/Minha seleção: 0 de 50 modelos\./),
    ).toBeInTheDocument();
    fireEvent.click(add);
    const remove = screen.getByRole("button", { name: "Remover da seleção" });
    expect(remove).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText(/Minha seleção: 1 de 50 modelos\./),
    ).toBeInTheDocument();
    fireEvent.click(remove);
    expect(
      screen.getByRole("button", { name: "Adicionar à seleção" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByText(/Minha seleção: 0 de 50 modelos\./),
    ).toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(2);
    for (const [url, options] of io.mock.calls) {
      expect(url).toContain("/api/models/animal-original");
      expect(options).toMatchObject({ method: "GET", credentials: "omit" });
    }
  });

  it("does not navigate to a quote when a new model cannot fit in the full selection", async () => {
    vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");

    const items: PublicCatalogModel[] = Array.from(
      { length: 50 },
      (_, index) => ({
        id: "selected-" + index,
        slug: "selected-" + index,
        code: "TS-SEL-" + index,
        name: "Selecionado " + index,
        variantName: "",
        category: "Games",
        categorySlug: "games",
        franchise: "Exemplo",
        franchiseSlug: "exemplo",
        collection: null,
        folderPath: null,
        imageCount: 0,
        galleryVersion: 0,
        coverStorageKey: null,
      }),
    );
    window.localStorage.setItem(
      "tonart:pending-quote-selection:v1",
      JSON.stringify({
        expiresAt: Date.now() + 60_000,
        items,
      }),
    );

    mountGallery({ total: 1 });

    const add = await screen.findByRole("button", {
      name: "Adicionar à seleção",
    });
    expect(add).toBeDisabled();
    expect(
      screen.queryByRole("link", {
        name: "Solicitar orçamento deste modelo",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Solicitar orçamento deste modelo",
      }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Sua seleção já tem 50 modelos. Remova um modelo antes de incluir esta referência no orçamento.",
      ),
    ).toBeInTheDocument();
  });

  it("uses published card/thumbnail variants only if their image requests fail", async () => {
    mountGallery({ total: 1 });
    const thumbnail = await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    const main = screen.getByRole("img", {
      name: "Referência visual de Animal original",
    });
    expect(main).toHaveAttribute(
      "src",
      "https://catalog.example.test/catalogo-api/media/mdl-123/1/detail.webp",
    );
    expect(main).toHaveAttribute("fetchpriority", "high");

    const thumbImage = thumbnail.querySelector("img")!;
    expect(thumbImage).toHaveAttribute(
      "src",
      "https://catalog.example.test/catalogo-api/media/mdl-123/1/thumb.webp",
    );
    expect(thumbImage).toHaveAttribute("fetchpriority", "low");
    fireEvent.error(main);
    expect(
      screen.getByRole("img", { name: "Referência visual de Animal original" }),
    ).toHaveAttribute(
      "src",
      "https://catalog.example.test/catalogo-api/media/mdl-123/1/card.webp",
    );
    fireEvent.error(thumbImage);
    expect(thumbnail.querySelector("img")).toHaveAttribute(
      "src",
      "https://catalog.example.test/catalogo-api/media/mdl-123/1/card.webp",
    );
  });

  it("renders a single approved cover without inventing extra photographs", async () => {
    const { io } = mountGallery({ total: 1 });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    expect(
      screen.getByRole("link", { name: "Voltar ao catálogo" }),
    ).toHaveAttribute("href", "/modelos");
    expect(
      screen.getByText("Imagens publicadas").parentElement?.querySelector("dd"),
    ).toHaveTextContent("1");
    expect(
      screen.queryByRole("button", { name: "Carregar mais imagens" }),
    ).not.toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(2);
    for (const [url, init] of io.mock.calls) {
      expect(url).toContain(
        "https://catalog.example.test/catalogo-api/api/models/animal-original",
      );
      expect(init).toMatchObject({ method: "GET", credentials: "omit" });
    }
  });

  it("links only to adjacent slugs from the loaded catalog page and preserves search scope", async () => {
    const { io } = mountGallery({
      total: 1,
      returnState: {
        catalogReturnSearch: "q=escultura&category=games",
        catalogSiblingSlugs: [
          "outro-original",
          "animal-original",
          "terceiro-original",
        ],
      },
    });
    const prev = screen.getByRole("link", { name: "Modelo anterior" });
    const next = screen.getByRole("link", { name: "Próximo modelo" });
    expect(prev).toHaveAttribute("href", "/modelos/outro-original");
    expect(next).toHaveAttribute("href", "/modelos/terceiro-original");
    expect(
      screen.getByRole("link", { name: "Voltar ao catálogo" }),
    ).toHaveAttribute("href", "/modelos?q=escultura&category=games");
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    expect(io).toHaveBeenCalledTimes(2);
  });

  it("navigates only verified Universe preview siblings without another catalog read", async () => {
    const { io } = mountGallery({
      total: 1,
      returnState: {
        catalogReturnUniverse: {
          category: "games",
          franchise: "nier",
          folder: "heroes",
        },
        universeSiblingSlugs: ["other-one", "animal-original", "other-two"],
      },
    });
    expect(
      screen.getByRole("link", { name: "Voltar à pasta" }),
    ).toHaveAttribute("href", "/universo/games/nier?folder=heroes");
    expect(
      screen.getByRole("navigation", {
        name: "Navegação entre modelos desta pasta do Universo",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Modelo anterior" }),
    ).toHaveAttribute("href", "/modelos/other-one");
    expect(
      screen.getByRole("link", { name: "Próximo modelo" }),
    ).toHaveAttribute("href", "/modelos/other-two");
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    expect(io).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid and mixed Universe navigation snapshots", async () => {
    const scope = { category: "games", franchise: "nier", folder: "heroes" };
    const invalid = [
      {
        catalogReturnUniverse: scope,
        universeSiblingSlugs: ["animal-original", "../admin"],
      },
      {
        catalogReturnUniverse: scope,
        universeSiblingSlugs: ["animal-original", "animal-original"],
      },
      {
        catalogReturnUniverse: scope,
        universeSiblingSlugs: [
          "animal-original",
          ...Array.from({ length: 8 }, (_, i) => "other-" + i),
        ],
      },
      {
        catalogReturnUniverse: scope,
        universeSiblingSlugs: ["a-model", "b-model"],
      },
      {
        catalogReturnUniverse: scope,
        universeSiblingSlugs: ["animal-original", "other-one"],
        catalogSiblingSlugs: ["animal-original", "other-two"],
      },
      {
        catalogReturnUniverse: {
          category: "https://outside.test",
          franchise: "nier",
        },
        universeSiblingSlugs: ["animal-original", "other-one"],
      },
    ];
    for (const returnState of invalid) {
      const view = mountGallery({ total: 1, returnState });
      expect(
        screen.queryByRole("link", { name: "Modelo anterior" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Próximo modelo" }),
      ).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it("rejects untrusted or oversized adjacent-model navigation snapshots", async () => {
    const unsafe = [
      { catalogSiblingSlugs: ["animal-original", "../admin"] },
      { catalogSiblingSlugs: ["animal-original", "animal-original"] },
      {
        catalogSiblingSlugs: [
          "animal-original",
          ...Array.from({ length: 36 }, (_, i) => "other-" + i),
        ],
      },
      { catalogSiblingSlugs: ["other-one", "other-two"] },
      {
        catalogSiblingSlugs: ["animal-original", "other-one"],
        catalogReturnUniverse: {
          category: "games",
          franchise: "nier",
        },
      },
    ];
    for (const returnState of unsafe) {
      const view = mountGallery({ total: 1, returnState });
      await screen.findByRole("button", {
        name: "Ver imagem 1 de Animal original",
      });
      expect(
        screen.queryByRole("link", { name: "Modelo anterior" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Próximo modelo" }),
      ).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it("returns to the exact canonical Universe folder when entered from a folder preview", async () => {
    mountGallery({
      total: 1,
      returnState: {
        catalogReturnUniverse: {
          category: "games",
          franchise: "nier",
          folder: "heroes/figures",
        },
      },
    });
    const back = await screen.findByRole("link", { name: "Voltar à pasta" });
    expect(back).toHaveAttribute(
      "href",
      "/universo/games/nier?folder=heroes%2Ffigures",
    );
  });

  it("rejects untrusted return scopes and traversal folders", async () => {
    const { unmount } = mountGallery({
      total: 1,
      returnState: {
        catalogReturnUniverse: {
          category: "https://outside.test",
          franchise: "nier",
          folder: "heroes",
        },
      },
    });
    expect(
      await screen.findByRole("link", { name: "Voltar ao catálogo" }),
    ).toHaveAttribute("href", "/modelos");
    unmount();

    mountGallery({
      total: 1,
      returnState: {
        catalogReturnUniverse: {
          category: "games",
          franchise: "nier",
          folder: "../admin",
        },
      },
    });
    expect(
      await screen.findByRole("link", { name: "Voltar ao catálogo" }),
    ).toHaveAttribute("href", "/modelos");
  });

  it("restores valid catalog search filters without changing their values", async () => {
    mountGallery({
      total: 1,
      returnState: {
        catalogReturnSearch:
          "q=escultura&category=games&franchise=nier&folder=heroes%2Ffigures",
      },
    });
    expect(
      await screen.findByRole("link", { name: "Voltar ao catálogo" }),
    ).toHaveAttribute(
      "href",
      "/modelos?q=escultura&category=games&franchise=nier&folder=heroes%2Ffigures",
    );
  });

  it("rejects invalid catalog return filters using the same gateway constraints", async () => {
    const invalidStates = [
      "q=ab",
      "q=" + "x".repeat(81),
      "category=games%2Fadmin",
      "franchise=https%3A%2F%2Foutside.test",
      "category=games&franchise=nier&folder=..%2Fadmin",
      "folder=heroes",
    ];
    for (const catalogReturnSearch of invalidStates) {
      const view = mountGallery({
        total: 1,
        returnState: { catalogReturnSearch },
      });
      expect(
        await screen.findByRole("link", { name: "Voltar ao catálogo" }),
      ).toHaveAttribute("href", "/modelos");
      view.unmount();
    }
  });

  it("stops gallery reads once the published total is received despite an extra cursor", async () => {
    const { io } = mountGallery({ total: 2, completeWithStrayCursor: true });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Carregar mais imagens" }),
    );
    await screen.findByRole("button", {
      name: "Ver imagem 2 de Animal original",
    });

    expect(
      screen.queryByRole("button", { name: "Carregar mais imagens" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Imagens publicadas").parentElement?.querySelector("dd"),
    ).toHaveTextContent("2");
    // One detail request and two gallery pages, never the stale third cursor.
    expect(io).toHaveBeenCalledTimes(3);
  });

  it("navigates previous and next among loaded approved images without extra API requests", async () => {
    const { io } = mountGallery({ total: 2, completeWithStrayCursor: true });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    expect(
      screen.queryByRole("button", { name: "Próxima imagem" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Carregar mais imagens" }),
    );
    await screen.findByRole("button", {
      name: "Ver imagem 2 de Animal original",
    });
    expect(screen.getByText("Imagem 1 de 2 carregadas")).toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole("button", { name: "Próxima imagem" }));
    expect(
      screen.getByRole("img", { name: "Referência visual de Animal original" }),
    ).toHaveAttribute(
      "src",
      "https://catalog.example.test/catalogo-api/media/mdl-123/2/detail.webp",
    );
    expect(screen.getByText("Imagem 2 de 2 carregadas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver imagem 2 de Animal original" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Próxima imagem" }));
    expect(screen.getByText("Imagem 1 de 2 carregadas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Imagem anterior" }));
    expect(screen.getByText("Imagem 2 de 2 carregadas")).toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(3);
  });

  it("supports scoped keyboard arrows and Home/End with focus and live position updates", async () => {
    const { io } = mountGallery({ total: 2, completeWithStrayCursor: true });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Carregar mais imagens" }),
    );
    const second = await screen.findByRole("button", {
      name: "Ver imagem 2 de Animal original",
    });
    const first = screen.getByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    const counter = screen.getByText("Imagem 1 de 2 carregadas");
    expect(counter).toHaveAttribute("aria-live", "polite");
    expect(counter).toHaveAttribute("aria-atomic", "true");
    expect(
      screen.getByRole("group", { name: "Miniaturas da galeria" }),
    ).toHaveAttribute("aria-describedby");
    expect(io).toHaveBeenCalledTimes(3);

    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Imagem 2 de 2 carregadas")).toBeInTheDocument();

    fireEvent.keyDown(second, { key: "Home" });
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(first, { key: "End" });
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(second, { key: "ArrowRight" });
    expect(first).toHaveFocus();

    // Navigation buttons support arrows while retaining their focus.
    const next = screen.getByRole("button", { name: "Próxima imagem" });
    next.focus();
    fireEvent.keyDown(next, { key: "ArrowRight" });
    expect(next).toHaveFocus();
    expect(screen.getByText("Imagem 2 de 2 carregadas")).toBeInTheDocument();
    fireEvent.keyDown(next, { key: "ArrowLeft", altKey: true });
    expect(screen.getByText("Imagem 2 de 2 carregadas")).toBeInTheDocument();

    // Arrow keys outside the gallery must not change the selected photograph.
    const back = screen.getByRole("link", { name: "Voltar ao catálogo" });
    fireEvent.keyDown(back, { key: "ArrowLeft" });
    expect(screen.getByText("Imagem 2 de 2 carregadas")).toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(3);
  });

  it("blocks a truncated gallery with no next cursor rather than showing a false total", async () => {
    const { io } = mountGallery({ total: 2, incompleteWithoutCursor: true });
    await screen.findByText("A galeria não pôde ser carregada.");
    expect(
      screen.getByText("Imagens publicadas").parentElement?.querySelector("dd"),
    ).toHaveTextContent("Indisponível");
    expect(
      screen.queryByRole("button", { name: "Ver imagem 1 de Animal original" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Carregar mais imagens" }),
    ).not.toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(2);
  });

  it("fails closed on an image ID repeated across two valid gallery pages", async () => {
    const { io } = mountGallery({ total: 2, repeatedImageAcrossPages: true });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Carregar mais imagens" }),
    );

    await screen.findByText("A galeria não pôde ser carregada.");
    expect(
      screen.getByText("Imagens publicadas").parentElement?.querySelector("dd"),
    ).toHaveTextContent("Indisponível");
    expect(
      screen.queryByRole("button", { name: "Ver imagem 1 de Animal original" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Carregar mais imagens" }),
    ).not.toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(3);
  });

  it("stops a non-adjacent gallery cursor cycle and preserves fetched images", async () => {
    const { io } = mountGallery({ total: 3, cyclicPage: true });
    await screen.findByRole("button", {
      name: "Ver imagem 1 de Animal original",
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Carregar mais imagens" }),
    );
    await screen.findByRole("button", {
      name: "Ver imagem 2 de Animal original",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Carregar mais imagens" }),
    );
    await screen.findByRole("button", {
      name: "Ver imagem 3 de Animal original",
    });

    expect(
      screen.queryByRole("button", { name: "Carregar mais imagens" }),
    ).not.toBeInTheDocument();
    // The model selection also uses role="status"; target the gallery
    // message specifically and preserve its accessibility semantics.
    expect(
      screen.getByText(
        /A sequência da galeria retornou a uma página já visitada\./,
      ),
    ).toHaveAttribute("role", "status");
    // Exactly one published model detail and three bounded gallery pages.
    expect(io).toHaveBeenCalledTimes(4);
  });

  it("blocks a stale gallery total instead of claiming unverified published images", async () => {
    const { io } = mountGallery({ total: 2 });
    await screen
      .findByRole("alert", { name: "" })
      .catch(() => screen.getByText("A galeria não pôde ser carregada."));
    await waitFor(() => {
      expect(
        screen
          .getByText("Imagens publicadas")
          .parentElement?.querySelector("dd"),
      ).toHaveTextContent("Indisponível");
    });
    expect(
      screen.queryByRole("button", { name: "Ver imagem 1 de Animal original" }),
    ).not.toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(2);
  });

  it("does not trust a gallery cover belonging to a different model", async () => {
    const { io } = mountGallery({
      total: 1,
      coverKey: "media/mdl-other/1/card.webp",
    });
    await screen.findByText("A galeria não pôde ser carregada.");
    expect(
      screen.getByText("Imagens publicadas").parentElement?.querySelector("dd"),
    ).toHaveTextContent("Indisponível");
    expect(io).toHaveBeenCalledTimes(2);
  });
});
