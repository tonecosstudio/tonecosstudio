import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/components/arcade/ArcadeLayout", () => ({
  ArcadeHero: ({
    badge,
    title,
    subtitle,
    compact,
  }: {
    badge: string;
    title: string;
    subtitle: string;
    compact?: boolean;
  }) => (
    <header data-compact={String(Boolean(compact))}>
      <p>{badge}</p>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
  ArcadeSectionTitle: ({ children }: { children: ReactNode }) => (
    <h2>{children}</h2>
  ),
  ArcadeCard: ({ children }: { children: ReactNode }) => (
    <article>{children}</article>
  ),
}));

vi.mock("@/components/layouts/Page", () => ({
  Page: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <header>{children}</header>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
}));

const BASE = "https://catalog.example.test/catalogo-api";
const original = {
  id: "model-one",
  slug: "escultura-original",
  code: "TCS-001",
  name: "Escultura original",
  variant_name: "",
  category: "Originais",
  category_slug: "originais",
  franchise: "Autoral",
  franchise_slug: "autoral",
  collection: null,
  folder_path: null,
  image_count: 2,
  gallery_version: 1,
  cover_storage_key: "covers/escultura.webp",
};
const second = {
  ...original,
  id: "model-two",
  slug: "escultura-seguinte",
  name: "Escultura seguinte",
  code: "TCS-002",
};

function setupFetch() {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const fetcher = vi.fn(async (input: string, init: RequestInit) => {
    const url = new URL(input);
    calls.push({ url, init });
    if (url.pathname.endsWith("/api/franchises")) {
      return Response.json({
        items: [
          { id: "autoral", label: "Autoral", count: 2, category: "originais" },
        ],
        truncated: true,
      });
    }
    if (url.pathname.endsWith("/api/categories")) {
      return Response.json({
        items: [{ id: "originais", label: "Originais", count: 2 }],
      });
    }
    if (url.pathname.endsWith("/api/catalog")) {
      return Response.json({
        items: [url.searchParams.get("cursor") ? second : original],
        nextCursor: url.searchParams.get("cursor") ? null : "page-two",
      });
    }
    throw new Error("Unexpected catalog request: " + url.toString());
  });
  vi.stubGlobal("fetch", fetcher);
  return { calls, fetcher };
}

async function renderCatalog(path = "/modelos") {
  const { default: CatalogModelsArcade } = await import(
    "./CatalogModelsArcade"
  );
  const { CatalogBrowsingProvider } = await import(
    "@/services/catalog/catalog-browsing-context"
  );
  const queryClient = new QueryClient({
    // Match the application's normal query-cache lifetime so forward/back
    // navigation can reuse a recently fetched page.
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CatalogBrowsingProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/modelos" element={<CatalogModelsArcade />} />
        </Routes>
      </MemoryRouter>
      </CatalogBrowsingProvider>
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

describe("Tonecos canonical model discovery UI", () => {
  it("shows six columns on wide screens and gives an obvious next-page action", async () => {

    const { calls } = setupFetch();
    await renderCatalog();
    const first = await screen.findByRole("link", {
      name: "Ver detalhes de Escultura original",
    });
    expect(screen.getByRole("banner")).toHaveAttribute("data-compact", "true");
    const grid = first.closest(".grid");
    expect(grid).toHaveClass("2xl:grid-cols-6");
    expect(grid).toHaveClass("xl:grid-cols-5");
    expect(grid).toHaveClass("grid-cols-2");
    expect(calls[0].url.searchParams.get("limit")).toBe("36");
    expect(screen.getByText(/Há mais modelos/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver página 2" }));
    await screen.findByRole("link", {
      name: "Ver detalhes de Escultura seguinte",
    });
    expect(screen.getByRole("button", { name: "Voltar à página 1" })).toBeEnabled();
    expect(screen.getByText("Página 2 · 1 modelos nesta página")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar à página 1" }));
    await screen.findByRole("link", {
      name: "Ver detalhes de Escultura original",
    });
    expect(calls.filter(x => x.url.pathname.endsWith("/api/catalog"))).toHaveLength(2);
  });

  it("preserves selected IDs across cursor pages without creating a commercial order", async () => {
    const { calls } = setupFetch();
    await renderCatalog();
    const firstLink = await screen.findByRole("link", {
      name: "Ver detalhes de Escultura original",
    });
    expect(firstLink).toHaveAttribute("href", "/modelos/escultura-original");
    expect(calls).toHaveLength(1);
    expect(
      calls.some((call) => call.url.pathname.endsWith("/api/categories")),
    ).toBe(false);

    fireEvent.click(
      screen.getByRole("button", { name: "Adicionar à seleção" }),
    );
    expect(screen.getByRole("button", {
      name: "Abrir seleção para orçamento com 1 modelo",
    })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remover da seleção" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));

    await screen.findByRole("link", {
      name: "Ver detalhes de Escultura seguinte",
    });
    expect(
      calls.some((call) => call.url.searchParams.get("cursor") === "page-two"),
    ).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Adicionar à seleção" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    await screen.findByRole("link", {
      name: "Ver detalhes de Escultura original",
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /Abrir seleção para orçamento com 2 modelos/,
      }),
    );
    const selection = screen.getByRole("dialog");
    expect(selection).toHaveTextContent("2 de 50 modelos selecionados.");
    expect(selection).toHaveTextContent("Escultura original");
    expect(selection).toHaveTextContent("Escultura seguinte");
    fireEvent.click(
      within(selection).getByRole("button", {
        name: "Remover Escultura original da seleção",
      }),
    );
    expect(selection).toHaveTextContent("1 de 50 modelos selecionados.");
    expect(selection).not.toHaveTextContent("Escultura original");
    expect(calls.every((call) => call.init.method === "GET")).toBe(true);
    expect(selection).toHaveTextContent("Nenhum orçamento foi enviado.");
  });

  it("blocks short searches without a request and fetches categories only after interaction", async () => {
    const { calls } = setupFetch();
    await renderCatalog("/modelos?q=ab");
    expect(screen.getByRole("status")).toHaveTextContent(
      "ao menos três caracteres",
    );
    expect(calls).toHaveLength(0);

    fireEvent.change(
      screen.getByPlaceholderText("Buscar modelos ou personagens"),
      {
        target: { value: "escultura" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await screen.findByRole("link", {
      name: "Ver detalhes de Escultura original",
    });
    expect(
      calls.some((call) => call.url.searchParams.get("q") === "escultura"),
    ).toBe(true);
    expect(
      calls.some((call) => call.url.pathname.endsWith("/api/categories")),
    ).toBe(false);

    fireEvent.focus(
      screen.getByRole("combobox", { name: "Filtrar por categoria" }),
    );
    await waitFor(() =>
      expect(
        calls.some((call) => call.url.pathname.endsWith("/api/categories")),
      ).toBe(true),
    );
    await screen.findByRole("option", { name: "Originais" });
    fireEvent.change(
      screen.getByRole("combobox", { name: "Filtrar por categoria" }),
      {
        target: { value: "originais" },
      },
    );
    await waitFor(() =>
      expect(
        calls.some(
          (call) => call.url.searchParams.get("category") === "originais",
        ),
      ).toBe(true),
    );
  });

  it("blocks excessively long direct-link searches before Worker reads", async () => {
    const { calls } = setupFetch();
    await renderCatalog("/modelos?q=" + "a".repeat(81));
    expect(screen.getByRole("status")).toHaveTextContent(
      "no máximo 80 caracteres",
    );
    expect(calls).toHaveLength(0);
  });

  it("rejects invalid catalog scope from direct links without Worker reads", async () => {
    const cases = [
      "/modelos?category=games%2Fadmin",
      "/modelos?franchise=https%3A%2F%2Fexample.test",
      "/modelos?category=games&franchise=nier&folder=..%2Fadmin",
    ];
    for (const path of cases) {
      const { calls } = setupFetch();
      const result = await renderCatalog(path);
      expect(screen.getByRole("status")).toHaveTextContent(
        "Categoria, franquia ou pasta inválida",
      );
      expect(calls).toHaveLength(0);
      result.unmount();
      vi.unstubAllGlobals();
    }
  });

  it("recovers a failed on-demand category request without a full catalog reload", async () => {
    const calls: string[] = [];
    let categoryAttempts = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: string, init: RequestInit) => {
      expect(init.method).toBe("GET");
      const url = new URL(input);
      calls.push(url.pathname);
      if (url.pathname.endsWith("/api/catalog")) {
        return Response.json({ items: [original], nextCursor: null });
      }
      if (url.pathname.endsWith("/api/categories")) {
        categoryAttempts += 1;
        return categoryAttempts === 1
          ? new Response("Unavailable", { status: 503 })
          : Response.json({
              items: [{ id: "originais", label: "Originais", count: 2 }],
            });
      }
      throw new Error("unexpected_worker_request: " + url.pathname);
    }));

    await renderCatalog();
    await screen.findByRole("link", { name: "Ver detalhes de Escultura original" });
    expect(calls).toHaveLength(1);
    fireEvent.focus(screen.getByRole("combobox", { name: "Filtrar por categoria" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar as categorias",
    );
    expect(screen.getByRole("combobox", { name: "Filtrar por categoria" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente categorias" }));
    await screen.findByRole("option", { name: "Originais" });
    expect(screen.getByRole("combobox", { name: "Filtrar por categoria" })).toBeEnabled();
    expect(categoryAttempts).toBe(2);
    expect(calls.filter(path => path.endsWith("/api/catalog"))).toHaveLength(1);
  });

  it("recovers a failed franchise request without repeating the catalog scan", async () => {
    const calls: string[] = [];
    let franchiseAttempts = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: string, init: RequestInit) => {
      expect(init.method).toBe("GET");
      const url = new URL(input);
      calls.push(url.pathname);
      if (url.pathname.endsWith("/api/catalog")) {
        return Response.json({ items: [original], nextCursor: null });
      }
      if (url.pathname.endsWith("/api/franchises")) {
        franchiseAttempts += 1;
        return franchiseAttempts === 1
          ? new Response("Unavailable", { status: 503 })
          : Response.json({
              items: [{ id: "autoral", label: "Autoral", count: 2, category: "originais" }],
              truncated: false,
            });
      }
      throw new Error("unexpected_worker_request: " + url.pathname);
    }));

    await renderCatalog();
    await screen.findByRole("link", { name: "Ver detalhes de Escultura original" });
    fireEvent.focus(screen.getByRole("combobox", { name: "Filtrar por franquia" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível consultar as franquias",
    );
    expect(screen.getByRole("combobox", { name: "Filtrar por franquia" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente franquias" }));
    await screen.findByRole("option", { name: /Autoral/ });
    expect(screen.getByRole("combobox", { name: "Filtrar por franquia" })).toBeEnabled();
    expect(franchiseAttempts).toBe(2);
    expect(calls.filter(path => path.endsWith("/api/catalog"))).toHaveLength(1);
  });

  it("fails closed without an explicitly configured HTTPS catalog origin", async () => {
    vi.stubEnv("VITE_CANONICAL_CATALOG_API_BASE", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await renderCatalog();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Catálogo em integração",
    );
    expect(
      screen.getByRole("combobox", { name: "Filtrar por categoria" }),
    ).toBeDisabled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("offers a retry after Worker errors, without rendering stale Supabase inventory", async () => {
    let attempts = 0;
    const fetcher = vi.fn(async (input: string, init: RequestInit) => {
      expect(init.method).toBe("GET");
      expect(new URL(input).pathname.endsWith("/api/catalog")).toBe(true);
      attempts += 1;
      return attempts === 1
        ? new Response("Unavailable", { status: 503 })
        : Response.json({ items: [original], nextCursor: null });
    });
    vi.stubGlobal("fetch", fetcher);
    await renderCatalog();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível consultar o acervo.",
    );
    expect(
      screen.queryByRole("link", {
        name: "Ver detalhes de Escultura original",
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByRole("link", {
      name: "Ver detalhes de Escultura original",
    });
    expect(attempts).toBe(2);
  });
});

  it("returns to the same catalog search and folder filters after opening a model", async () => {
    const startingPath =
      "/modelos?q=escultura&category=originais&franchise=autoral&folder=esculturas%2Fclassicas";
    const { calls, fetcher: listFetch } = setupFetch();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init: RequestInit) => {
        const path = new URL(input).pathname;
        if (path.endsWith("/api/models/escultura-original")) {
          return Response.json({
            ...original,
            description: null,
            material: null,
            height_cm: null,
          });
        }
        if (path.endsWith("/api/models/escultura-original/images")) {
          const makeImage = (id: string, role: "cover" | "gallery") => ({
            id,
            role,
            width: 800,
            height: 1000,
            bytes: 4096,
            mime: "image/webp",
            qualityScore: 95,
            sourceSha256: role === "cover" ? "a".repeat(64) : "b".repeat(64),
            variantKeys: {
              thumb: "media/model-one/" + id + "/thumb.webp",
              card: role === "cover" ? original.cover_storage_key : "media/model-one/" + id + "/card.webp",
              detail: "media/model-one/" + id + "/detail.webp",
              original: null,
            },
          });
          return Response.json({
            items: [makeImage("image-1", "cover"), makeImage("image-2", "gallery")],
            nextCursor: null,
            total: 2,
            version: 1,
          });
        }
        return listFetch(input, init);
      }),
    );
    const { default: Models } = await import("./CatalogModelsArcade");
    const { default: Details } = await import("./catalog/CanonicalModelDetails");
    const { CatalogBrowsingProvider } = await import(
      "@/services/catalog/catalog-browsing-context"
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <CatalogBrowsingProvider>
        <MemoryRouter initialEntries={[startingPath]}>
          <Routes>
            <Route path="/modelos" element={<Models />} />
            <Route path="/modelos/:id" element={<Details />} />
          </Routes>
        </MemoryRouter>
        </CatalogBrowsingProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole("link", { name: "Ver detalhes de Escultura original" }),
    );
    const back = await screen.findByRole("link", { name: "Voltar ao catálogo" });
    expect(back).toHaveAttribute("href", startingPath);
    fireEvent.click(back);
    await screen.findByRole("link", { name: "Ver detalhes de Escultura original" });
    expect(screen.getByRole("textbox", { name: "Pesquisar modelos" })).toHaveValue("escultura");
    expect(screen.getByRole("combobox", { name: "Filtrar por categoria" })).toHaveValue("originais");
    expect(screen.getByRole("combobox", { name: "Filtrar por franquia" })).toHaveValue("autoral");
    expect(screen.getByText(/Pasta selecionada:/)).toHaveTextContent("esculturas/classicas");
    const catalogReads = calls.filter((call) => call.url.pathname.endsWith("/api/catalog"));
    expect(catalogReads.length).toBeGreaterThan(0);
    expect(catalogReads.every(({ url }) =>
      url.searchParams.get("q") === "escultura" &&
      url.searchParams.get("category") === "originais" &&
      url.searchParams.get("franchise") === "autoral" &&
      url.searchParams.get("folder") === "esculturas/classicas"
    )).toBe(true);
  });

  it("keeps page two and a provisional selection across model detail navigation", async () => {
    const { calls, fetcher } = setupFetch();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init: RequestInit) => {
        const pathname = new URL(input).pathname;
        if (pathname.endsWith("/api/models/escultura-seguinte")) {
          return Response.json({ ...second, description: null, material: null, height_cm: null });
        }
        if (pathname.endsWith("/api/models/escultura-seguinte/images")) {
          const image = (id: string, role: "cover" | "gallery") => ({
            id, role, width: 800, height: 1000, bytes: 4096,
            mime: "image/webp", qualityScore: 92,
            sourceSha256: role === "cover" ? "a".repeat(64) : "b".repeat(64),
            variantKeys: {
              thumb: "media/model-two/" + id + "/thumb.webp",
              card: role === "cover" ? second.cover_storage_key : "media/model-two/" + id + "/card.webp",
              detail: "media/model-two/" + id + "/detail.webp",
              original: null,
            },
          });
          return Response.json({
            items: [image("image-1", "cover"), image("image-2", "gallery")],
            nextCursor: null, total: 2, version: 1,
          });
        }
        return fetcher(input, init);
      }),
    );
    const { default: Models } = await import("./CatalogModelsArcade");
    const { default: Details } = await import("./catalog/CanonicalModelDetails");
    const { CatalogBrowsingProvider } = await import(
      "@/services/catalog/catalog-browsing-context"
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <CatalogBrowsingProvider>
          <MemoryRouter initialEntries={["/modelos"]}>
            <Routes>
              <Route path="/modelos" element={<Models />} />
              <Route path="/modelos/:id" element={<Details />} />
            </Routes>
          </MemoryRouter>
        </CatalogBrowsingProvider>
      </QueryClientProvider>,
    );
    await screen.findByRole("link", { name: "Ver detalhes de Escultura original" });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar à seleção" }));
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByRole("link", { name: "Ver detalhes de Escultura seguinte" });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar à seleção" }));
    fireEvent.click(screen.getByRole("link", { name: "Ver detalhes de Escultura seguinte" }));
    expect(await screen.findByRole("button", { name: "Remover da seleção" }))
      .toHaveAttribute("aria-pressed", "true");
    const back = await screen.findByRole("link", { name: "Voltar ao catálogo" });
    expect(back).toHaveAttribute("href", "/modelos");
    fireEvent.click(back);
    await screen.findByRole("link", { name: "Ver detalhes de Escultura seguinte" });
    expect(screen.getByText("Página 2 · 1 modelos nesta página")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Remover da seleção" }))
      .toHaveAttribute("aria-pressed", "true");
    fireEvent.click(
      screen.getByRole("button", { name: /Abrir seleção para orçamento com 2 modelos/ }),
    );
    const selection = screen.getByRole("dialog");
    expect(selection).toHaveTextContent("2 de 50 modelos selecionados.");
    expect(selection).toHaveTextContent("Escultura original");
    expect(selection).toHaveTextContent("Escultura seguinte");
    expect(selection).toHaveTextContent("Nenhum orçamento foi enviado.");
    expect(calls.every(({ init }) => init.method === "GET")).toBe(true);
  });

describe("Tonecos shareable model detail UI", () => {
  it("loads a versioned gallery, selects images and pages without submitting an order", async () => {
    const requests: Array<{ url: URL; method: string }> = [];
    const image = (id: string) => ({
      id,
      role: id === "img-one" ? "cover" : "gallery",
      width: 800,
      height: 1000,
      bytes: 4096,
      mime: "image/webp",
      qualityScore: 95,
      sourceSha256: "sha-" + id,
      variantKeys: {
        thumb: "thumb/" + id + ".webp",
        card: "card/" + id + ".webp",
        detail: "detail/" + id + ".webp",
        original: null,
      },
    });
    const fetcher = vi.fn(async (input: string, init: RequestInit) => {
      const url = new URL(input);
      requests.push({ url, method: init.method ?? "" });
      if (url.pathname.endsWith("/api/models/escultura-original")) {
        return Response.json({
          ...original,
          // The Worker detail and first gallery cover must describe the same
          // published photograph; unrelated cover keys are now fail-closed.
          cover_storage_key: "card/img-one.webp",
          description: "Modelo publicado e revisado",
          height_cm: 28,
          material: "Resina",
        });
      }
      if (url.pathname.endsWith("/api/models/escultura-original/images")) {
        expect(url.searchParams.get("v")).toBe("1");
        expect(url.searchParams.get("limit")).toBe("24");
        const next = url.searchParams.get("cursor") === "gallery-two";
        return Response.json({
          items: [image(next ? "img-two" : "img-one")],
          total: 2,
          version: 1,
          nextCursor: next ? null : "gallery-two",
        });
      }
      throw new Error("Unexpected detail request: " + url);
    });
    vi.stubGlobal("fetch", fetcher);
    const { default: CanonicalModelDetails } = await import(
      "./catalog/CanonicalModelDetails"
    );
    const { CatalogBrowsingProvider } = await import(
      "@/services/catalog/catalog-browsing-context"
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <CatalogBrowsingProvider>
        <MemoryRouter initialEntries={["/modelos/escultura-original"]}>
          <Routes>
            <Route path="/modelos/:id" element={<CanonicalModelDetails />} />
          </Routes>
        </MemoryRouter>
        </CatalogBrowsingProvider>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Escultura original" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: "Ver imagem 1 de Escultura original",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("img", {
        name: "Referência visual de Escultura original",
      }),
    ).toHaveAttribute("src", BASE + "/detail/img-one.webp");
    fireEvent.click(
      screen.getByRole("button", { name: "Carregar mais imagens" }),
    );
    const secondImage = await screen.findByRole("button", {
      name: "Ver imagem 2 de Escultura original",
    });
    fireEvent.click(secondImage);
    expect(
      screen.getByRole("img", {
        name: "Referência visual de Escultura original",
      }),
    ).toHaveAttribute("src", BASE + "/detail/img-two.webp");
    expect(
      screen.getByText(/Disponibilidade e preço são confirmados pela equipe/),
    ).toBeInTheDocument();
    expect(requests.every((request) => request.method === "GET")).toBe(true);
    expect(requests).toHaveLength(3);
  });

  it("retries a failed detail request without falling back to unpublished models", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init: RequestInit) => {
        expect(init.method).toBe("GET");
        expect(
          new URL(input).pathname.endsWith("/api/models/escultura-original"),
        ).toBe(true);
        calls += 1;
        return calls === 1
          ? new Response("Not available", { status: 503 })
          : Response.json({ ...original, gallery_version: 0, image_count: 0 });
      }),
    );
    const { default: Details } = await import(
      "./catalog/CanonicalModelDetails"
    );
    const { CatalogBrowsingProvider } = await import(
      "@/services/catalog/catalog-browsing-context"
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <CatalogBrowsingProvider>
        <MemoryRouter initialEntries={["/modelos/escultura-original"]}>
          <Routes>
            <Route path="/modelos/:id" element={<Details />} />
          </Routes>
        </MemoryRouter>
        </CatalogBrowsingProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar este modelo publicado",
    );
    expect(
      screen.queryByRole("heading", { name: "Escultura original" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByRole("heading", { name: "Escultura original" }),
    ).toBeInTheDocument();
    expect(calls).toBe(2);
    expect(
      screen.getByText(/Disponibilidade e preço são confirmados pela equipe/),
    ).toBeInTheDocument();
  });

  it("makes a failed versioned gallery retryable without inventing photographs", async () => {
    let galleryCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init: RequestInit) => {
        expect(init.method).toBe("GET");
        const url = new URL(input);
        if (url.pathname.endsWith("/api/models/escultura-original")) {
          return Response.json({
            ...original,
            description: null,
            material: null,
            height_cm: null,
          });
        }
        if (url.pathname.endsWith("/api/models/escultura-original/images")) {
          galleryCalls += 1;
          return galleryCalls === 1
            ? new Response("Unavailable", { status: 503 })
            : Response.json({
                items: [],
                total: 0,
                version: 1,
                nextCursor: null,
              });
        }
        throw new Error("Unexpected request: " + url.toString());
      }),
    );
    const { default: Details } = await import(
      "./catalog/CanonicalModelDetails"
    );
    const { CatalogBrowsingProvider } = await import(
      "@/services/catalog/catalog-browsing-context"
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <CatalogBrowsingProvider>
        <MemoryRouter initialEntries={["/modelos/escultura-original"]}>
          <Routes>
            <Route path="/modelos/:id" element={<Details />} />
          </Routes>
        </MemoryRouter>
        </CatalogBrowsingProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A galeria não pôde ser carregada",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(galleryCalls).toBe(2));
    // A published model declares two images: an empty gallery on retry is
    // inconsistent, not a legitimate zero-image collection.
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A galeria não pôde ser carregada",
    );
    expect(
      screen.queryByText("Nenhuma imagem publicada nesta galeria."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Imagens publicadas").parentElement?.querySelector("dd"),
    ).toHaveTextContent("Indisponível");
  });
});

it("discovers and filters franchises on demand without catalog-wide requests", async () => {
  const { calls } = setupFetch();
  await renderCatalog("/modelos?category=originais");
  await screen.findByRole("link", {
    name: "Ver detalhes de Escultura original",
  });
  expect(
    calls.filter((c) => c.url.pathname.endsWith("/api/franchises")),
  ).toHaveLength(0);

  fireEvent.focus(
    screen.getByRole("combobox", { name: "Filtrar por franquia" }),
  );
  await waitFor(() => {
    expect(
      calls.filter((c) => c.url.pathname.endsWith("/api/franchises")),
    ).toHaveLength(1);
  });
  const first = calls.find((c) => c.url.pathname.endsWith("/api/franchises"))!;
  expect(first.url.searchParams.get("category")).toBe("originais");
  expect(first.url.searchParams.get("limit")).toBe("24");
  expect(
    await screen.findByText(/lista mostra apenas parte das franquias/i),
  ).toBeDefined();

  fireEvent.change(
    screen.getByRole("combobox", { name: "Filtrar por franquia" }),
    {
      target: { value: "autoral" },
    },
  );
  await waitFor(() => {
    expect(
      calls.some(
        (c) =>
          c.url.pathname.endsWith("/api/catalog") &&
          c.url.searchParams.get("franchise") === "autoral",
      ),
    ).toBe(true);
  });
  expect(calls.every((c) => c.init.method === "GET")).toBe(true);
});

it("only searches franchise names when explicitly requested, with an indexed bounded query", async () => {
  const { calls } = setupFetch();
  await renderCatalog("/modelos?category=originais");
  await screen.findByRole("link", {
    name: "Ver detalhes de Escultura original",
  });
  const search = screen.getByRole("textbox", { name: "Pesquisar franquias" });
  fireEvent.change(search, { target: { value: "autoral" } });
  expect(
    calls.filter((c) => c.url.pathname.endsWith("/api/franchises")),
  ).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Buscar franquias" }));
  await waitFor(() => {
    expect(
      calls.some(
        (c) =>
          c.url.pathname.endsWith("/api/franchises") &&
          c.url.searchParams.get("q") === "autoral" &&
          c.url.searchParams.get("limit") === "24",
      ),
    ).toBe(true);
  });
});

it("preserves a canonical folder filter through model reads and clears it explicitly", async () => {
  const { calls } = setupFetch();
  await renderCatalog("/modelos?category=originais&franchise=autoral&folder=personagens");
  await screen.findByRole("link", { name: "Ver detalhes de Escultura original" });
  const requests = calls.filter((c) => c.url.pathname.endsWith("/api/catalog"));
  expect(requests).toHaveLength(1);
  expect(requests[0].url.searchParams.get("category")).toBe("originais");
  expect(requests[0].url.searchParams.get("franchise")).toBe("autoral");
  expect(requests[0].url.searchParams.get("folder")).toBe("personagens");
  expect(screen.getByText(/Pasta selecionada:/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Limpar pasta" }));
  await waitFor(() => {
    expect(calls.some((c) =>
      c.url.pathname.endsWith("/api/catalog") &&
      !c.url.searchParams.has("folder")
    )).toBe(true);
  });
});

it("blocks multi-page cursor cycles but still allows revisiting the next cached page", async () => {
  const cursors: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string, init: RequestInit) => {
    expect(init.method).toBe("GET");
    const url = new URL(input);
    if (!url.pathname.endsWith("/api/catalog")) {
      throw new Error("unexpected_catalog_endpoint: " + url.pathname);
    }
    const cursor = url.searchParams.get("cursor");
    cursors.push(cursor ?? "");
    const pageIndex = cursor === null ? 1 : cursor === "page-two" ? 2 : 3;
    const model = {
      ...original,
      id: "model-" + pageIndex,
      slug: "escultura-" + pageIndex,
      name: "Escultura " + pageIndex,
      code: "TS-" + pageIndex,
    };
    return Response.json({
      items: [model],
      nextCursor: pageIndex === 1
        ? "page-two"
        : pageIndex === 2
          ? "page-three"
          : "page-two",
    });
  }));

  await renderCatalog();
  await screen.findByRole("link", { name: "Ver detalhes de Escultura 1" });
  fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
  await screen.findByRole("link", { name: "Ver detalhes de Escultura 2" });
  fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
  await screen.findByRole("link", { name: "Ver detalhes de Escultura 3" });
  expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent(
    "retornaria a uma página já visitada",
  );
  expect(cursors).toEqual(["", "page-two", "page-three"]);

  fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
  await screen.findByRole("link", { name: "Ver detalhes de Escultura 2" });
  expect(screen.getByRole("button", { name: "Próxima" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
  await screen.findByRole("link", { name: "Ver detalhes de Escultura 3" });
  expect(cursors).toEqual(["", "page-two", "page-three"]);
});

it("does not issue catalog reads when folder scope is absent", async () => {
  const { calls } = setupFetch();
  await renderCatalog("/modelos?folder=personagens");
  expect(await screen.findByText(/A pasta requer uma categoria/i)).toBeInTheDocument();
  expect(calls.filter((c) => c.url.pathname.endsWith("/api/catalog"))).toHaveLength(0);
});
