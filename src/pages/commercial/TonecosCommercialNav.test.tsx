import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CatalogBrowsingProvider } from "@/services/catalog/catalog-browsing-context";
import TonecosCommercialNav from "./TonecosCommercialNav";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TONART responsive commercial navigation", () => {
  function show() {
    return render(
      <MemoryRouter>
        <CatalogBrowsingProvider>
          <TonecosCommercialNav />
        </CatalogBrowsingProvider>
      </MemoryRouter>,
    );
  }

  it("keeps a single link collection hidden on narrow screens until requested", () => {
    show();
    const toggle = screen.getByRole("button", { name: "Abrir menu" });
    const links = document.getElementById("tonart-commercial-nav-links");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute(
      "aria-controls",
      "tonart-commercial-nav-links",
    );
    expect(links).toHaveClass("hidden", "lg:flex", "w-full", "lg:w-auto");
    expect(
      screen.getAllByRole("link", { name: "Modelos", hidden: true }),
    ).toHaveLength(1);
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(links).toHaveClass("flex", "w-full");
    expect(links).not.toHaveClass("hidden");
    fireEvent.click(screen.getByRole("link", { name: "Modelos" }));
    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(links).toHaveClass("hidden");
  });
});
