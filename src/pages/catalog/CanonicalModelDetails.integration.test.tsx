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

function mountGallery(options: { total: number; coverKey?: string }) {
  const io = vi.fn(async (input: string, _init: RequestInit) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/api/models/animal-original")) {
      return Response.json(model);
    }
    if (url.pathname.endsWith("/api/models/animal-original/images")) {
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
      <MemoryRouter initialEntries={["/modelos/animal-original"]}>
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
    expect(screen.getByRole("status")).toHaveTextContent(
      "Minha seleção: 0 de 50 modelos.",
    );
    fireEvent.click(add);
    const remove = screen.getByRole("button", { name: "Remover da seleção" });
    expect(remove).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Minha seleção: 1 de 50 modelos.",
    );
    fireEvent.click(remove);
    expect(screen.getByRole("button", { name: "Adicionar à seleção" }))
      .toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Minha seleção: 0 de 50 modelos.",
    );
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
