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
  const fetcher = vi.fn(async (input: string) => {
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
    mockCatalog();
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
  it("explores all cataloged studios with an accent-insensitive local search", async () => {
    const sampleStudios = [
      { studio: "3DXM", total: 359 },
      { studio: "Estúdio Águia", total: 12 },
      ...Array.from({ length: 8 }, (_, index) => ({
        studio: "Outro Estúdio " + (index + 1),
        total: index + 1,
      })),
    ];
    const fetcher = vi.fn(async (input: string) => {
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
    const expand = await screen.findByRole("button", {
      name: /ver todos os 10 estúdios/i,
    });
    fireEvent.click(expand);

    const studioSearch = screen.getByRole("searchbox", {
      name: /buscar estúdios/i,
    });
    fireEvent.change(studioSearch, { target: { value: "aguia" } });

    const studioSection = screen.getByRole("region", {
      name: /conheça os estúdios/i,
    });
    expect(
      within(studioSection).getByText("1 estúdio encontrado"),
    ).toBeInTheDocument();
    expect(
      within(studioSection).getByRole("button", { name: /estúdio águia/i }),
    ).toBeInTheDocument();
    expect(
      within(studioSection).queryByRole("button", { name: /outro estúdio/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(studioSection).getByRole("button", { name: /estúdio águia/i }),
    );
    await waitFor(() => {
      expect(
        fetcher.mock.calls.some(([uri]) =>
          String(uri).includes("studio=Est%C3%BAdio+%C3%81guia"),
        ),
      ).toBe(true);
    });
  });
});
