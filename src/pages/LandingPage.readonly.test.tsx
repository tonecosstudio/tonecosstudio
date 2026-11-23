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
    expect(screen.getByRole("link", { name: /VER CATÁLOGO/ })).toHaveAttribute("href", "/catalogo");
    expect(screen.getByRole("link", { name: /CONHEÇA O ESTÚDIO/ })).toHaveAttribute("href", "/sobre");
    expect(screen.getByRole("link", { name: /Fale com a TONART/ })).toHaveAttribute("href", "/contato");
    expect(screen.queryByRole("heading", { name: /Black Friday/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Escolher modelos|Consultar meus Coins/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Referências em curadoria" })).not.toBeInTheDocument();
    view.unmount();
    client.clear();
  });

  it("shows pre-sale and the Coins wallet in the commercial MVP", () => {
    vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
    vi.stubEnv("VITE_TONECOS_COINS_ENABLED", "true");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ items: [] })));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(
      <QueryClientProvider client={client}>
        <MemoryRouter><LandingPage /></MemoryRouter>
      </QueryClientProvider>,
    );

    // Commercial shell does not authorize advertising a discount before offers exist.
    expect(screen.queryByText(/Até 50% de desconto/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Escolher modelos/ })).toHaveAttribute(
      "href",
      "/modelos?tipo=pre-venda",
    );
    expect(screen.getByRole("link", { name: /Acessar minha carteira/ })).toHaveAttribute(
      "href",
      "/moedas",
    );

    view.unmount();
    client.clear();
  });
});
