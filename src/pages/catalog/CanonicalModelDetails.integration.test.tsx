import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CatalogBrowsingProvider } from "@/services/catalog/catalog-browsing-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/config/canonical-catalog-endpoint", () => ({
  CANONICAL_CATALOG_API_BASE: "https://catalog.example.test/catalogo-api",
}));

vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeCard: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  ArcadeSectionTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
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
  vi.unstubAllGlobals();
});

function mountGallery(options: { total: number; coverKey?: string; returnState?: unknown; cyclicPage?: boolean }) {
  const io = vi.fn(async (input: string, _init: RequestInit) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/api/models/animal-original")) {
      return Response.json(
        options.cyclicPage ? { ...model, image_count: 3 } : model,
      );
    }
    if (url.pathname.endsWith("/api/models/animal-original/images")) {
      if (options.cyclicPage) {
        const cursor = url.searchParams.get("cursor");
        const nextCursor = cursor === null
          ? "page-2"
          : cursor === "page-2"
            ? "page-3"
            : "page-2";
        const imageId = cursor === null ? "img-1" : cursor === "page-2" ? "img-2" : "img-3";
        if (cursor !== null && cursor !== "page-2" && cursor !== "page-3") {
          throw new Error("unexpected_gallery_cursor");
        }
        return Response.json({
          items: [{ ...image, id: imageId, role: cursor === null ? "cover" : "gallery" }],
          total: 3,
          nextCursor,
          version: 9,
        });
      }
      return Response.json({
        items: [{
          ...image,
          variantKeys: { ...image.variantKeys, card: options.coverKey ?? coverKey },
        }],
        total: options.total,
        nextCursor: null,
        version: 9,
      });
    }
    throw new Error("unexpected_catalog_request: " + url.pathname);
  });
  vi.stubGlobal("fetch", io);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <CatalogBrowsingProvider>
      <MemoryRouter initialEntries={[{ pathname: "/modelos/animal-original", state: options.returnState }]}>
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

  it("allows provisional selection directly from the model detail without a write request", async () => {
    const { io } = mountGallery({ total: 1 });
    const add = await screen.findByRole("button", {
      name: "Adicionar à seleção",
    });
    expect(add).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Minha seleção: 0 de 50 modelos\./)).toBeInTheDocument();
    fireEvent.click(add);
    const remove = screen.getByRole("button", { name: "Remover da seleção" });
    expect(remove).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Minha seleção: 1 de 50 modelos\./)).toBeInTheDocument();
    fireEvent.click(remove);
    expect(screen.getByRole("button", { name: "Adicionar à seleção" }))
      .toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Minha seleção: 0 de 50 modelos\./)).toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(2);
    for (const [url, options] of io.mock.calls) {
      expect(url).toContain("/api/models/animal-original");
      expect(options).toMatchObject({ method: "GET", credentials: "omit" });
    }
  });

  it("renders a single approved cover without inventing extra photographs", async () => {
    const { io } = mountGallery({ total: 1 });
    await screen.findByRole("button", { name: "Ver imagem 1 de Animal original" });
    expect(screen.getByRole("link", { name: "Voltar ao catálogo" }))
      .toHaveAttribute("href", "/modelos");
    expect(screen.getByText("Imagens publicadas").parentElement?.querySelector("dd"))
      .toHaveTextContent("1");
    expect(screen.queryByRole("button", { name: "Carregar mais imagens" }))
      .not.toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(2);
    for (const [url, init] of io.mock.calls) {
      expect(url).toContain("https://catalog.example.test/catalogo-api/api/models/animal-original");
      expect(init).toMatchObject({ method: "GET", credentials: "omit" });
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
    expect(await screen.findByRole("link", { name: "Voltar ao catálogo" }))
      .toHaveAttribute("href", "/modelos");
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
    expect(await screen.findByRole("link", { name: "Voltar ao catálogo" }))
      .toHaveAttribute("href", "/modelos");
  });

  it("restores valid catalog search filters without changing their values", async () => {
    mountGallery({
      total: 1,
      returnState: {
        catalogReturnSearch:
          "q=escultura&category=games&franchise=nier&folder=heroes%2Ffigures",
      },
    });
    expect(await screen.findByRole("link", { name: "Voltar ao catálogo" }))
      .toHaveAttribute(
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
      expect(await screen.findByRole("link", { name: "Voltar ao catálogo" }))
        .toHaveAttribute("href", "/modelos");
      view.unmount();
    }
  });

  it("stops a non-adjacent gallery cursor cycle and preserves fetched images", async () => {
    const { io } = mountGallery({ total: 3, cyclicPage: true });
    await screen.findByRole("button", { name: "Ver imagem 1 de Animal original" });

    fireEvent.click(screen.getByRole("button", { name: "Carregar mais imagens" }));
    await screen.findByRole("button", { name: "Ver imagem 2 de Animal original" });
    fireEvent.click(screen.getByRole("button", { name: "Carregar mais imagens" }));
    await screen.findByRole("button", { name: "Ver imagem 3 de Animal original" });

    expect(screen.queryByRole("button", { name: "Carregar mais imagens" }))
      .not.toBeInTheDocument();
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
    await screen.findByRole("alert", { name: "" }).catch(() => screen.getByText("A galeria não pôde ser carregada."));
    await waitFor(() => {
      expect(screen.getByText("Imagens publicadas").parentElement?.querySelector("dd"))
        .toHaveTextContent("Indisponível");
    });
    expect(screen.queryByRole("button", { name: "Ver imagem 1 de Animal original" }))
      .not.toBeInTheDocument();
    expect(io).toHaveBeenCalledTimes(2);
  });

  it("does not trust a gallery cover belonging to a different model", async () => {
    const { io } = mountGallery({
      total: 1,
      coverKey: "media/mdl-other/1/card.webp",
    });
    await screen.findByText("A galeria não pôde ser carregada.");
    expect(screen.getByText("Imagens publicadas").parentElement?.querySelector("dd"))
      .toHaveTextContent("Indisponível");
    expect(io).toHaveBeenCalledTimes(2);
  });
});
