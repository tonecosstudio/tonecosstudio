import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import ArcadeLab from "./ArcadeLab";

const catalog = vi.hoisted(() => ({
  listPage: vi.fn(),
  mediaUrl: vi.fn(),
}));

vi.mock("@/config/canonical-catalog-endpoint", () => ({
  CANONICAL_CATALOG_API_BASE: "https://catalog.example.test/catalogo-api/",
}));
vi.mock("@/services/catalog/public-catalog-gateway", () => ({
  createPublicCatalogGateway: () => ({
    listPage: catalog.listPage,
    mediaUrl: catalog.mediaUrl,
  }),
}));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ArcadeLab />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  catalog.listPage.mockReset();
  catalog.mediaUrl.mockReset();
  catalog.listPage.mockResolvedValue({ items: [], nextCursor: null });
  catalog.mediaUrl.mockReturnValue(null);
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Arcade Lab", () => {
  it("keeps illustrative characters out of the real catalog and fetches only on request", async () => {
    setup();
    expect(
      screen.getByRole("button", { name: "Selecionar Kage" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(catalog.listPage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Catálogo real/ }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Nenhum modelo publicado",
    );
    expect(catalog.listPage).toHaveBeenCalledOnce();
    expect(catalog.listPage).toHaveBeenCalledWith(
      { limit: 12 },
      expect.any(AbortSignal),
    );
    expect(
      screen.queryByRole("button", { name: "Selecionar Kage" }),
    ).not.toBeInTheDocument();
  });

  it("selects a character by keyboard and resets the selection when filtering", () => {
    setup();
    const kage = screen.getByRole("button", { name: "Selecionar Kage" });
    fireEvent.keyDown(kage, { key: "ArrowRight" });
    expect(
      screen.getByRole("button", { name: "Selecionar Ember" }),
    ).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Ember" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Metal", exact: true }));
    expect(
      within(
        screen.getByRole("group", { name: "Selecionar personagem" }),
      ).getAllByRole("button"),
    ).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "Atlas", exact: true }),
    ).toBeInTheDocument();
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Selecionar Atlas" }),
      { key: "End" },
    );
    expect(
      screen.getByRole("heading", { name: "Bolt", exact: true }),
    ).toBeInTheDocument();
    expect(catalog.listPage).not.toHaveBeenCalled();
  });

  it("identifies preview pieces in the details dialog without a purchase action", () => {
    setup();
    fireEvent.click(
      screen.getByRole("button", { name: /Explorar personagem/ }),
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(
      "Esta peça não está anunciada para compra",
    );
    expect(
      within(dialog).getByRole("link", { name: /Explorar catálogo real/ }),
    ).toHaveAttribute("href", "/universo");
    expect(catalog.listPage).not.toHaveBeenCalled();
  });

  it("shows retryable errors instead of demo inventory in real mode", async () => {
    catalog.listPage.mockRejectedValueOnce(new Error("Worker unavailable"));
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Catálogo real/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O acervo não respondeu",
    );
    fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));
    await waitFor(() => expect(catalog.listPage).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Nenhum modelo publicado",
    );
    expect(
      screen.queryByRole("button", { name: "Selecionar Kage" }),
    ).not.toBeInTheDocument();
  });

  it("opens a published canonical model rather than the legacy character catalog", async () => {
    catalog.listPage.mockResolvedValue({
      items: [{
        id: "mdl-1",
        slug: "nier-10h-nier",
        name: "10H",
        franchise: "NieR",
        variantName: "",
        imageCount: 1,
        coverStorageKey: "media/mdl-1/card.webp",
      }],
      nextCursor: "another-page",
    });
    catalog.mediaUrl.mockReturnValue("/catalogo-api/media/mdl-1/card.webp");
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Catálogo real/ }));
    expect(await screen.findByRole("heading", { name: "10H" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ver ficha do modelo/ }),
    ).toHaveAttribute("href", "/modelos/nier-10h-nier");
    expect(screen.getByRole("img", { name: "10H" })).toHaveAttribute(
      "src",
      "/catalogo-api/media/mdl-1/card.webp",
    );
    expect(screen.getByText("Modelo do acervo publicado")).toBeInTheDocument();
    expect(catalog.listPage).toHaveBeenCalledOnce();
    expect(catalog.listPage).toHaveBeenCalledWith(
      { limit: 12 },
      expect.any(AbortSignal),
    );
  });
});
