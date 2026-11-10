import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ApprovedPublicRender } from "@/services/catalog/approved-public-renders";
import { ApprovedHomeHighlights, ApprovedModelShowcase } from "./ApprovedModelShowcase";

vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeHero: ({ badge, title }: { badge: string; title: string }) =>
    <header><p>{badge}</p><h1>{title}</h1></header>,
}));
vi.mock("@/components/catalog/CanonicalCatalogImage", () => ({
  CanonicalCatalogImage: ({ src, alt }: { src: string | null; alt: string }) =>
    src ? <img src={src} alt={alt} /> : <div>Imagem em revisão</div>,
}));

const key = "media/mdl_1234567890abcdef1234/asset_1/card.webp";
const release: ApprovedPublicRender = {
  modelId: "mdl_1234567890abcdef1234",
  slug: "escultura-original",
  coverStorageKey: key,
  provenance: "authorized-third-party-render",
  sourceFileRef: "drive:123456789012345678901234",
  sourceSha256: "a".repeat(64),
  rightsEvidenceRef: "drive:234567890123456789012345",
  rightsHolder: "Estudio autor",
  creatorCredit: "Escultor autor",
  publicationScope: "tonartstudio.com.br",
  ownerApproved: true,
  approvedOn: "2026-11-08",
};
const model = {
  id: release.modelId,
  slug: release.slug,
  coverStorageKey: release.coverStorageKey,
  code: "TCS-123",
  name: "Escultura original",
  variantName: "Modelo digital",
  category: "Originais",
  categorySlug: "originais",
  franchise: "Autoral",
  franchiseSlug: "autoral",
  collection: null,
  folderPath: null,
  imageCount: 1,
  galleryVersion: 1,
  description: null,
  material: null,
  heightCm: null,
};
function show(gateway: Parameters<typeof ApprovedModelShowcase>[0]["gateway"], releases: readonly ApprovedPublicRender[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ApprovedModelShowcase gateway={gateway} releases={releases} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TONART approved-only public showcase", () => {
  it("makes no metadata requests and shows no placeholder cards with zero releases", () => {
    const getModel = vi.fn();
    show({ getModel, mediaUrl: vi.fn() } as unknown as Parameters<typeof ApprovedModelShowcase>[0]["gateway"], []);
    expect(screen.getByRole("heading", { name: "Explore nossas referências" })).toBeInTheDocument();
    expect(screen.getByText(/As imagens do acervo são referências digitais/)).toBeInTheDocument();
    expect(getModel).not.toHaveBeenCalled();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows only an exact approved cover with creator credit and a real detail link", async () => {
    const getModel = vi.fn(async (_slug: string) => model);
    const mediaUrl = vi.fn((candidate: string | null) =>
      candidate === key ? "https://catalog.example.test/catalogo-api/" + key : null,
    );
    show({ getModel, mediaUrl }, [release]);
    await screen.findByRole("img", { name: "Render digital de Escultura original" });
    expect(screen.getByText("Render: Escultor autor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver detalhes/ })).toHaveAttribute("href", "/modelos/escultura-original");
    expect(getModel).toHaveBeenCalledTimes(1);
    expect(getModel.mock.calls[0][0]).toBe("escultura-original");
  });

  it("removes a broken approved cover card instead of showing an empty photo placeholder", async () => {
    const getModel = vi.fn(async (_slug: string) => model);
    const mediaUrl = vi.fn((candidate: string | null) =>
      candidate === key ? "https://catalog.example.test/catalogo-api/" + key : null,
    );
    show({ getModel, mediaUrl }, [release]);
    const img = await screen.findByRole("img", { name: "Render digital de Escultura original" });
    fireEvent.error(img);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver detalhes/ })).not.toBeInTheDocument();
    expect(screen.getByText(/As imagens desta seleção não estão disponíveis agora/)).toBeInTheDocument();
  });

  it("reuses exactly the same approved selection for the Home without a catalog scan", async () => {
    const getModel = vi.fn(async (_slug: string) => model);
    const mediaUrl = vi.fn((candidate: string | null) =>
      candidate === key ? "https://catalog.example.test/catalogo-api/" + key : null,
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ApprovedHomeHighlights gateway={{ getModel, mediaUrl }} releases={[release]} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { name: "Seleção do acervo" })).toBeInTheDocument();
    await screen.findByRole("img", { name: "Render digital de Escultura original" });
    expect(screen.getByRole("link", { name: "Ver todos os modelos" })).toHaveAttribute("href", "/modelos");
    expect(getModel).toHaveBeenCalledTimes(1);
    expect(getModel.mock.calls[0][0]).toBe("escultura-original");
  });

  it("does not call any model endpoint when the Home has no approved renders", () => {
    const getModel = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ApprovedHomeHighlights gateway={{ getModel, mediaUrl: () => null } as unknown as Parameters<typeof ApprovedHomeHighlights>[0]["gateway"]} releases={[]} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(getModel).not.toHaveBeenCalled();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Seleção do acervo" })).not.toBeInTheDocument();
  });

  it("fails closed if the Worker returns another model or another cover", async () => {
    for (const wrong of [{ ...model, id: "mdl_other" }, { ...model, coverStorageKey: "media/other/card.webp" }]) {
      const getModel = vi.fn(async () => wrong);
      const view = show({ getModel, mediaUrl: () => "https://catalog.example.test/catalogo-api/" + key }, [release]);
      await waitFor(() => expect(screen.getByText(/Nenhuma referência desta seleção está disponível no momento/)).toBeInTheDocument());
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      view.unmount();
    }
  });
});
