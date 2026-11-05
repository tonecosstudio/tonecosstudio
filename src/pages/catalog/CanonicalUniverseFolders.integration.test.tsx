import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { CanonicalUniverseFolders } from "./CanonicalUniverseFolders";
import { createPublicCatalogGateway } from "@/services/catalog/public-catalog-gateway";

vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeCard: ({ children }: { children: ReactNode }) => <article>{children}</article>,
}));

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
            { id: "single", label: "Item único", count: 1 },
            { id: "multiple", label: "Vários itens", count: 3 },
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
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("link", { name: "Item único 1 modelo" })).toHaveAttribute(
      "href",
      "/universo/games/nier?folder=single",
    );
    expect(await screen.findByRole("link", { name: "Vários itens 3 modelos" })).toHaveAttribute(
      "href",
      "/universo/games/nier?folder=multiple",
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
