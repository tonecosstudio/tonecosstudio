import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { CanonicalUniverseFolders } from "./CanonicalUniverseFolders";
import { createPublicCatalogGateway } from "@/services/catalog/public-catalog-gateway";
import { CatalogBrowsingProvider } from "@/services/catalog/catalog-browsing-context";

vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeCard: ({ children }: { children: ReactNode }) => <article>{children}</article>,
  ArcadeSectionTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/config/canonical-catalog-endpoint", () => ({
  CANONICAL_CATALOG_API_BASE: "https://catalog.example.test/catalogo-api",
}));
afterEach(() => vi.unstubAllGlobals());

const model = {
  id: "mdl-10h",
  slug: "nier-10h-nier",
  code: "TS-10H",
  name: "10H",
  variant_name: "",
  category: "Games",
  category_slug: "games",
  franchise: "NieR",
  franchise_slug: "nier",
  collection: null,
  folder_path: "heroes",
  image_count: 1,
  gallery_version: 1,
  cover_storage_key: null,
};

function Destination() {
  const location = useLocation();
  return <output data-testid="source-state">{JSON.stringify(location.state)}</output>;
}

describe("canonical Universe folder navigation", () => {
  it("carries the verified folder scope into the model detail without another catalog scan", async () => {
    const io = vi.fn(async (input: string, init: RequestInit) => {
      expect(init.method).toBe("GET");
      const url = new URL(input);
      if (url.pathname.endsWith("/api/folders")) {
        return Response.json({
          current: { id: "heroes", label: "Heroes", count: 1 },
          trail: [{ id: "heroes", label: "Heroes" }],
          items: [
            { id: "heroes/single-item", label: "Item único", count: 1, hasChildren: false },
            { id: "heroes/multiple-items", label: "Vários itens", count: 3, hasChildren: false },
          ],
        });
      }
      if (url.pathname.endsWith("/api/catalog")) {
        return Response.json({ items: [model], nextCursor: null });
      }
      throw new Error("unexpected_worker_request: " + url.pathname);
    });
    const gateway = createPublicCatalogGateway(
      "https://catalog.example.test/catalogo-api",
      io as typeof fetch,
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <CatalogBrowsingProvider>
        <MemoryRouter initialEntries={["/universo/games/nier?folder=heroes"]}>
          <Routes>
            <Route
              path="/universo/:category/:franchise"
              element={
                <CanonicalUniverseFolders
                  category="games"
                  franchise="nier"
                  gateway={gateway}
                />
              }
            />
            <Route path="/modelos/:id" element={<Destination />} />
          </Routes>
        </MemoryRouter>
        </CatalogBrowsingProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("link", { name: "Item único 1 modelo" })).toHaveAttribute(
      "href",
      "/universo/games/nier?folder=heroes%2Fsingle-item",
    );
    expect(await screen.findByRole("link", { name: "Vários itens 3 modelos" })).toHaveAttribute(
      "href",
      "/universo/games/nier?folder=heroes%2Fmultiple-items",
    );
    const link = await screen.findByRole("link", { name: "Ver detalhes de 10H" });
    expect(link).toHaveAttribute("href", "/modelos/nier-10h-nier");
    expect(io).toHaveBeenCalledTimes(2);
    fireEvent.click(link);
    expect(screen.getByTestId("source-state")).toHaveTextContent(
      '"catalogReturnUniverse":{"category":"games","franchise":"nier","folder":"heroes"}',
    );
    expect(io).toHaveBeenCalledTimes(2);
  });
});

  it("restores the visited preview card after returning from a real model detail", async () => {
    const io = vi.fn(async (input: string, init: RequestInit) => {
      expect(init.method).toBe("GET");
      const url = new URL(input);
      if (url.pathname.endsWith("/api/folders")) {
        return Response.json({
          current: { id: "heroes", label: "Heroes", count: 1 },
          trail: [{ id: "heroes", label: "Heroes" }],
          items: [],
        });
      }
      if (url.pathname.endsWith("/api/catalog")) {
        return Response.json({ items: [model], nextCursor: null });
      }
      if (url.pathname.endsWith("/api/models/nier-10h-nier")) {
        return Response.json({
          ...model, image_count: 0, gallery_version: 0,
          description: null, material: null, height_cm: null,
        });
      }
      throw new Error("unexpected_request: " + url.pathname);
    });
    vi.stubGlobal("fetch", io);
    const gateway = createPublicCatalogGateway(
      "https://catalog.example.test/catalogo-api", io as typeof fetch,
    );
    const { default: Details } = await import("./CanonicalModelDetails");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <CatalogBrowsingProvider>
          <MemoryRouter initialEntries={["/universo/games/nier?folder=heroes"]}>
            <Routes>
              <Route path="/universo/:category/:franchise" element={
                <CanonicalUniverseFolders
                  category="games" franchise="nier" gateway={gateway}
                />
              } />
              <Route path="/modelos/:id" element={<Details />} />
            </Routes>
          </MemoryRouter>
        </CatalogBrowsingProvider>
      </QueryClientProvider>,
    );
    const preview = await screen.findByRole("link", { name: "Ver detalhes de 10H" });
    fireEvent.click(preview);
    const back = await screen.findByRole("link", { name: "Voltar à pasta" });
    expect(back).toHaveAttribute("href", "/universo/games/nier?folder=heroes");
    fireEvent.click(back);
    const returned = await screen.findByRole("link", { name: "Ver detalhes de 10H" });
    await waitFor(() => expect(returned).toHaveFocus());

    // Reuse the React Query cache, never query the full acervo again.
    expect(io.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/api/catalog"))).toHaveLength(1);
    expect(io.mock.calls.filter(([url]) =>
      new URL(url).pathname.endsWith("/api/folders"))).toHaveLength(1);
  });
