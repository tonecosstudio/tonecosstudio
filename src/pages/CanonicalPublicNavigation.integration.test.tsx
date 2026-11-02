import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/arcade/ArcadeEffects", () => ({
  FloatingParticles: () => null,
}));

vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeCard: ({ children }: { children: ReactNode }) => <article>{children}</article>,
  ArcadeHero: ({ title }: { title: string }) => <h1>{title}</h1>,
  ArcadeSectionTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  ArcadeCTA: ({ primaryAction }: { primaryAction: { href: string; label: string } }) => (
    <a href={primaryAction.href}>{primaryAction.label}</a>
  ),
}));

const BASE = "https://catalog.example.test/catalogo-api";
const model = {
  id: "model-one",
  slug: "escultura-original",
  code: "TCS-001",
  name: "Escultura original",
  variant_name: "Primeira edição",
  category: "Games",
  category_slug: "games",
  franchise: "Resident Evil",
  franchise_slug: "resident-evil",
  collection: null,
  folder_path: null,
  image_count: 1,
  gallery_version: 1,
  cover_storage_key: "covers/escultura.webp",
};

function destination() {
  const location = useLocation();
  return <p>destination: {location.pathname + location.search}</p>;
}

function setupFetch() {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit) => {
      const url = new URL(input);
      calls.push({ url, init });
      if (url.pathname.endsWith("/api/categories")) {
        return Response.json({
          items: [{ id: "games", label: "Games", count: 12 }],
        });
      }
      if (url.pathname.endsWith("/api/franchises")) {
        return Response.json({
          items: [
            { id: "resident-evil", category: "games", label: "Resident Evil", count: 7 },
          ],
          truncated: false,
        });
      }
      if (url.pathname.endsWith("/api/catalog")) {
        return Response.json({ items: [model], nextCursor: "next-page" });
      }
      throw new Error("Unexpected public catalog request");
    }),
  );
  return calls;
}

async function renderRoute(path: string) {
  const { default: LandingPage } = await import("./LandingPage");
  const { default: CatalogArcade } = await import("./CatalogArcade");
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/universo" element={<CatalogArcade />} />
          <Route path="/universo/:themeKey" element={<CatalogArcade />} />
          <Route path="/universo/:themeKey/:franchiseKey" element={<CatalogArcade />} />
          <Route path="/universo/:themeKey/:franchiseKey/:characterSlug" element={<CatalogArcade />} />
          <Route path="/modelos" element={destination()} />
          <Route path="/modelos/:id" element={destination()} />
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

describe("canonical public navigation without Supabase catalog", () => {
  it("loads categories and then bounded franchises, without a catalog-wide request", async () => {
    const calls = setupFetch();
    await renderRoute("/universo");
    const games = await screen.findByRole("link", { name: /Games/ });
    expect(games).toHaveAttribute("href", "/universo/games");
    expect(calls).toHaveLength(1);
    expect(calls[0].url.pathname).toBe("/catalogo-api/api/categories");

    fireEvent.click(games);
    const franchise = await screen.findByRole("link", { name: /Resident Evil/ });
    expect(franchise).toHaveAttribute(
      "href",
      "/modelos?category=games&franchise=resident-evil",
    );
    const request = calls.find((c) => c.url.pathname.endsWith("/api/franchises"));
    expect(request?.url.searchParams.get("category")).toBe("games");
    expect(request?.url.searchParams.get("limit")).toBe("24");
    expect(calls).toHaveLength(2);
    expect(calls.every((c) => c.init.method === "GET")).toBe(true);
    expect(calls.every((c) => c.init.credentials === "omit")).toBe(true);
  });

  it("retains legacy deep links by routing to canonically filtered models without an extra read", async () => {
    const calls = setupFetch();
    await renderRoute("/universo/games/resident-evil/ada-wong");
    expect(
      await screen.findByText("destination: /modelos?category=games&franchise=resident-evil"),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it("rejects malformed category links before fetching categories or franchises", async () => {
    const calls = setupFetch();
    await renderRoute("/universo/games%3Fadmin");
    expect(await screen.findByRole("status")).toHaveTextContent("inválida");
    expect(calls).toHaveLength(0);
  });

  it("renders six-or-fewer featured models from one canonical read and links to canonical details", async () => {
    const calls = setupFetch();
    await renderRoute("/");
    const link = await screen.findByRole("link", { name: "Ver detalhes de Escultura original" });
    expect(link).toHaveAttribute("href", "/modelos/escultura-original");
    const image = screen.getByRole("img", { name: "Referência visual de Escultura original" });
    expect(image).toHaveAttribute("src", BASE + "/covers/escultura.webp");
    expect(screen.getByRole("link", { name: /EXPLORAR TODOS OS MODELOS/ })).toHaveAttribute(
      "href",
      "/modelos",
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].url.pathname).toBe("/catalogo-api/api/catalog");
    expect(calls[0].url.searchParams.get("limit")).toBe("6");
    expect(calls[0].init.method).toBe("GET");
    expect(calls[0].init.credentials).toBe("omit");
  });

  it("fails closed on a missing canonical endpoint without any fallback query", async () => {
    vi.stubEnv("VITE_CANONICAL_CATALOG_API_BASE", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await renderRoute("/");
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("offers a real retry when the canonical categories endpoint fails", async () => {
    let attempts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        attempts++;
        return attempts === 1
          ? new Response("Unavailable", { status: 503 })
          : Response.json({ items: [{ id: "games", label: "Games", count: 2 }] });
      }),
    );
    await renderRoute("/universo");
    expect(await screen.findByRole("alert")).toHaveTextContent("acervo oficial");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(screen.getByRole("link", { name: /Games/ })).toBeInTheDocument());
    expect(attempts).toBe(2);
  });
});
