import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  listPage: vi.fn(),
  getModel: vi.fn(),
  listGallery: vi.fn(),
  mediaUrl: vi.fn(),
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
  slug: "modelo-teste",
  code: "T001",
  name: "Modelo de teste",
  variantName: "",
  category: "Cinema",
  categorySlug: "cinema",
  franchise: "Clássicos",
  franchiseSlug: "classicos",
  collection: null,
  folderPath: null,
  imageCount: 4,
  galleryVersion: 1,
  coverStorageKey: "media/test/modelo/card.webp",
};
const withoutCover = {
  ...withCover,
  id: "22222222-2222-4222-8222-222222222222",
  slug: "modelo-sem-capa",
  code: "T002",
  name: "Modelo sem capa",
  coverStorageKey: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.createGateway.mockReturnValue({
    listPage: mocks.listPage,
    getModel: mocks.getModel,
    listGallery: mocks.listGallery,
    mediaUrl: mocks.mediaUrl,
  });
  mocks.mediaUrl.mockReturnValue(
    "https://tonartstudio.com.br/catalogo-api/media/test/modelo/card.webp",
  );
  mocks.getModel.mockResolvedValue({
    ...withCover,
    description: null,
    material: null,
    heightCm: null,
  });
  mocks.listGallery.mockResolvedValue({
    items: [
      {
        id: "media-1",
        role: "cover",
        width: 900,
        height: 1400,
        bytes: 83000,
        mime: "image/webp",
        qualityScore: 0.98,
        sourceSha256: "testsha",
        variantKeys: {
          thumb: null,
          card: withCover.coverStorageKey,
          detail: null,
          original: null,
        },
      },
    ],
    total: 4,
    version: 1,
    nextCursor: "gallery-next",
  });
  mocks.listPage.mockResolvedValue({
    items: [withCover, withoutCover],
    nextCursor: null,
  });
});
afterEach(cleanup);
function show() {
  return render(
    <MemoryRouter>
      <TonartAdminCatalogReview />
    </MemoryRouter>,
  );
}

describe("TONART canonical admin catalog review", () => {
  it("loads exactly one bounded first catalog page on entering admin without a click", async () => {
    show();
    expect(
      screen.getByRole("heading", { name: "Catálogo de modelos" }),
    ).toBeInTheDocument();
    expect(mocks.createGateway).toHaveBeenCalledTimes(1);
    expect(mocks.listPage).toHaveBeenCalledTimes(1);
    expect(mocks.getModel).not.toHaveBeenCalled();
    expect(mocks.listGallery).not.toHaveBeenCalled();
    expect(await screen.findByText("Modelo sem capa")).toBeInTheDocument();
    expect(mocks.listPage).toHaveBeenCalledTimes(1);
    expect(mocks.listPage.mock.calls[0][0]).toEqual({
      search: undefined,
      limit: 12,
      cursor: undefined,
    });
  });

  it("reviews missing cover metadata locally without further catalog or image queries", async () => {
    show();
    await screen.findByText("Modelo sem capa");
    const originalCalls = mocks.listPage.mock.calls.length;
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Mostrar apenas modelos sem capa nesta página",
      }),
    );
    expect(screen.queryByText("Modelo de teste")).not.toBeInTheDocument();
    expect(screen.getByText("Modelo sem capa")).toBeInTheDocument();
    expect(
      screen.getByText(/1 sem chave de capa nesta página/),
    ).toBeInTheDocument();
    expect(mocks.listPage).toHaveBeenCalledTimes(originalCalls);
    expect(screen.getByRole("link", { name: "Abrir ficha" })).toHaveAttribute(
      "href",
      expect.stringContaining("22222222-2222-4222-8222-222222222222"),
    );
  });

  it("paginates by the canonical cursor and never prefetches next pages", async () => {
    mocks.listPage
      .mockResolvedValueOnce({
        items: [withCover],
        nextCursor: "next-page-token",
      })
      .mockResolvedValueOnce({ items: [withoutCover], nextCursor: null })
      .mockResolvedValueOnce({
        items: [withCover],
        nextCursor: "next-page-token",
      });
    show();
    await screen.findByText("Modelo de teste");
    expect(mocks.listPage).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(await screen.findByText("Modelo sem capa")).toBeInTheDocument();
    expect(mocks.listPage.mock.calls[1][0]).toMatchObject({
      limit: 12,
      cursor: "next-page-token",
    });
    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));
    await waitFor(() => expect(mocks.listPage).toHaveBeenCalledTimes(3));
    expect(mocks.listPage.mock.calls[2][0].cursor).toBeUndefined();
  });

  it("checks one selected model and first six gallery records only on request", async () => {
    show();
    await screen.findByText("Modelo de teste");
    expect(mocks.getModel).not.toHaveBeenCalled();
    expect(mocks.listGallery).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Ver imagem" })[0]);
    expect(
      screen.getByRole("img", { name: "Capa do modelo Modelo de teste" }),
    ).toBeInTheDocument();
    expect(mocks.getModel).not.toHaveBeenCalled();
    expect(mocks.listGallery).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Ver galeria (6 fotos por página)" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Galeria: Modelo de teste" }),
    ).toBeInTheDocument();
    expect(mocks.getModel).toHaveBeenCalledTimes(1);
    expect(mocks.getModel.mock.calls[0][0]).toBe("modelo-teste");
    expect(mocks.listGallery).toHaveBeenCalledTimes(1);
    expect(mocks.listGallery.mock.calls[0][1]).toMatchObject({
      version: 1,
      expectedTotal: 4,
      expectedCoverStorageKey: withCover.coverStorageKey,
      limit: 4,
    });
    expect(
      screen.getByText(/não comprova a integridade das demais versões/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Capa do modelo Modelo de teste" }),
    ).toBeInTheDocument();
    expect(mocks.listPage).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("img", { name: "Foto 1 do modelo Modelo de teste" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Fotos da galeria")).toBeInTheDocument();
    expect(
      screen.getByText("Informações técnicas (opcional)"),
    ).toBeInTheDocument();
  });

  it("checks an image-less entry without requesting its gallery", async () => {
    mocks.getModel.mockResolvedValueOnce({
      ...withoutCover,
      imageCount: 0,
      description: null,
      material: null,
      heightCm: null,
    });
    show();
    await screen.findByText("Modelo sem capa");
    fireEvent.click(screen.getAllByRole("button", { name: "Ver imagem" })[1]);
    expect(
      screen.getByText("Este modelo não possui capa cadastrada."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Ver galeria (6 fotos por página)" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Galeria: Modelo sem capa" }),
    ).toBeInTheDocument();
    expect(mocks.listGallery).not.toHaveBeenCalled();
    expect(screen.getAllByText(/sem chave de capa/i).length).toBeGreaterThan(0);
  });

  it("fetches at most six gallery records and reuses approved low-resolution URLs", async () => {
    mocks.listPage.mockResolvedValueOnce({
      items: [{ ...withCover, imageCount: 15, galleryVersion: 3 }],
      nextCursor: null,
    });
    mocks.getModel.mockResolvedValueOnce({
      ...withCover,
      imageCount: 15,
      galleryVersion: 3,
    });
    mocks.listGallery.mockResolvedValueOnce({
      items: Array.from({ length: 6 }, (_, index) => ({
        id: "image-" + index,
        role: index === 0 ? "cover" : "gallery",
        width: 400,
        height: 400,
        bytes: 12000,
        mime: "image/webp",
        qualityScore: 1,
        sourceSha256: "approved",
        variantKeys: {
          thumb: "media/test/gallery/thumb-" + index + ".webp",
          card: "media/test/gallery/card-" + index + ".webp",
          detail: null,
          original: null,
        },
      })),
      total: 15,
      version: 3,
      nextCursor: "more",
    });
    show();
    await screen.findByText("Modelo de teste");
    fireEvent.click(screen.getAllByRole("button", { name: "Ver imagem" })[0]);
    expect(mocks.listGallery).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Ver galeria (6 fotos por página)" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Galeria: Modelo de teste" }),
    ).toBeInTheDocument();
    expect(mocks.listGallery).toHaveBeenCalledExactlyOnceWith(
      "modelo-teste",
      expect.objectContaining({ limit: 6, version: 3, expectedTotal: 15 }),
      expect.anything(),
    );
    expect(screen.getAllByRole("img").length).toBe(7); // cover plus six thumbnails
    expect(
      screen.getByText("Informações técnicas (opcional)"),
    ).toBeInTheDocument();
    expect(mocks.listPage).toHaveBeenCalledTimes(1);
  });

  it("loads next and previous six-photo pages only on explicit clicks, with canonical cursors", async () => {
    mocks.listPage.mockResolvedValueOnce({
      items: [{ ...withCover, imageCount: 9, galleryVersion: 3 }],
      nextCursor: null,
    });
    mocks.getModel.mockResolvedValueOnce({
      ...withCover,
      imageCount: 9,
      galleryVersion: 3,
    });
    const img = (i: number) => ({
      id: "image-" + i,
      role: i === 0 ? "cover" : "gallery",
      width: 400,
      height: 400,
      bytes: 10000,
      mime: "image/webp",
      qualityScore: 1,
      sourceSha256: "approved",
      variantKeys: {
        thumb: i === 0 ? null : "media/test/thumb-" + i + ".webp",
        card:
          i === 0
            ? withCover.coverStorageKey
            : "media/test/card-" + i + ".webp",
        detail: null,
        original: null,
      },
    });
    mocks.listGallery
      .mockResolvedValueOnce({
        items: Array.from({ length: 6 }, (_, i) => img(i)),
        total: 9,
        version: 3,
        nextCursor: "page-two",
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: 3 }, (_, i) => img(i + 6)),
        total: 9,
        version: 3,
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        items: Array.from({ length: 6 }, (_, i) => img(i)),
        total: 9,
        version: 3,
        nextCursor: "page-two",
      });
    show();
    await screen.findByText("Modelo de teste");
    fireEvent.click(screen.getByRole("button", { name: "Ver imagem" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Ver galeria (6 fotos por página)" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Galeria: Modelo de teste" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fotos anteriores" }),
    ).toBeDisabled();
    expect(mocks.listGallery).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Próximas fotos" }));
    expect(
      await screen.findByRole("img", {
        name: "Foto 7 do modelo Modelo de teste",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Foto 1 do modelo Modelo de teste" }),
    ).not.toBeInTheDocument();
    expect(mocks.listGallery.mock.calls[1][1]).toMatchObject({
      cursor: "page-two",
      limit: 6,
      expectedTotal: 9,
      version: 3,
    });
    expect(mocks.listGallery).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("button", { name: "Próximas fotos" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Fotos anteriores" }));
    expect(
      await screen.findByRole("img", {
        name: "Foto 1 do modelo Modelo de teste",
      }),
    ).toBeInTheDocument();
    expect(mocks.listGallery.mock.calls[2][1]).toMatchObject({
      cursor: undefined,
      limit: 6,
      expectedTotal: 9,
      version: 3,
    });
    expect(mocks.listGallery).toHaveBeenCalledTimes(3);
  });

  it("preserves the current photos if the next gallery page fails", async () => {
    mocks.listPage.mockResolvedValueOnce({
      items: [{ ...withCover, imageCount: 7, galleryVersion: 2 }],
      nextCursor: null,
    });
    mocks.getModel.mockResolvedValueOnce({
      ...withCover,
      imageCount: 7,
      galleryVersion: 2,
    });
    mocks.listGallery
      .mockResolvedValueOnce({
        items: [
          {
            id: "one",
            role: "cover",
            width: 400,
            height: 400,
            bytes: 100,
            mime: "image/webp",
            qualityScore: 1,
            sourceSha256: "approved",
            variantKeys: {
              thumb: null,
              card: withCover.coverStorageKey,
              detail: null,
              original: null,
            },
          },
        ],
        total: 7,
        version: 2,
        nextCursor: "next",
      })
      .mockRejectedValueOnce(new Error("cursor expired"));
    show();
    await screen.findByText("Modelo de teste");
    fireEvent.click(screen.getByRole("button", { name: "Ver imagem" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Ver galeria (6 fotos por página)" }),
    );
    await screen.findByRole("heading", { name: "Galeria: Modelo de teste" });
    fireEvent.click(screen.getByRole("button", { name: "Próximas fotos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A página anterior foi preservada",
    );
    expect(
      screen.getByRole("img", { name: "Foto 1 do modelo Modelo de teste" }),
    ).toBeInTheDocument();
    expect(mocks.listGallery).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the detail no longer corresponds to the selected model", async () => {
    mocks.getModel.mockResolvedValueOnce({
      ...withCover,
      id: "55555555-5555-4555-8555-555555555555",
      description: null,
      material: null,
      heightCm: null,
    });
    show();
    await screen.findByText("Modelo de teste");
    fireEvent.click(screen.getAllByRole("button", { name: "Ver imagem" })[0]);
    fireEvent.click(
      screen.getByRole("button", { name: "Ver galeria (6 fotos por página)" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível verificar os metadados",
    );
    expect(mocks.listGallery).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: /Galeria:/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the real cover from the shared image component without any new D1 lookup", async () => {
    show();
    await screen.findByText("Modelo de teste");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(mocks.getModel).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Ver imagem" })[0]);
    const image = screen.getByRole("img", {
      name: "Capa do modelo Modelo de teste",
    });
    expect(image).toHaveAttribute(
      "src",
      "https://tonartstudio.com.br/catalogo-api/media/test/modelo/card.webp",
    );
    expect(mocks.mediaUrl).toHaveBeenCalledWith(withCover.coverStorageKey);
    expect(mocks.getModel).not.toHaveBeenCalled();
    expect(mocks.listGallery).not.toHaveBeenCalled();
    expect(mocks.listPage).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("button", { name: "Fechar visualização" }),
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("clears the previously selected image whenever a new catalog search starts", async () => {
    show();
    await screen.findByText("Modelo de teste");
    fireEvent.click(screen.getAllByRole("button", { name: "Ver imagem" })[0]);
    expect(
      screen.getByRole("img", { name: "Capa do modelo Modelo de teste" }),
    ).toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar modelos do catálogo" }),
      {
        target: { value: "outra busca" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Pesquisar" }));
    await waitFor(() => expect(mocks.listPage).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Capa: Modelo de teste" }),
    ).not.toBeInTheDocument();
  });

  it("displays a clear image-unavailable state when the approved image cannot load", async () => {
    show();
    await screen.findByText("Modelo de teste");
    fireEvent.click(screen.getAllByRole("button", { name: "Ver imagem" })[0]);
    fireEvent.error(
      screen.getByRole("img", { name: "Capa do modelo Modelo de teste" }),
    );
    expect(
      await screen.findByText(
        "Imagem indisponível. Não foi possível carregar a capa.",
      ),
    ).toBeInTheDocument();
    expect(mocks.getModel).not.toHaveBeenCalled();
  });

  it("does not request media if the canonical gateway disallows the cover URL", async () => {
    mocks.mediaUrl.mockReturnValueOnce(null);
    show();
    await screen.findByText("Modelo de teste");
    fireEvent.click(screen.getAllByRole("button", { name: "Ver imagem" })[0]);
    expect(
      screen.getByText(
        "Esta capa não está disponível para visualização pública.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("downloads only the current filtered page without another D1 request", async () => {
    const create = URL.createObjectURL;
    const revoke = URL.revokeObjectURL;
    const newCreate = vi.fn((_blob: Blob) => "blob:tonart-editorial-review");
    const newRevoke = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: newCreate,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: newRevoke,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    try {
      show();
      expect(
        screen.queryByRole("button", {
          name: "Baixar planilha de revisão (CSV)",
        }),
      ).not.toBeInTheDocument();
      await screen.findByText("Modelo sem capa");
      fireEvent.click(
        screen.getByRole("checkbox", {
          name: "Mostrar apenas modelos sem capa nesta página",
        }),
      );
      expect(
        screen.getByText(/A relação inclui apenas 1 modelo/),
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", {
          name: "Baixar planilha de revisão (CSV)",
        }),
      );
      expect(click).toHaveBeenCalledTimes(1);
      expect(newCreate).toHaveBeenCalledTimes(1);
      expect(newCreate.mock.calls[0][0]).toBeInstanceOf(Blob);
      expect(newRevoke).toHaveBeenCalledWith("blob:tonart-editorial-review");
      expect(mocks.listPage).toHaveBeenCalledTimes(1);
      expect(mocks.getModel).not.toHaveBeenCalled();
      expect(mocks.listGallery).not.toHaveBeenCalled();
    } finally {
      click.mockRestore();
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        writable: true,
        value: create,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        writable: true,
        value: revoke,
      });
    }
  });

  it("prepares a local name and variant proposal without an extra catalog request", async () => {
    const create = URL.createObjectURL;
    const revoke = URL.revokeObjectURL;
    const newCreate = vi.fn((_blob: Blob) => "blob:tonart-proposals");
    const newRevoke = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: newCreate,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: newRevoke,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    try {
      show();
      await screen.findByText("Modelo de teste");
      fireEvent.click(screen.getAllByRole("button", { name: "Ver imagem" })[0]);
      fireEvent.change(
        screen.getByRole("textbox", { name: "Novo nome de Modelo de teste" }),
        {
          target: { value: "Modelo revisado" },
        },
      );
      fireEvent.change(
        screen.getByRole("textbox", {
          name: "Nova variante de Modelo de teste",
        }),
        {
          target: { value: "Colecionador" },
        },
      );
      expect(
        screen.getByText((text) =>
          text.includes("1 modelo(s) com proposta local nesta página"),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: "Baixar planilha de revisão (CSV)",
        }),
      ).toBeEnabled();
      fireEvent.click(
        screen.getByRole("button", {
          name: "Baixar planilha de revisão (CSV)",
        }),
      );
      expect(click).toHaveBeenCalledOnce();
      expect(newCreate).toHaveBeenCalledOnce();
      expect(newCreate.mock.calls[0][0]).toBeInstanceOf(Blob);
      expect(newRevoke).toHaveBeenCalledWith("blob:tonart-proposals");
      expect(mocks.listPage).toHaveBeenCalledOnce();
      expect(mocks.getModel).not.toHaveBeenCalled();
      expect(mocks.listGallery).not.toHaveBeenCalled();
    } finally {
      click.mockRestore();
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        writable: true,
        value: create,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        writable: true,
        value: revoke,
      });
    }
  });

  it("blocks invalid proposal text without exporting or consulting D1", async () => {
    show();
    await screen.findByText("Modelo de teste");
    fireEvent.click(screen.getAllByRole("button", { name: "Ver imagem" })[0]);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Novo nome de Modelo de teste" }),
      {
        target: { value: "=SUM(1)" },
      },
    );
    expect(screen.getByText(/não use fórmulas/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Baixar planilha de revisão (CSV)" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pesquisar" })).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Limpar proposta deste modelo" }),
    );
    expect(screen.getByRole("button", { name: "Pesquisar" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Baixar planilha de revisão (CSV)" }),
    ).toBeEnabled();
    expect(mocks.listPage).toHaveBeenCalledOnce();
  });

  it("keeps drafts on the current bounded page until explicitly discarded", async () => {
    mocks.listPage
      .mockResolvedValueOnce({
        items: [withCover, withoutCover],
        nextCursor: "next-page",
      })
      .mockResolvedValueOnce({ items: [withCover], nextCursor: null });
    show();
    await screen.findByText("Modelo de teste");
    fireEvent.click(screen.getAllByRole("button", { name: "Ver imagem" })[0]);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Novo nome de Modelo de teste" }),
      {
        target: { value: "Modelo novo" },
      },
    );
    expect(
      screen.getByRole("button", { name: "Próxima página" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", {
        name: "Mostrar apenas modelos sem capa nesta página",
      }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Ver imagem" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Nova variante de Modelo sem capa" }),
      {
        target: { value: "Alternativa" },
      },
    );
    expect(
      screen.getByText((text) =>
        text.includes("2 modelo(s) com proposta local nesta página"),
      ),
    ).toBeInTheDocument();
    expect(mocks.listPage).toHaveBeenCalledOnce();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Descartar todas as propostas locais",
      }),
    );
    expect(
      screen.getByRole("button", { name: "Próxima página" }),
    ).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    await waitFor(() => expect(mocks.listPage).toHaveBeenCalledTimes(2));
    expect(
      screen.getByText((text) =>
        text.includes("0 modelo(s) com proposta local nesta página"),
      ),
    ).toBeInTheDocument();
  });

  it("rejects short searches locally without hitting the catalog", async () => {
    show();
    await screen.findByText("Modelo de teste");
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar modelos do catálogo" }),
      {
        target: { value: "ab" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Pesquisar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("3 a 80 caracteres");
    expect(mocks.listPage).toHaveBeenCalledTimes(1);
  });
});
