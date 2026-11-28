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
const sha2 = "c".repeat(64);
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
    {
      position: 2,
      thumb: media("thumb").replace(sha, sha2),
      display: media("display").replace(sha, sha2),
    },
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
  it("matches the original catalog card hierarchy when embedded without duplicate category tags", async () => {
    window.history.replaceState(null, "", "/catalogo/em-revisao");
    const embeddedModel = {
      ...model,
      franchise: "Avatar",
      franchiseSlug: "avatar",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const uri = String(input);
        if (uri.endsWith("/studios")) return Response.json({ studios: [] });
        return Response.json({
          total: 1,
          offset: 0,
          limit: 24,
          items: [embeddedModel],
        });
      }),
    );
    render(<TelegramStudioCatalog embedded />);
    const opener = await screen.findByRole("button", {
      name: /abrir galeria de aang/i,
    });
    const card = opener.closest("article");
    expect(card).not.toBeNull();
    expect(
      within(card!).getByRole("button", {
        name: "Filtrar por categoria Animes/Desenho",
      }),
    ).toBeInTheDocument();
    expect(within(card!).getByRole("heading", { name: "Aang" })).toHaveClass(
      "uppercase",
    );
    expect(card).toHaveClass("bg-[hsl(0,0%,7%)]");
    expect(opener).toHaveAccessibleName(/abrir galeria de aang/i);
    expect(within(card!).getByText("2 fotos")).toBeInTheDocument();
    expect(
      within(card!).getByRole("button", {
        name: "Filtrar por franquia em revisão Avatar",
      }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("group", { name: "Categorias dos modelos" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anime" })).toBeInTheDocument();
  });

  it("requests unidentified previews in the dedicated route using the shared catalog", async () => {
    window.history.replaceState(null, "", "/catalogo/a-identificar");
    const fetcher = mockCatalog();
    render(<TelegramStudioCatalog embedded />);
    expect(
      await screen.findByRole("heading", { name: "Modelos a identificar" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([uri]) =>
          String(uri).includes("identity=unidentified"),
        ),
      ).toBe(true),
    );
    expect(
      screen.getByRole("link", { name: "Catálogo em organização" }),
    ).toHaveAttribute("href", "/catalogo/em-revisao");
  });

  it("shows models immediately and keeps advanced facets collapsed until requested", async () => {
    mockCatalog();
    render(<TelegramStudioCatalog />);
    expect(await screen.findByText("Aang")).toBeInTheDocument();
    const filters = screen.getByRole("button", { name: "Filtros" });
    const panel = document.getElementById("telegram-catalog-filters");
    expect(panel).not.toBeNull();
    expect(panel).toHaveClass("hidden");
    expect(filters).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Consulte os modelos.")).not.toBeInTheDocument();
    fireEvent.click(filters);
    expect(panel).not.toHaveClass("hidden");
    expect(filters).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(filters);
    expect(panel).toHaveClass("hidden");
    expect(filters).toHaveAttribute("aria-expanded", "false");
  });

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
    expect(within(dialog).getByText("Foto 2 / 2")).toBeInTheDocument();
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

  it("isolates the full-screen model post above the catalog and restores focus and scrolling", async () => {
    mockCatalog();
    const { container } = render(<TelegramStudioCatalog />);
    const opener = await screen.findByRole("button", {
      name: /abrir galeria de aang/i,
    });
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole("dialog");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog).toHaveAttribute(
      "data-gallery-ui-contract",
      "tonart-model-gallery-v2",
    );
    expect(dialog).toHaveStyle({ backgroundColor: "#0a0e0c" });
    expect(document.body.style.overflow).toBe("hidden");
    expect(
      within(dialog).getByRole("heading", { name: "Aang" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("3DXM", { exact: true }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Fechar galeria" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText("Miniaturas da galeria"),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Fechar galeria" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(opener).toHaveFocus();
  });

  it("navigates multiple real gallery images using arrows, thumbnails and touch gestures", async () => {
    mockCatalog();
    render(<TelegramStudioCatalog />);
    fireEvent.click(
      await screen.findByRole("button", { name: /abrir galeria de aang/i }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("img", { name: "Aang, imagem 1 de 2" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Mostrar imagem 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Mostrar imagem 2" }),
    );
    expect(within(dialog).getByText("Foto 2 / 2")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("img", { name: "Aang, imagem 2 de 2" }),
    ).toHaveAttribute(
      "src",
      "/catalogo-api" + media("display").replace(sha, sha2),
    );
    expect(
      within(dialog).getByRole("button", { name: "Mostrar imagem 2" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(within(dialog).getByText("Foto 1 / 2")).toBeInTheDocument();
    const stage = within(dialog).getByRole("region", {
      name: "Fotos do modelo Aang",
    });
    const imageStage = stage.querySelector("div");
    expect(imageStage).not.toBeNull();
    fireEvent.touchStart(imageStage!, { changedTouches: [{ clientX: 280 }] });
    fireEvent.touchEnd(imageStage!, { changedTouches: [{ clientX: 80 }] });
    expect(within(dialog).getByText("Foto 2 / 2")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(within(dialog).getByText("Foto 1 / 2")).toBeInTheDocument();
  });

  it("does not show empty gallery navigation for one image and handles media failure", async () => {
    const single = { ...model, imageCount: 1 };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const path = String(input);
        if (path.endsWith("/" + id))
          return Response.json({
            ...single,
            images: [
              { position: 1, thumb: media("thumb"), display: media("display") },
            ],
          });
        return Response.json({
          total: 1,
          offset: 0,
          limit: 24,
          items: [single],
        });
      }),
    );
    render(<TelegramStudioCatalog />);
    fireEvent.click(
      await screen.findByRole("button", { name: /abrir galeria de aang/i }),
    );
    const dialog = await screen.findByRole("dialog");
    const img = await within(dialog).findByRole("img", {
      name: "Aang, imagem 1 de 1",
    });
    expect(
      within(dialog).queryByRole("button", { name: "Próxima foto" }),
    ).toBeNull();
    expect(
      within(dialog).queryByRole("button", { name: "Anterior foto" }),
    ).toBeNull();
    expect(within(dialog).queryByLabelText("Miniaturas da galeria")).toBeNull();
    fireEvent.error(img);
    expect(
      within(dialog).getByText("Não foi possível carregar esta imagem."),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Foto 1 / 1")).toBeInTheDocument();
  });

  it("opens a model deep link without losing the selected category after closing", async () => {
    window.history.replaceState(null, "", "/?categoria=anime&modelo=" + id);
    mockCatalog();
    render(<TelegramStudioCatalog />);
    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByRole("heading", { name: "Aang" }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Fechar galeria" }),
    );
    expect(window.location.search).toContain("categoria=anime");
    expect(window.location.search).not.toContain("modelo=");
  });

  it("keeps provisional franchise non-clickable on a studio gallery", async () => {
    window.history.replaceState(null, "", "/estudios?studio=3DXM");
    const provisional = {
      ...model,
      franchise: "Pokémon",
      franchiseSlug: "pokemon",
      category: "Animes & Desenhos",
      categorySlug: "animes-desenhos",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (String(input).endsWith("/studios"))
          return Response.json({ studios: [{ studio: "3DXM", total: 1 }] });
        if (String(input).endsWith("/" + id))
          return Response.json({ ...provisional, images: detail.images });
        return Response.json({
          total: 1,
          offset: 0,
          limit: 24,
          items: [provisional],
        });
      }),
    );
    render(<TelegramStudioCatalog />);
    fireEvent.click(
      await screen.findByRole("button", { name: /abrir galeria de aang/i }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByText("Pokémon · em revisão"),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Pokémon" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Animes & Desenhos" }),
    ).toBeInTheDocument();
  });

  it("rejects short search terms locally and passes a valid term to the canonical API", async () => {
    const fetcher = mockCatalog();
    render(<TelegramStudioCatalog />);
    await screen.findByText("Aang");
    const input = screen.getByRole("textbox", { name: "Pesquisar modelos" });
    fireEvent.change(input, { target: { value: "Aa" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar modelos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "pelo menos 3 caracteres",
    );
    expect(
      fetcher.mock.calls.some(([uri]) => String(uri).includes("q=Aa")),
    ).toBe(false);
    fireEvent.change(input, { target: { value: "Aang" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar modelos" }));
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([uri]) => String(uri).includes("q=Aang")),
      ).toBe(true),
    );
  });
  it("shows name and category in Modelos without studio-specific variant chips", async () => {
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
    expect(
      screen.queryByRole("button", { name: "Filtrar por tag Chibi" }),
    ).not.toBeInTheDocument();
    const card = screen
      .getByRole("button", {
        name: /abrir galeria de aang/i,
      })
      .closest("article");
    expect(card).not.toBeNull();
    expect(within(card!).getByText("Aang")).toBeInTheDocument();
    expect(within(card!).queryByText("3DXM")).toBeNull();
    expect(
      within(card!).queryByLabelText(/Variante do estúdio/),
    ).not.toBeInTheDocument();
    expect(
      within(card!).getByRole("button", {
        name: "Filtrar por categoria Animes/Desenho",
      }),
    ).toBeInTheDocument();
    expect(card).toHaveTextContent(/2 fotos/);
    expect(screen.getByText(/Acervo em atualização/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
    fireEvent.click(screen.getByRole("button", { name: "Nome provisório" }));
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([uri]) =>
          String(uri).includes("provisional=1"),
        ),
      ).toBe(true),
    );
    expect(window.location.search).toContain("situacao=1");
  });

  it("shows only category and franchise on Modelos and gallery, not studio variant or character tags", async () => {
    const approved = {
      ...model,
      category: "Animes & Desenhos",
      categorySlug: "animes-desenhos",
      franchise: "Pokémon",
      franchiseSlug: "pokemon",
      character: "Pikachu",
      provisional: false,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (String(input).endsWith("/" + id))
          return Response.json({ ...approved, images: detail.images });
        return Response.json({
          total: 1,
          offset: 0,
          limit: 24,
          items: [approved],
        });
      }),
    );
    render(<TelegramStudioCatalog />);
    const opener = await screen.findByRole("button", {
      name: /abrir galeria de aang/i,
    });
    const card = opener.closest("article");
    expect(card).not.toBeNull();
    expect(
      within(card!).getByRole("button", {
        name: "Filtrar por categoria Animes/Desenho",
      }),
    ).toBeInTheDocument();
    expect(
      within(card!).getByRole("button", {
        name: "Filtrar por franquia Pokémon",
      }),
    ).toBeInTheDocument();
    expect(
      within(card!).queryByRole("button", {
        name: /Filtrar por personagem|Filtrar por tag/,
      }),
    ).toBeNull();
    expect(within(card!).queryByText("3DXM")).toBeNull();

    fireEvent.click(opener);
    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByRole("heading", { name: "Aang" }),
    ).toBeInTheDocument();
    const classification = within(dialog).getByLabelText(
      "Classificação do modelo",
    );
    expect(
      within(classification).getByRole("button", { name: "Animes & Desenhos" }),
    ).toBeInTheDocument();
    expect(
      within(classification).getByRole("button", { name: "Pokémon" }),
    ).toBeInTheDocument();
    expect(
      within(classification).queryByRole("button", { name: "Pikachu" }),
    ).toBeNull();
    expect(within(dialog).queryByText("Versão: Chibi")).toBeNull();
    expect(
      within(dialog).getByRole("button", { name: "Copiar link deste modelo" }),
    ).toBeInTheDocument();
  });

  it("falls back to name and franchise when a model has no validated category", async () => {
    const uncategorized = {
      ...model,
      category: null,
      categorySlug: null,
      franchise: "Pokémon",
      franchiseSlug: "pokemon",
      variant: "Full Size",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (String(input).endsWith("/" + id))
          return Response.json({ ...uncategorized, images: detail.images });
        return Response.json({
          total: 1,
          offset: 0,
          limit: 24,
          items: [uncategorized],
        });
      }),
    );
    render(<TelegramStudioCatalog />);
    const opener = await screen.findByRole("button", {
      name: /abrir galeria de aang/i,
    });
    const card = opener.closest("article");
    expect(card).not.toBeNull();
    expect(within(card!).getByText("Aang")).toBeInTheDocument();
    expect(
      within(card!).getByRole("button", {
        name: "Filtrar por franquia em revisão Pokémon",
      }),
    ).toBeInTheDocument();
    expect(
      within(card!).queryByRole("button", {
        name: /Filtrar por categoria|Filtrar por tag/,
      }),
    ).toBeNull();
    expect(within(card!).queryByText("3DXM")).toBeNull();
    fireEvent.click(opener);
    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByRole("heading", { name: "Aang" }),
    ).toBeInTheDocument();
    const classification = within(dialog).getByLabelText(
      "Classificação do modelo",
    );
    expect(
      within(classification).getByText("Pokémon · em revisão"),
    ).toBeInTheDocument();
    expect(
      within(classification).queryByRole("button", { name: /Anime|Full Size/ }),
    ).toBeNull();
    expect(within(dialog).queryByText("Versão: Full Size")).toBeNull();
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

  it("renders editorial chips exclusively within the specific studio and filters Ace", async () => {
    window.history.replaceState(null, "", "/estudios?studio=RedBushido");
    const ace = {
      ...model,
      name: "Ace",
      character: "Ace",
      provisional: false,
      studio: "RedBushido",
      category: "Animes & Desenhos",
      categorySlug: "animes-desenhos",
      franchise: "One Piece",
      franchiseSlug: "one-piece",
      variant: "",
      tags: [{ kind: "character", id: "ace", label: "Ace", slug: "ace" }],
    };
    const fetcher = vi.fn(async (input: string) => {
      if (String(input).endsWith("/studios"))
        return Response.json({ studios: [{ studio: "RedBushido", total: 1 }] });
      return Response.json({ total: 2, offset: 0, limit: 24, items: [ace] });
    });
    vi.stubGlobal("fetch", fetcher);
    render(<TelegramStudioCatalog />);
    const open = await screen.findByRole("button", {
      name: /abrir galeria de ace/i,
    });
    expect(
      screen.getByRole("heading", { name: "RedBushido" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Coleções" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("2 modelos")).toBeInTheDocument();
    const card = open.closest("article");
    expect(card).not.toBeNull();
    expect(
      within(card!).getByLabelText("Variante do estúdio: Chibi"),
    ).toHaveTextContent("Chibi");
    expect(
      within(card!).getByRole("button", {
        name: "Filtrar por categoria Animes/Desenho",
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
            params.get("character_id") === "ace"
          );
        }),
      ).toBe(true),
    );
    expect(window.location.search).toContain("franquia=one-piece");
    expect(window.location.search).toContain("personagem=ace");
  });

  it("never turns a provisional sculpt title into a verified character tag on a studio card", async () => {
    window.history.replaceState(null, "", "/estudios?studio=3DXM");
    const draft = {
      ...model,
      name: "1602 Scarlet Witch Crown",
      character: "1602 Scarlet Witch Crown",
      franchise: "Marvel",
      franchiseSlug: "marvel",
      category: "Marvel & DC",
      categorySlug: "marvel-dc",
      variant: "",
      provisional: true,
    };
    const fetcher = vi.fn(async (input: string) => {
      if (String(input).endsWith("/studios"))
        return Response.json({ studios: [{ studio: "3DXM", total: 1 }] });
      return Response.json({ total: 1, offset: 0, limit: 24, items: [draft] });
    });
    vi.stubGlobal("fetch", fetcher);
    render(<TelegramStudioCatalog />);
    const open = await screen.findByRole("button", {
      name: /abrir galeria de 1602 Scarlet Witch Crown/i,
    });
    const card = open.closest("article");
    expect(card).not.toBeNull();
    expect(
      within(card!).queryByRole("button", { name: /Filtrar por personagem/i }),
    ).not.toBeInTheDocument();
    expect(
      within(card!).getByRole("button", {
        name: "Filtrar por franquia em revisão Marvel",
      }),
    ).toBeDisabled();
    expect(
      within(card!).getByRole("button", {
        name: "Filtrar por franquia em revisão Marvel",
      }),
    ).toBeDisabled();
    expect(
      within(card!).getByRole("button", {
        name: "Filtrar por categoria Marvel & DC",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/filtros confirmados e franquias sugeridas/i),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-taxonomy-contract="telegram-facets-v2"]'),
    ).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: /Filtrar por personagem/i }),
    ).not.toBeInTheDocument();
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
  it("filters by an approved canonical editorial attribute, never an inferred variant", async () => {
    window.history.replaceState(null, "", "/estudios?studio=3DXM");
    const curated = {
      ...model,
      provisional: false,
      franchise: "Avatar",
      franchiseSlug: "avatar",
      tags: [
        {
          kind: "publisher",
          id: "nickelodeon",
          label: "Nickelodeon",
          slug: "nickelodeon",
        },
      ],
    };
    const fetcher = vi.fn(async (input: string) => {
      if (String(input).endsWith("/studios"))
        return Response.json({ studios: [{ studio: "3DXM", total: 1 }] });
      return Response.json({
        total: 1,
        offset: 0,
        limit: 24,
        items: [curated],
      });
    });
    vi.stubGlobal("fetch", fetcher);
    render(<TelegramStudioCatalog />);
    const opener = await screen.findByRole("button", {
      name: /abrir galeria de aang/i,
    });
    const card = opener.closest("article");
    expect(card).not.toBeNull();
    expect(
      within(card!).queryByRole("button", { name: /Filtrar por tag Chibi/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(card!).getByRole("button", {
        name: "Filtrar por editora Nickelodeon",
      }),
    );
    expect(window.location.search).toContain("atributo=nickelodeon");
    expect(window.location.search).not.toContain("q=Chibi");
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([uri]) =>
          String(uri).includes("attribute_id=nickelodeon"),
        ),
      ).toBe(true),
    );
  });
});
