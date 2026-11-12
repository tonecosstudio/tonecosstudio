import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TonecosAdminHomePage from "./TonecosAdminHomePage";

afterEach(() => cleanup());

describe("TONART administrative workspace", () => {
  it("preserves the original administrative module inventory as visible but inactive", () => {
    render(<MemoryRouter><TonecosAdminHomePage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Painel administrativo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Áreas do sistema original" })).toBeInTheDocument();
    expect(screen.getAllByText("Produção").length).toBeGreaterThan(0);
    expect(screen.getByText("Pagamentos")).toBeInTheDocument();
    expect(screen.getByText("Usuários")).toBeInTheDocument();
    expect(screen.getByText("Embalagem")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Produção" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pagamentos" })).not.toBeInTheDocument();
  });

  it("always keeps the existing Coins module visible without enabling it via navigation", () => {
    render(<MemoryRouter><TonecosAdminHomePage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Coins · Moedas" })).toBeInTheDocument();
    if (import.meta.env.VITE_TONECOS_COINS_ENABLED === "true") {
      expect(screen.getByRole("link", { name: "Administrar moedas" })).toHaveAttribute("href", "/admin/moedas");
    } else {
      expect(screen.getByText("Preservado · operações desativadas")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Administrar moedas" })).not.toBeInTheDocument();
    }
  });
});
