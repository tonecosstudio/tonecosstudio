import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ArcadeLab from "./ArcadeLab";

const catalog = vi.hoisted(() => ({
  state: {
    isPending: false,
    isError: false,
    data: [] as unknown[],
    refetch: vi.fn(),
  },
  hook: vi.fn(),
}));
vi.mock("@/hooks/catalog/useLandingCatalogModels", () => ({
  useLandingCatalogModels: () => {
    catalog.hook();
    return catalog.state;
  },
}));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));

function setup() {
  return render(
    <MemoryRouter>
      <ArcadeLab />
    </MemoryRouter>,
  );
}

describe("Arcade Lab", () => {
  beforeEach(() => {
    catalog.state = {
      isPending: false,
      isError: false,
      data: [],
      refetch: vi.fn(),
    };
    catalog.hook.mockClear();
  });

  it("keeps illustrative characters out of the real catalog and fetches only on request", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "Selecionar Kage" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(catalog.hook).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Catálogo real/ }));
    expect(catalog.hook).toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Selecionar Kage" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Nenhum personagem publicado",
    );
  });

  it("selects a character by keyboard and resets the selection when filtering", () => {
    setup();
    const kage = screen.getByRole("button", { name: "Selecionar Kage" });
    fireEvent.keyDown(kage, { key: "ArrowRight" });
    expect(
      screen.getByRole("button", { name: "Selecionar Ember" }),
    ).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Ember" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Metal", exact: true }));
    expect(
      within(
        screen.getByRole("group", { name: "Selecionar personagem" }),
      ).getAllByRole("button"),
    ).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "Atlas", exact: true }),
    ).toBeInTheDocument();
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Selecionar Atlas" }),
      { key: "End" },
    );
    expect(
      screen.getByRole("heading", { name: "Bolt", exact: true }),
    ).toBeInTheDocument();
  });

  it("identifies preview pieces in the details dialog without a purchase action", () => {
    setup();
    fireEvent.click(
      screen.getByRole("button", { name: /Explorar personagem/ }),
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(
      "Esta peça não está anunciada para compra",
    );
    expect(
      within(dialog).getByRole("link", { name: /Explorar catálogo real/ }),
    ).toHaveAttribute("href", "/universo");
  });

  it("shows loading and retryable errors instead of demo inventory in real mode", () => {
    catalog.state.isPending = true;
    const view = setup();
    fireEvent.click(screen.getByRole("button", { name: /Catálogo real/ }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Preparando a seleção",
    );
    catalog.state.isPending = false;
    catalog.state.isError = true;
    view.rerender(
      <MemoryRouter>
        <ArcadeLab />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "O acervo não respondeu",
    );
    fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));
    expect(catalog.state.refetch).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Selecionar Kage" }),
    ).not.toBeInTheDocument();
  });

  it("links published characters to the canonical catalog route", () => {
    catalog.state.data = [
      {
        id: "published-one",
        character_name: "Ryu",
        source_title: "Street Fighter",
        model_count: 2,
        thumbnailUrl: null,
        imageUrl: null,
      },
    ];
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Catálogo real/ }));
    expect(screen.getByRole("heading", { name: "Ryu" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ver modelos/ }).getAttribute("href"),
    ).toContain("/universo/");
    expect(screen.getByText("2 modelos no catálogo")).toBeInTheDocument();
  });
});
