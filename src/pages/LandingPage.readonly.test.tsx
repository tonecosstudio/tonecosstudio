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
  it("renders the editorial hold without calling the recent-model Worker endpoint", () => {
    vi.stubEnv("VITE_TONART_HIDE_CATALOG_MEDIA", "true");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "true");
    const fetcher = vi.fn(() => {
      throw new Error("Home must not read Worker while media is held");
    });
    vi.stubGlobal("fetch", fetcher);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const view = render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Novidades em preparação")).toBeInTheDocument();
    expect(screen.getByText("Novas referências serão publicadas em breve."))
      .toBeInTheDocument();
    expect(screen.getByText(/Fotos em revisão para publicação/))
      .toBeInTheDocument();
    expect(screen.queryByText("Carregando referências")).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
    view.unmount();
    client.clear();
  });
});
