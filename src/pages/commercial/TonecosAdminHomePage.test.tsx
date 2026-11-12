import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ overview: vi.fn() }));
vi.mock("@/services/admin/tonart-admin-workspace-service", () => ({
  getTonartAdminOverview: mocks.overview,
}));
import TonecosAdminHomePage from "./TonecosAdminHomePage";

const fixture = {
  profileCount: 2,
  quoteCount: 3,
  pendingQuoteCount: 1,
  reviewingQuoteCount: 1,
  coinEntryCount: 0,
  recentProfiles: [{
    id: "11111111-1111-4111-8111-111111111111",
    email: "cliente@example.com",
    fullName: "Cliente de teste",
    createdAt: "2026-11-10T12:00:00Z",
  }],
};
beforeEach(() => { vi.clearAllMocks(); mocks.overview.mockResolvedValue(fixture); });
afterEach(() => cleanup());

describe("TONART admin workspace", () => {
  function show() {
    render(<MemoryRouter><TonecosAdminHomePage /></MemoryRouter>);
  }

  it("uses the original administrative navigation and shows real protected numbers", async () => {
    show();
    expect(screen.getByRole("heading", { name: "Painel administrativo" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Módulos administrativos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Produção/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Usuários/ })).toBeInTheDocument();
    await waitFor(() => expect(mocks.overview).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Cliente de teste")).toBeInTheDocument();
    expect(screen.getByText("Orçamentos recebidos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir atendimento" })).toHaveAttribute("href", "/admin/orcamentos");
  });

  it("opens the read-only users list without creating or granting accounts", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: /Usuários/ }));
    expect(await screen.findByRole("heading", { name: "Usuários cadastrados" })).toBeInTheDocument();
    expect(await screen.findByText("cliente@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /promover|conceder permissão|excluir/i })).not.toBeInTheDocument();
  });

  it("preserves the existing Coins module even with operations turned off", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: /Créditos/ }));
    expect(await screen.findByRole("heading", { name: "Sistema de créditos · Coins" })).toBeInTheDocument();
    if (import.meta.env.VITE_TONECOS_COINS_ENABLED !== "true") {
      expect(screen.getByText(/Operações de emissão, utilização e estorno desativadas/)).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /Abrir operações autorizadas/ })).not.toBeInTheDocument();
    }
  });

  it("shows preserved modules without pretending to enable missing operations", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: /Produção/ }));
    expect(await screen.findByText("Módulo desativado nesta implantação")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Iniciar produção/ })).not.toBeInTheDocument();
  });

  it("fails closed on dashboard query errors instead of inventing empty figures", async () => {
    mocks.overview.mockRejectedValueOnce(new Error("RLS blocked"));
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os dados administrativos");
    expect(screen.queryByText("cliente@example.com")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
