import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ overview: vi.fn() }));
vi.mock("@/services/admin/overview/tonart-admin-workspace-service", () => ({
  getTonartAdminOverview: mocks.overview,
}));
import TonecosAdminHomePage from "./TonecosAdminHomePage";

const fixture = {
  profileCount: 2,
  quoteCount: 3,
  pendingQuoteCount: 1,
  reviewingQuoteCount: 1,
  coinEntryCount: 0,
  answeredQuoteCount: 1,
  archivedQuoteCount: 0,
  pricedQuoteCount: 1,
  quotedTotalCents: 24990,
  recentQuotes: [],
  recentCoinEntries: [],
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
  function show(path = "/admin") {
    render(<MemoryRouter initialEntries={[path]}><TonecosAdminHomePage /></MemoryRouter>);
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
    if (import.meta.env.VITE_CATALOG_QUOTES_ENABLED === "true") {
      expect(screen.getByRole("link", { name: "Abrir atendimento" })).toHaveAttribute("href", "/admin/orcamentos");
    } else {
      expect(screen.getByText("Operação de orçamentos desativada")).toBeInTheDocument();
    }
  });

  it("does not query Supabase aggregates when opening the Cloudflare catalog", async () => {
    show("/admin/catalogo");
    expect(await screen.findByRole("heading", { name: "Catálogo de modelos" })).toBeInTheDocument();
    expect(mocks.overview).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Atualizar dados" })).not.toBeInTheDocument();
    expect(screen.queryByText("Consultando dados administrativos...")).not.toBeInTheDocument();
  });

  it("opens the read-only users list without creating or granting accounts", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: /Usuários/ }));
    expect(await screen.findByRole("heading", { name: "Usuários cadastrados" })).toBeInTheDocument();
    expect(await screen.findByText("cliente@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /promover|conceder permissão|excluir/i })).not.toBeInTheDocument();
  });

  it("supports direct original admin URLs and browser reload on the same section", async () => {
    show("/admin/users");
    expect(await screen.findByRole("heading", { name: "Usuários cadastrados" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Usuários/ })).toHaveAttribute("aria-current", "page");
  });

  it("opens original Coins route directly without enabling emission", async () => {
    show("/admin/creditos");
    expect(await screen.findByRole("heading", { name: "Sistema de créditos · Coins" })).toBeInTheDocument();
    expect(await screen.findByText("Nenhuma movimentação registrada.")).toBeInTheDocument();
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

  it("shows a read-only ledger for original Coins even while crediting is disabled", async () => {
    mocks.overview.mockResolvedValueOnce({
      ...fixture,
      coinEntryCount: 1,
      recentCoinEntries: [{
        id: "22222222-2222-4222-8222-222222222222",
        userId: "11111111-1111-4111-8111-111111111111",
        userEmail: "cliente@example.com",
        type: "admin_credit",
        delta: 12,
        reason: "Crédito administrativo confirmado",
        createdAt: "2026-11-11T13:00:00Z",
      }],
    });
    show();
    fireEvent.click(screen.getByRole("button", { name: /Créditos/ }));
    expect(await screen.findByText("Crédito administrativo confirmado")).toBeInTheDocument();
    expect(screen.getByText("cliente@example.com")).toBeInTheDocument();
    expect(screen.getByText("+12")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Histórico de movimentações" })).toBeInTheDocument();
    if (import.meta.env.VITE_TONECOS_COINS_ENABLED !== "true") {
      expect(screen.queryByRole("link", { name: "Abrir operações autorizadas" })).not.toBeInTheDocument();
    }
  });

  it("shows actual quote requests under Pedidos without presenting them as paid orders", async () => {
    mocks.overview.mockResolvedValueOnce({
      ...fixture,
      recentQuotes: [{
        id: "33333333-3333-4333-8333-333333333333",
        customerEmail: "comprador@example.com",
        createdAt: "2026-11-11T18:00:00Z",
        modelCount: 2,
        status: "answered",
        quotedAmountCents: 24990,
      }],
    });
    show("/admin/pedidos");
    expect(await screen.findByRole("heading", { name: "Solicitações recebidas" })).toBeInTheDocument();
    expect(await screen.findByText("comprador@example.com")).toBeInTheDocument();
    expect(screen.getByText(new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(249.90))).toBeInTheDocument();
    expect(screen.getByText(/não equivale a confirmar um pedido/)).toBeInTheDocument();
  });

  it("shows a financial quote summary without calling quotations revenue or payments", async () => {
    show("/admin/financeiro");
    expect(await screen.findByRole("heading", { name: "Visão de valores orçados" })).toBeInTheDocument();
    expect(await screen.findByText(new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(249.90))).toBeInTheDocument();
    expect(screen.getByText(/valores informados não são faturamento/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cobrar|confirmar pagamento/i })).not.toBeInTheDocument();
  });

  it("connects the existing communication section to real pending quotes without automatic email sending", async () => {
    const id = "33333333-3333-4333-8333-333333333333";
    mocks.overview.mockResolvedValueOnce({
      ...fixture,
      recentQuotes: [{
        id, customerEmail: "cliente@example.com",
        createdAt: "2026-11-11T18:00:00Z", modelCount: 2,
        status: "pending", quotedAmountCents: null,
      }],
    });
    show("/admin/comunicacao");
    expect(screen.getAllByRole("heading", { name: "Central de Comunicação" }).length).toBeGreaterThan(0);
    expect(await screen.findByText("Solicitação #33333333")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Preparar e-mail para cliente@example.com" }))
      .toHaveAttribute("href", expect.stringMatching(/^mailto:/));
    const link = screen.queryByRole("link", { name: "Abrir solicitação #33333333" });
    if (import.meta.env.VITE_CATALOG_QUOTES_ENABLED === "true") {
      expect(link).toHaveAttribute("href", "/admin/orcamentos?quote=" + id);
    } else {
      expect(link).not.toBeInTheDocument();
    }
    expect(screen.getByText(/não envia e-mails automaticamente/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enviar e-mail/i })).not.toBeInTheDocument();
  });

  it("keeps the communication module usable when no recent contact exists", async () => {
    mocks.overview.mockResolvedValueOnce({
      ...fixture, recentQuotes: [],
    });
    show("/admin/comunicacao");
    expect(await screen.findByText("Não há atendimentos em aberto entre as últimas solicitações.")).toBeInTheDocument();
    expect(screen.getByText(/As quantidades acima consideram a base completa/)).toBeInTheDocument();
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
