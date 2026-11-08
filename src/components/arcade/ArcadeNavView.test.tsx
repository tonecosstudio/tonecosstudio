import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";

vi.mock("@/components/arcade/CoinCounter", () => ({
  CoinCounter: () => null,
}));

import { ArcadeNavView } from "./ArcadeNavView";

function renderNavigation(startPath: string, destination: string) {
  return render(
    <MemoryRouter initialEntries={[startPath]}>
      <ArcadeNavView />
      <Link to={destination}>Navegar fora do menu</Link>
    </MemoryRouter>,
  );
}

describe("TONART shared public/mobile navigation", () => {
  it("closes the expanded menu after a route change outside the menu", async () => {
    renderNavigation("/", "/universo");
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("button", { name: "Fechar menu" }))
      .toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("link", { name: "Navegar fora do menu" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Abrir menu" }))
        .toHaveAttribute("aria-expanded", "false");
    });
  });

  it("closes the expanded menu when filters change on the same route", async () => {
    renderNavigation("/modelos", "/modelos?q=escultura");
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("button", { name: "Fechar menu" }))
      .toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("link", { name: "Navegar fora do menu" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Abrir menu" }))
        .toHaveAttribute("aria-expanded", "false");
    });
  });
});
