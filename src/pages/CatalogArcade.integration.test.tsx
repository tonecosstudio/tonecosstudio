import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeHero: ({ title }: { title: string }) => <h1>{title}</h1>,
  ArcadeSectionTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  ArcadeCard: ({ children }: { children: ReactNode }) => <article>{children}</article>,
}));
vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const BASE = "https://catalog.example.test/catalogo-api";
const rootFranchises = Array.from({ length: 24 }, (_, i) => ({
  id: "franquia-" + (i + 1),
  label: "Franquia " + (i + 1),
  count: i === 0 ? 1 : 6,
  category: "originais",
  ...(i === 0 ? { cover_storage_key: "media/franquia-1/card.webp" } : {}),
}));

function setupFetch(
  categoryItems: Array<{ id: string; label: string; count: number; cover_storage_key?: string }> = [
    { id: "originais", label: "Originais", count: 1, cover_storage_key: "media/originais/card.webp" },
  ],
) {
  const calls: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string, init: RequestInit) => {
    expect(init.method).toBe("GET");
    const url = new URL(input);
    calls.push(url);
    if (url.pathname.endsWith("/api/categories")) {
      return Response.json({ items: categoryItems });
    }
    if (url.pathname.endsWith("/api/franchises")) {
      return Response.json(
        url.searchParams.get("q") === "dragon"
          ? { items: [{ id: "dragon", label: "Dragon", count: 3, category: "originais" }], truncated: false }
          : { items: rootFranchises, truncated: true },
      );
    }
    throw new Error("Unexpected endpoint: " + url.pathname);
  }));
  return calls;
}

async function renderUniverse(path: string) {
  const { default: CatalogArcade } = await import("./CatalogArcade");
  const queryClient = new QueryClient({
    // Keep query-cache semantics aligned with the application: a cleared
    // search may reuse a fresh category list instead of refetching it.
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/universo" element={<CatalogArcade />} />
          <Route path="/universo/:themeKey" element={<CatalogArcade />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_CANONICAL_CATALOG_API_BASE", BASE);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Tonecos canonical Universe discovery", () => {
  it("shows categories from the Worker without requesting the full model inventory", async () => {
    const calls = setupFetch();
    await renderUniverse("/universo");
    expect(await screen.findByRole("link", { name: /Originais/ })).toHaveAttribute("href", "/universo/originais");
    const categoryCard = screen.getByRole("link", { name: /Originais/ });
    expect(screen.getByText("1 modelo", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("1 modelos", { exact: true })).not.toBeInTheDocument();
    expect(calls.map(call => call.pathname)).toEqual(["/catalogo-api/api/categories"]);
  });

  it("omits the all card and keeps the Anime category title on one line", async () => {
    setupFetch([
      { id: "all", label: "Todos", count: 2575 },
      { id: "animes-desenhos", label: "Animes & Desenhos", count: 640 },
      { id: "originais", label: "Originais", count: 1 },
    ]);
    await renderUniverse("/universo");

    expect(await screen.findByRole("link", { name: "Ver todos os modelos" })).toHaveAttribute("href", "/modelos");
    expect(screen.queryByText("Todos", { exact: true })).not.toBeInTheDocument();
    const animeTitle = await screen.findByText("Animes e Desenhos", { exact: true });
    expect(animeTitle).toHaveClass(
      "whitespace-nowrap",
      "tracking-tight",
      "text-[clamp(0.5rem,3vw,0.875rem)]",
    );
    expect(animeTitle.closest("a")).toHaveAttribute("href", "/universo/animes-desenhos");
  });

  it("searches beyond the first 24 franchises only on explicit submit", async () => {
    const calls = setupFetch();
    await renderUniverse("/universo/originais");
    await screen.findByText("Franquia 24");
    expect(screen.getByText(/Exibindo parte das franquias/)).toBeInTheDocument();
    expect(calls).toHaveLength(2);
    fireEvent.change(screen.getByRole("searchbox", { name: "Nome da franquia" }), {
      target: { value: "dragon" },
    });
    expect(calls).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Buscar franquias" }));
    expect(await screen.findByRole("link", { name: /Dragon/ })).toHaveAttribute(
      "href",
      "/universo/originais/dragon",
    );
    await waitFor(() =>
      expect(calls.filter((call) => call.pathname.endsWith("/api/franchises"))).toHaveLength(2),
    );
    const franchiseCalls = calls.filter((call) => call.pathname.endsWith("/api/franchises"));
    expect(franchiseCalls[1].searchParams.get("q")).toBe("dragon");
    expect(franchiseCalls[1].searchParams.get("limit")).toBe("24");
    expect(calls.filter((call) => call.pathname.endsWith("/api/categories"))).toHaveLength(1);
    fireEvent.click(screen.getByRole("link", { name: "Limpar busca" }));
    await screen.findByText("Franquia 24");
    expect(calls.filter((call) => call.pathname.endsWith("/api/franchises"))).toHaveLength(2); // React Query reuses the first page.
  });

  it("keeps a category navigable after its published cover fails", async () => {
    const calls = setupFetch();
    await renderUniverse("/universo");
    const cover = await screen.findByRole("img", { name: "Prévia de Originais" });
    fireEvent.error(cover);
    expect(screen.queryByRole("img", { name: "Prévia de Originais" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Originais/ })).toHaveAttribute("href", "/universo/originais");
    expect(calls).toHaveLength(1);
  });

  it("keeps a franchise navigable after its published cover fails", async () => {
    const calls = setupFetch();
    await renderUniverse("/universo/originais");
    const cover = await screen.findByRole("img", { name: "Prévia de Franquia 1" });
    fireEvent.error(cover);
    expect(screen.queryByRole("img", { name: "Prévia de Franquia 1" })).not.toBeInTheDocument();
    // Match the exact card title, not "Franquia 10" through "Franquia 19".
    expect(screen.getByText("Franquia 1").closest("a")).toHaveAttribute(
      "href",
      "/universo/originais/franquia-1",
    );
    expect(calls).toHaveLength(2);
  });

  it("formats a singular model count for a canonical franchise", async () => {
    setupFetch();
    await renderUniverse("/universo/originais");
    await screen.findByText("Franquia 24");

    const franchiseCard = screen.getByText("Franquia 1").closest("a");
    expect(franchiseCard).toHaveAttribute("href", "/universo/originais/franquia-1");
    expect(screen.getByText("1 modelo", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("1 modelos", { exact: true })).not.toBeInTheDocument();
  });

  it("blocks short direct-link searches before any franchise request", async () => {
    const calls = setupFetch();
    await renderUniverse("/universo/originais?q=ab");
    expect(await screen.findByText(/Pesquise franquias usando de 3 a 80 caracteres/)).toBeInTheDocument();
    expect(calls.filter((call) => call.pathname.endsWith("/api/franchises"))).toHaveLength(0);
    expect(calls.filter((call) => call.pathname.endsWith("/api/categories"))).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Buscar franquias" })).toBeDisabled();
  });
});
