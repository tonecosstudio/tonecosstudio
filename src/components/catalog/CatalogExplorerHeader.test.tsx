import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { CatalogExplorerHeader, CatalogGridListToggle } from "./CatalogExplorerHeader";
import { CatalogCategoryBadge, CatalogCardIdentity, orderCatalogCategories } from "./CatalogTaxonomy";

function renderHeader(kind: "historical" | "review") {
  const handlers = {
    search: vi.fn(),
    change: vi.fn(),
    clear: vi.fn(),
    category: vi.fn(),
    filters: vi.fn(),
  };
  render(
    <MemoryRouter initialEntries={[kind === "review" ? "/catalogo/em-revisao" : "/catalogo/antigos"]}>
      <CatalogExplorerHeader
        kind={kind}
        search=""
        onSearchChange={handlers.change}
        onSearchSubmit={(event) => {
          event.preventDefault();
          handlers.search();
        }}
        onSearchClear={handlers.clear}
        categories={[{ id: "games", label: "Games" }]}
        category=""
        onCategoryChange={handlers.category}
        onFiltersClick={handlers.filters}
        filterCount={1}
        filtersExpanded={false}
        filtersControlId="catalog-filters"
        totalLabel="24 referências nesta página"
        collectionHref={kind === "review" ? "/catalogo/em-revisao/estudios" : "/universo"}
      />
      <div id="catalog-filters" />
    </MemoryRouter>,
  );
  return handlers;
}

describe("TONART shared catalog discovery structure", () => {
  it.each(["historical", "review"] as const)("keeps search, hero, category chips and filters together in %s", (kind) => {
    const actions = renderHeader(kind);
    const form = screen.getByRole("search", { name: "Buscar modelos no catálogo" });
    expect(within(form).getByRole("textbox", { name: "Pesquisar modelos" })).toBeInTheDocument();
    fireEvent.submit(form);
    expect(actions.search).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(kind === "review" ? "MODELOS EM REVISÃO" : "TODOS OS MODELOS");
    const filters = screen.getByRole("button", { name: "Filtros (1)" });
    expect(filters).toHaveAttribute("aria-expanded", "false");
    expect(filters).toHaveAttribute("aria-controls", "catalog-filters");
    fireEvent.click(filters);
    expect(actions.filters).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Games" }));
    expect(actions.category).toHaveBeenCalledWith("games");
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps catalog sections navigable rather than inventing favorites or pending features", () => {
    renderHeader("review");
    const tabs = screen.getByRole("navigation", { name: "Explorar catálogo" });
    expect(within(tabs).getByRole("link", { name: "Explorar" })).toHaveAttribute("href", "/catalogo/em-revisao");
    expect(within(tabs).getByRole("link", { name: "Coleções" })).toHaveAttribute("href", "/catalogo/em-revisao/estudios");
    expect(within(tabs).getByRole("link", { name: "Originais" })).toHaveAttribute("href", "/catalogo/antigos");
    expect(within(tabs).queryByRole("button", { name: /Favoritos|Novos|Minha lista/ })).not.toBeInTheDocument();
  });

  it("renders Telegram navigation without a Router in the standalone catalog", () => {
    render(
      <CatalogExplorerHeader
        kind="review"
        standalone
        search=""
        onSearchChange={() => {}}
        onSearchSubmit={(event) => event.preventDefault()}
        onSearchClear={() => {}}
        categories={[]}
        category=""
        onCategoryChange={() => {}}
        onFiltersClick={() => {}}
        collectionHref="/estudios"
      />,
    );
    const tabs = screen.getByRole("navigation", { name: "Explorar catálogo" });
    expect(within(tabs).getByRole("link", { name: "Coleções" })).toHaveAttribute("href", "/estudios");
    expect(within(tabs).getByRole("link", { name: "Explorar" })).toHaveAttribute("href", "/");
    expect(within(tabs).queryByRole("link", { name: "Originais" })).not.toBeInTheDocument();
  });

  it("orders the same category tags consistently across both sources", () => {
    const categories = [
      { id: "marvel", label: "Marvel & DC" },
      { id: "games", label: "Games" },
      { id: "anime", label: "Animes & Desenhos" },
      { id: "filmes", label: "Filmes & Séries" },
      { id: "custom", label: "Outros" },
    ];
    const snapshot = categories.map((item) => item.id);
    expect(orderCatalogCategories(categories).map((item) => item.id)).toEqual([
      "anime", "games", "filmes", "marvel", "custom",
    ]);
    expect(categories.map((item) => item.id)).toEqual(snapshot);
  });

  it("uses a single category badge and card text hierarchy for both catalogs", () => {
    render(
      <div className="relative">
        <CatalogCategoryBadge label="Games" />
        <CatalogCardIdentity name="Modelo teste" franchise="NieR" />
        <CatalogCardIdentity name="Referência Telegram" franchise="Pokémon" franchiseProvisional />
      </div>,
    );
    expect(screen.getByText("Games")).toHaveClass("absolute", "rounded-full");
    expect(screen.getByRole("heading", { name: "Modelo teste" })).toHaveClass("uppercase");
    expect(screen.getByText("NieR")).toBeInTheDocument();
    expect(screen.getByLabelText("Franquia em revisão: Pokémon")).toHaveTextContent("Pokémon · em revisão");
  });

  it("provides real list and grid actions", () => {
    const onChange = vi.fn();
    render(<CatalogGridListToggle view="grid" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Visualizar em grade" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Visualizar em lista" }));
    expect(onChange).toHaveBeenCalledWith("list");
  });
});
