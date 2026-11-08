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
    expect(screen.getByRole("heading", { name: "Referências em curadoria" }))
      .toBeInTheDocument();
    expect(screen.getByText("Catálogo para consulta")).toBeInTheDocument();
    expect(screen.getByText("Fotografias em revisão")).toBeInTheDocument();
    expect(screen.getByText("Contato por e-mail")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Falar com o estúdio" }))
      .toHaveAttribute("href", "/contato");
    expect(screen.queryByText("MODELOS RECENTES")).not.toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
    expect(screen.queryByText("EXPLORAR TODOS OS MODELOS")).not.toBeInTheDocument();
    expect(screen.getByText(/Fotos em revisão para publicação/))
      .toBeInTheDocument();
    expect(screen.queryByText("Carregando referências")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /EXPLORAR MODELOS/ }))
      .toHaveAttribute("href", "/modelos");
    expect(screen.getByRole("link", { name: /CONHEÇA O ESTÚDIO/ }))
      .toHaveAttribute("href", "/sobre");
    expect(screen.queryByRole("button", { name: /EXPLORAR MODELOS|CONHEÇA O ESTÚDIO/ }))
      .not.toBeInTheDocument();
    for (const [label, route] of [["Sobre", "/sobre"], ["Contato", "/contato"], ["Termos", "/termos"], ["Privacidade", "/privacidade"]]) {
      const footerLink = screen.getByRole("link", { name: label, exact: true });
      expect(footerLink).toHaveAttribute("href", route);
      expect(footerLink).toHaveClass("text-[11px]", "text-[hsl(0,0%,68%)]");
    }
    expect(fetcher).not.toHaveBeenCalled();
    view.unmount();
    client.clear();
  });
});
