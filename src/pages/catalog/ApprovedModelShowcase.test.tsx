import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ApprovedPublicRender } from "@/services/catalog/approved-public-renders";
import { ApprovedModelShowcase } from "./ApprovedModelShowcase";

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
    expect(screen.getByRole("heading", { name: "Imagens em preparação" })).toBeInTheDocument();
    expect(screen.getByText(/A TONART apresenta modelos por meio de renders digitais/)).toBeInTheDocument();
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

  it("fails closed if the Worker returns another model or another cover", async () => {
    for (const wrong of [{ ...model, id: "mdl_other" }, { ...model, coverStorageKey: "media/other/card.webp" }]) {
      const getModel = vi.fn(async () => wrong);
      const view = show({ getModel, mediaUrl: () => "https://catalog.example.test/catalogo-api/" + key }, [release]);
      await waitFor(() => expect(screen.getByText(/Nenhuma imagem sem autorização será exibida/)).toBeInTheDocument());
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      view.unmount();
    }
  });
});
