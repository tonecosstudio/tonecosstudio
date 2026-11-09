import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/config/canonical-catalog-endpoint", () => ({
  CANONICAL_CATALOG_API_BASE: "https://catalog.example.test/catalogo-api/",
}));
vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ArcadeSectionTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  ArcadeCTA: () => <div>Conheça o acervo</div>,
}));
vi.mock("@/components/arcade/ArcadeEffects", () => ({
  FloatingParticles: () => null,
}));

import LandingPage from "./LandingPage";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("TONART public Home during image review", () => {
  it("keeps Home and recent-model navigation available during targeted SpecialSTL review", async () => {
    vi.stubEnv("VITE_TONART_HIDE_CATALOG_MEDIA", "true");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "true");
    const fetcher = vi.fn(async () => Response.json({ items: [] }));
    vi.stubGlobal("fetch", fetcher);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(
      <QueryClientProvider client={client}>
        <MemoryRouter><LandingPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("link", { name: /EXPLORAR MODELOS/ })).toHaveAttribute("href", "/modelos");
    expect(screen.getByRole("link", { name: /CONHEÇA O ESTÚDIO/ })).toHaveAttribute("href", "/sobre");
    expect(screen.queryByRole("heading", { name: "Referências em curadoria" })).not.toBeInTheDocument();
    view.unmount();
    client.clear();
  });
});
