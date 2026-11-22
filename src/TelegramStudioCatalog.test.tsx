import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TelegramStudioCatalog from "./TelegramStudioCatalog";

const id = "tg_" + "a".repeat(24);
const sha = "b".repeat(64);
const media = (role: string) =>
  "/api/telegram-studios/" + id + "/media/" + sha + "/" + role;
const model = {
  id,
  name: "Aang",
  studio: "3DXM",
  variant: "Chibi",
  imageCount: 2,
  provisional: true,
  category: "Anime",
  categorySlug: "anime",
  cover: media("thumb"),
};
const detail = {
  ...model,
  images: [
    { position: 1, thumb: media("thumb"), display: media("display") },
    { position: 2, thumb: media("thumb"), display: media("display") },
  ],
};

function mockCatalog() {
  const fetcher = vi.fn(async (input: string, _options?: RequestInit) => {
    const url = new URL(String(input), "https://catalogo.tonartstudio.com.br");
    if (url.pathname.endsWith("/studios")) {
      return Response.json({ studios: [{ studio: "3DXM", total: 1 }] });
    }
    if (url.pathname.endsWith("/" + id)) return Response.json(detail);
    return Response.json({
      total: 1,
      offset: Number(url.searchParams.get("offset") || 0),
      limit: 24,
      items: [model],
    });
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
beforeEach(() => window.history.replaceState(null, "", "/"));
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("Telegram-only public studio gallery", () => {
  it("shows studio collections and shares a deep link without commercial actions", async () => {
    const fetcher = mockCatalog();
    render(<TelegramStudioCatalog />);
    expect(await screen.findByText("Aang")).toBeInTheDocument();
    expect(
      screen.queryByText(/solicitar orçamento|carrinho|cadastro|login/i),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /abrir galeria de aang/i }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(window.location.search).toContain("modelo=" + id);
    expect(
      await within(dialog).findByText("Identificação em curadoria", {
        exact: false,
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: /próxima foto/i }),
    );
    expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(window.location.search).not.toContain("modelo=");
    const requests = fetcher.mock.calls;
    expect(requests.some(([uri]) => String(uri).endsWith("/studios"))).toBe(
      false,
    );
    expect(
      requests.find(([uri]) => String(uri).includes("?offset="))?.[1]?.cache,
    ).toBe("default");
    expect(
      requests.find(([uri]) => String(uri).endsWith("/" + id))?.[1]?.cache,
    ).toBe("no-store");
  });

  it("rejects short search terms locally and passes a valid term to the canonical API", async () => {
    const fetcher = mockCatalog();
    render(<TelegramStudioCatalog />);
    await screen.findByText("Aang");
    const input = screen.getByLabelText("Pesquisar");
    fireEvent.change(input, { target: { value: "Aa" } });
    fireEvent.click(screen.getByRole("button", { name: "Pesquisar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "pelo menos 3 caracteres",
    );
    expect(
      fetcher.mock.calls.some(([uri]) => String(uri).includes("q=Aa")),
    ).toBe(false);
    fireEvent.change(input, { target: { value: "Aang" } });
    fireEvent.click(screen.getByRole("button", { name: "Pesquisar" }));
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([uri]) => String(uri).includes("q=Aang")),
      ).toBe(true),
    );
  });
  it("shows models, curadoria status and real tags without studio promotion on the main page", async () => {
    const fetcher = mockCatalog();
    render(<TelegramStudioCatalog />);
    expect(await screen.findByText("Aang")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Modelos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.queryByRole("region", { name: /coleções por estúdio/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("3DXM")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Filtrar por tag Chibi" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Em curadoria" }));
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([uri]) =>
          String(uri).includes("provisional=1"),
        ),
      ).toBe(true),
    );
    expect(window.location.search).toContain("situacao=1");
  });

  it("filters the complete library by its canonical category", async () => {
    const fetcher = mockCatalog();
    render(<TelegramStudioCatalog />);
    expect(await screen.findByText("Aang")).toBeInTheDocument();
    const categories = screen.getByRole("group", {
      name: "Categorias dos modelos",
    });
    fireEvent.click(within(categories).getByRole("button", { name: "Anime" }));
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([uri]) =>
          String(uri).includes("category=anime"),
        ),
      ).toBe(true),
    );
    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toContain("categoria=anime");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(window.location.search).not.toContain("categoria=");
  });

  it("renders unique structured chips and filters Ace by exact franchise-scoped character", async () => {
    const ace = {
      ...model,
      name: "Ace",
      character: "Ace",
      studio: "RedBushido",
      category: "Animes & Desenhos",
      categorySlug: "animes-desenhos",
      franchise: "One Piece",
      franchiseSlug: "one-piece",
      variant: "",
    };
    const fetcher = vi.fn(async () =>
      Response.json({ total: 2, offset: 0, limit: 24, items: [ace] }),
    );
    vi.stubGlobal("fetch", fetcher);
    render(<TelegramStudioCatalog />);
    const open = await screen.findByRole("button", {
      name: /abrir galeria de ace/i,
    });
    const card = open.closest("article");
    expect(card).not.toBeNull();
    expect(
      within(card!).getByRole("button", {
        name: "Filtrar por categoria Animes & Desenhos",
      }),
    ).toBeInTheDocument();
    expect(
      within(card!).getByRole("button", {
        name: "Filtrar por franquia One Piece",
      }),
    ).toBeInTheDocument();
    expect(
      within(card!).getByRole("button", { name: "Filtrar por personagem Ace" }),
    ).toBeInTheDocument();
    // The title is shown once, rather than repeating the character above itself.
    expect(within(open).getAllByText("Ace")).toHaveLength(1);
    fireEvent.click(
      within(card!).getByRole("button", { name: "Filtrar por personagem Ace" }),
    );
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([uri]) => {
          const params = new URL(
            String(uri),
            "https://catalogo.tonartstudio.com.br",
          ).searchParams;
          return (
            params.get("franchise") === "one-piece" &&
            params.get("character") === "Ace"
          );
        }),
      ).toBe(true),
    );
    expect(window.location.search).toContain("franquia=one-piece");
    expect(window.location.search).toContain("personagem=Ace");
  });

  it("lists studios alphabetically and opens a separate studio collection", async () => {
    window.history.replaceState(null, "", "/estudios");
    const sampleStudios = [
      { studio: "3DXM", total: 359 },
      { studio: "Estúdio Águia", total: 12 },
      ...Array.from({ length: 8 }, (_, index) => ({
        studio: "Outro Estúdio " + (index + 1),
        total: index + 1,
      })),
    ];
    const fetcher = vi.fn(async (input: string, _options?: RequestInit) => {
      const url = new URL(
        String(input),
        "https://catalogo.tonartstudio.com.br",
      );
      if (url.pathname.endsWith("/studios")) {
        return Response.json({ studios: sampleStudios });
      }
      return Response.json({ total: 1, offset: 0, limit: 24, items: [model] });
    });
    vi.stubGlobal("fetch", fetcher);
    render(<TelegramStudioCatalog />);
    const studioSearch = await screen.findByRole("searchbox", {
      name: /pesquisar estúdios/i,
    });
    expect(
      screen.getByRole("heading", { name: /coleções por estúdio/i }),
    ).toBeInTheDocument();
    expect(
      fetcher.mock.calls.filter(([uri]) => String(uri).includes("limit=24")),
    ).toHaveLength(0);
    expect(
      fetcher.mock.calls.find(([uri]) => String(uri).endsWith("/studios"))?.[1]
        ?.cache,
    ).toBe("default");
    fireEvent.change(studioSearch, { target: { value: "aguia" } });
    const studioSection = screen.getByRole("region", {
      name: /coleções por estúdio/i,
    });
    expect(
      await within(studioSection).findByText("1 estúdio"),
    ).toBeInTheDocument();
    const selectedStudio = within(studioSection).getByRole("button", {
      name: /estúdio águia/i,
    });
    fireEvent.click(selectedStudio);
    expect(window.location.pathname).toBe("/estudios");
    expect(window.location.search).toContain("studio=Est%C3%BAdio+%C3%81guia");
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([uri]) =>
          String(uri).includes("studio=Est%C3%BAdio+%C3%81guia"),
        ),
      ).toBe(true),
    );
    expect(await screen.findByText("Aang")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /todos os estúdios/i }),
    ).toHaveAttribute("href", "/estudios");
  });
  it("filters by a model variant tag without opening the gallery or changing to studio view", async () => {
    const fetcher = mockCatalog();
    render(<TelegramStudioCatalog />);
    expect(await screen.findByText("Aang")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Filtrar por tag Chibi" }),
    );

    await waitFor(() => {
      expect(
        fetcher.mock.calls.some(([uri]) => String(uri).includes("q=Chibi")),
      ).toBe(true);
    });
    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toContain("q=Chibi");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Pesquisar")).toHaveValue("Chibi");
  });
});
