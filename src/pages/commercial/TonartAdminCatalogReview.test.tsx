import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  listPage: vi.fn(),
  getModel: vi.fn(),
  listGallery: vi.fn(),
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
  mocks.createGateway.mockReturnValue({
    listPage: mocks.listPage,
    getModel: mocks.getModel,
    listGallery: mocks.listGallery,
  });
  mocks.getModel.mockResolvedValue({
    ...withCover, description: null, material: null, heightCm: null,
  });
  mocks.listGallery.mockResolvedValue({
    items: [{
      id: "media-1", role: "cover", width: 900, height: 1400, bytes: 83000,
      mime: "image/webp", qualityScore: 0.98, sourceSha256: "testsha",
      variantKeys: {
        thumb: null, card: withCover.coverStorageKey,
        detail: null, original: null,
      },
    }],
    total: 4, version: 1, nextCursor: "gallery-next",
  });
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
    expect(mocks.getModel).not.toHaveBeenCalled();
    expect(mocks.listGallery).not.toHaveBeenCalled();
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

  it("checks one selected model and first six gallery records only on request", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Carregar modelos" }));
    await screen.findByText("Modelo de teste");
    expect(mocks.getModel).not.toHaveBeenCalled();
    expect(mocks.listGallery).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Verificar mídia" })[0]);
    expect(await screen.findByRole("heading", { name: "Revisão: Modelo de teste" })).toBeInTheDocument();
    expect(mocks.getModel).toHaveBeenCalledTimes(1);
    expect(mocks.getModel.mock.calls[0][0]).toBe("modelo-teste");
    expect(mocks.listGallery).toHaveBeenCalledTimes(1);
    expect(mocks.listGallery.mock.calls[0][1]).toMatchObject({
      version: 1, expectedTotal: 4, expectedCoverStorageKey: withCover.coverStorageKey,
      limit: 4,
    });
    expect(screen.getByText(/não comprova a entrega física dos arquivos/)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(mocks.listPage).toHaveBeenCalledTimes(1);
  });

  it("checks an image-less entry without requesting its gallery", async () => {
    mocks.getModel.mockResolvedValueOnce({
      ...withoutCover, imageCount: 0, description: null, material: null, heightCm: null,
    });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Carregar modelos" }));
    await screen.findByText("Modelo sem capa");
    fireEvent.click(screen.getAllByRole("button", { name: "Verificar mídia" })[1]);
    expect(await screen.findByRole("heading", { name: "Revisão: Modelo sem capa" })).toBeInTheDocument();
    expect(mocks.listGallery).not.toHaveBeenCalled();
    expect(screen.getByText(/sem chave de capa/)).toBeInTheDocument();
  });

  it("fails closed when the detail no longer corresponds to the selected model", async () => {
    mocks.getModel.mockResolvedValueOnce({
      ...withCover, id: "55555555-5555-4555-8555-555555555555",
      description: null, material: null, heightCm: null,
    });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Carregar modelos" }));
    await screen.findByText("Modelo de teste");
    fireEvent.click(screen.getAllByRole("button", { name: "Verificar mídia" })[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível verificar os metadados");
    expect(mocks.listGallery).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: /Revisão:/ })).not.toBeInTheDocument();
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
