import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";

vi.mock("@/components/arcade/CoinCounter", () => ({
  CoinCounter: () => null,
}));
const signup = vi.hoisted(() => ({
  status: "disabled" as "checking" | "enabled" | "disabled",
}));
beforeEach(() => {
  signup.status = "disabled";
});

import { ArcadeNavView } from "./ArcadeNavView";

function renderNavigation(startPath: string, destination: string) {
  return render(
    <MemoryRouter initialEntries={[startPath]}>
      <ArcadeNavView signupEnabled={signup.status === "enabled"} />
      <Link to={destination}>Navegar fora do menu</Link>
    </MemoryRouter>,
  );
}

describe("TONART shared public/mobile navigation", () => {
  it("links directly to both catalog sections in desktop and mobile navigation", () => {
    renderNavigation("/catalogo/antigos", "/universo");

    expect(screen.getByRole("link", { name: "CATÁLOGOS" })).toHaveAttribute("href", "/catalogo");
    expect(screen.getByRole("link", { name: "ORIGINAIS" })).toHaveAttribute("href", "/catalogo/antigos");
    expect(screen.getByRole("link", { name: "ORIGINAIS" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "EM REVISÃO" })).toHaveAttribute("href", "/catalogo/em-revisao");
    expect(screen.getByRole("link", { name: "CATÁLOGOS" })).not.toHaveAttribute("aria-current", "page");

    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getAllByRole("link", { name: "ORIGINAIS" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "EM REVISÃO" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("link", { name: "EM REVISÃO" })[1]);
    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps mobile navigation links stacked instead of inline", () => {
    renderNavigation("/catalogo/em-revisao", "/universo");
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    const mobileMenu = document.getElementById("tonart-mobile-navigation");
    expect(mobileMenu).not.toBeNull();
    const links = [...(mobileMenu?.querySelectorAll("a") ?? [])];
    expect(links).toHaveLength(7);
    for (const link of links) {
      expect(link.classList.contains("flex")).toBe(true);
      expect(link.classList.contains("inline-flex")).toBe(false);
    }
  });

  it.each(["checking", "disabled"] as const)(
    "hides registration while Auth status is %s",
    (status) => {
      signup.status = status;
      renderNavigation("/", "/universo");
      expect(
        screen.queryByRole("link", { name: "CRIAR CONTA" }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
      expect(
        screen.queryByRole("link", { name: "CRIAR CONTA" }),
      ).not.toBeInTheDocument();
    },
  );

  it("shows registration only after the canonical Auth check enables it", () => {
    signup.status = "enabled";
    renderNavigation("/", "/universo");
    expect(screen.getByRole("link", { name: "CRIAR CONTA" })).toHaveAttribute(
      "href",
      "/login?mode=signup",
    );
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getAllByRole("link", { name: "CRIAR CONTA" })).toHaveLength(
      2,
    );
  });
  it("closes the expanded menu after a route change outside the menu", async () => {
    renderNavigation("/", "/universo");
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    fireEvent.click(screen.getByRole("link", { name: "Navegar fora do menu" }));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Abrir menu" }),
      ).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("closes the expanded menu when filters change on the same route", async () => {
    renderNavigation("/modelos", "/modelos?q=escultura");
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    fireEvent.click(screen.getByRole("link", { name: "Navegar fora do menu" }));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Abrir menu" }),
      ).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("connects the menu trigger to the mobile links and restores focus on Escape", async () => {
    renderNavigation("/modelos", "/universo");
    const trigger = screen.getByRole("button", { name: "Abrir menu" });
    expect(trigger).toHaveAttribute(
      "aria-controls",
      "tonart-mobile-navigation",
    );

    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(trigger).toHaveAttribute("aria-expanded", "false"),
    );
    expect(trigger).toHaveFocus();
  });
});
