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
  }: {
    badge: string;
    title: string;
    subtitle: string;
  }) => (
    <header>
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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/modelos" element={<CatalogModelsArcade />} />
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

describe("Tonecos canonical model discovery UI", () => {
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
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/modelos/escultura-original"]}>
          <Routes>
            <Route path="/modelos/:id" element={<CanonicalModelDetails />} />
          </Routes>
        </MemoryRouter>
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
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/modelos/escultura-original"]}>
          <Routes>
            <Route path="/modelos/:id" element={<Details />} />
          </Routes>
        </MemoryRouter>
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
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/modelos/escultura-original"]}>
          <Routes>
            <Route path="/modelos/:id" element={<Details />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A galeria não pôde ser carregada",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByText("Nenhuma imagem publicada nesta galeria."),
    ).toBeInTheDocument();
    expect(galleryCalls).toBe(2);
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
    screen.getByText(/lista mostra apenas parte das franquias/i),
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
