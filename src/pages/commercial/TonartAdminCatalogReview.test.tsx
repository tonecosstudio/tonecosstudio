import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  listPage: vi.fn(),
  createGateway: vi.fn(),
}));
vi.mock("@/config/canonical-catalog-endpoint", () => ({
  CANONICAL_CATALOG_API_BASE: "https://tonartstudio.com.br/catalogo-api/",
}));
vi.mock("@/services/catalog/public-catalog-gateway", () => ({
  createPublicCatalogGateway: mocks.createGateway,
}));

import TonartAdminCatalogReview from "./TonartAdminCatalogReview";

const withCover = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "modelo-teste", code: "T001", name: "Modelo de teste", variantName: "",
  category: "Cinema", categorySlug: "cinema", franchise: "Clássicos", franchiseSlug: "classicos",
  collection: null, folderPath: null, imageCount: 4, galleryVersion: 1,
  coverStorageKey: "media/test/modelo/card.webp",
};
const withoutCover = {
  ...withCover,
  id: "22222222-2222-4222-8222-222222222222",
  slug: "modelo-sem-capa", code: "T002", name: "Modelo sem capa",
  coverStorageKey: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.createGateway.mockReturnValue({ listPage: mocks.listPage });
  mocks.listPage.mockResolvedValue({
    items: [withCover, withoutCover], nextCursor: null,
  });
});
afterEach(cleanup);
function show() {
  return render(<MemoryRouter><TonartAdminCatalogReview /></MemoryRouter>);
}

describe("TONART canonical admin catalog review", () => {
  it("never triggers a D1 request until the administrator explicitly asks for a page", async () => {
    show();
    expect(screen.getByRole("heading", { name: "Catálogo de modelos" })).toBeInTheDocument();
    expect(mocks.createGateway).toHaveBeenCalledTimes(1);
    expect(mocks.listPage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Carregar modelos" }));
    expect(await screen.findByText("Modelo sem capa")).toBeInTheDocument();
    expect(mocks.listPage).toHaveBeenCalledTimes(1);
    expect(mocks.listPage.mock.calls[0][0]).toEqual({
      search: undefined, limit: 12, cursor: undefined,
    });
  });

  it("reviews missing cover metadata locally without further catalog or image queries", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Carregar modelos" }));
    await screen.findByText("Modelo sem capa");
    const originalCalls = mocks.listPage.mock.calls.length;
    fireEvent.click(screen.getByRole("checkbox", {
      name: "Mostrar apenas modelos sem capa nesta página",
    }));
    expect(screen.queryByText("Modelo de teste")).not.toBeInTheDocument();
    expect(screen.getByText("Modelo sem capa")).toBeInTheDocument();
    expect(screen.getByText("1 sem chave de capa nesta página")).toBeInTheDocument();
    expect(mocks.listPage).toHaveBeenCalledTimes(originalCalls);
    expect(screen.getByRole("link", { name: "Abrir ficha" })).toHaveAttribute(
      "href", expect.stringContaining("22222222-2222-4222-8222-222222222222"),
    );
  });

  it("paginates by the canonical cursor and never prefetches next pages", async () => {
    mocks.listPage
      .mockResolvedValueOnce({ items: [withCover], nextCursor: "next-page-token" })
      .mockResolvedValueOnce({ items: [withoutCover], nextCursor: null })
      .mockResolvedValueOnce({ items: [withCover], nextCursor: "next-page-token" });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Carregar modelos" }));
    await screen.findByText("Modelo de teste");
    expect(mocks.listPage).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(await screen.findByText("Modelo sem capa")).toBeInTheDocument();
    expect(mocks.listPage.mock.calls[1][0]).toMatchObject({
      limit: 12, cursor: "next-page-token",
    });
    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));
    await waitFor(() => expect(mocks.listPage).toHaveBeenCalledTimes(3));
    expect(mocks.listPage.mock.calls[2][0].cursor).toBeUndefined();
  });

  it("rejects short searches locally without hitting the catalog", async () => {
    show();
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar modelos do catálogo" }), {
      target: { value: "ab" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Carregar modelos" }));
    expect(screen.getByRole("alert")).toHaveTextContent("3 a 80 caracteres");
    expect(mocks.listPage).not.toHaveBeenCalled();
  });
});
