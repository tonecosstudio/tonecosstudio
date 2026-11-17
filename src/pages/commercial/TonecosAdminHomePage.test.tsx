import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  overview: vi.fn(),
  profiles: vi.fn(),
}));
vi.mock("@/services/admin/overview/tonart-admin-workspace-service", () => ({
  getTonartAdminOverview: mocks.overview,
}));
vi.mock("@/services/admin/overview/tonart-admin-profiles-service", () => ({
  listTonartAdminProfiles: mocks.profiles,
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
  recentProfiles: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      email: "cliente@example.com",
      fullName: "Cliente de teste",
      createdAt: "2026-11-10T12:00:00Z",
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.overview.mockResolvedValue(fixture);
  mocks.profiles.mockResolvedValue({
    total: 1,
    limit: 25,
    offset: 0,
    rows: fixture.recentProfiles,
  });
});
afterEach(() => cleanup());

describe("TONART admin workspace", () => {
  function show(path = "/admin") {
    render(
      <MemoryRouter initialEntries={[path]}>
        <TonecosAdminHomePage />
      </MemoryRouter>,
    );
  }

  it("uses the original administrative navigation and shows real protected numbers", async () => {
    show();
    expect(
      screen.getByRole("heading", { name: "Painel administrativo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Módulos administrativos" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Produção/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Usuários/ }),
    ).toBeInTheDocument();
    await waitFor(() => expect(mocks.overview).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Cliente de teste")).toBeInTheDocument();
    expect(screen.getByText("cliente@example.com")).toBeInTheDocument();
    expect(screen.getByText("Orçamentos recebidos")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Abrir atendimento" }),
    ).toHaveAttribute("href", "/admin/orcamentos");
  });

  it("keeps quote intake in the restored sidebar without creating a second backoffice", async () => {
    show();
    const navigation = screen.getByRole("navigation", {
      name: "Módulos administrativos",
    });
    expect(
      within(navigation).getByRole("button", {
        name: /Atendimento de orçamentos/,
      }),
    ).toBeInTheDocument();
    expect(
      within(navigation).getByRole("button", { name: /Produção/ }),
    ).toHaveTextContent("Consulta");
    expect(
      within(navigation).getByRole("button", { name: /Análises/ }),
    ).toHaveTextContent("Consulta");
    expect(within(navigation).getByRole("button", { name: /Créditos/ })).toBeInTheDocument();
    expect(await screen.findByText("Cliente de teste")).toBeInTheDocument();
  });

  it("counts pending and reviewing quotes as work in progress", async () => {
    show();
    expect(await screen.findByText("Cliente de teste")).toBeInTheDocument();
    expect(screen.getByText("Em atendimento")).toBeInTheDocument();
    const metric = screen.getByText("Em atendimento").closest("div");
    expect(metric).toHaveTextContent("2");
    expect(metric).toHaveTextContent("Aguardando resposta ou em análise");
  });

  it("links each recent pending quote to the same protected response page", async () => {
    const pendingId = "22222222-2222-4222-8222-222222222222";
    const reviewingId = "33333333-3333-4333-8333-333333333333";
    mocks.overview.mockResolvedValueOnce({
      ...fixture,
      recentQuotes: [
        {
          id: reviewingId,
          status: "reviewing",
          customerEmail: "review@example.com",
          createdAt: "2026-11-12T10:00:00Z",
          quotedAmountCents: null,
          modelCount: 1,
        },
        {
          id: pendingId,
          status: "pending",
          customerEmail: "new@example.com",
          createdAt: "2026-11-13T10:00:00Z",
          quotedAmountCents: null,
          modelCount: 2,
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          status: "answered",
          customerEmail: "answered@example.com",
          createdAt: "2026-11-11T10:00:00Z",
          quotedAmountCents: 24990,
          modelCount: 1,
        },
      ],
    });
    show();
    const queue = await screen.findByRole("list", {
      name: "Solicitações para atendimento",
    });
    expect(
      within(queue).getAllByRole("link").map((link) => link.getAttribute("href")),
    ).toEqual([
      "/admin/orcamentos?quote=" + pendingId,
      "/admin/orcamentos?quote=" + reviewingId,
    ]);
    expect(within(queue).queryByText("answered@example.com")).not.toBeInTheDocument();
    expect(screen.getByText(/somente as 25 solicitações mais recentes/)).toBeInTheDocument();
  });

  it("does not claim the queue is empty when pending requests are outside the recent sample", async () => {
    mocks.overview.mockResolvedValueOnce({
      ...fixture,
      recentQuotes: [],
    });
    show();
    expect(await screen.findByText(/fora das 25 mais recentes/)).toBeInTheDocument();
    expect(
      screen.queryByRole("list", {
        name: "Solicitações para atendimento",
      }),
    ).not.toBeInTheDocument();
  });

  it("does not query Supabase aggregates when opening the Cloudflare catalog", async () => {
    show("/admin/catalogo");
    expect(
      await screen.findByRole("heading", { name: "Catálogo de modelos" }),
    ).toBeInTheDocument();
    expect(mocks.overview).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Atualizar dados" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Consultando dados administrativos..."),
    ).not.toBeInTheDocument();
  });

  it("opens the read-only users list without creating or granting accounts", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: /Usuários/ }));
    expect(
      await screen.findByRole("heading", { name: "Usuários cadastrados" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("cliente@example.com")).toBeInTheDocument();
    expect(mocks.profiles).toHaveBeenCalledWith({
      search: "",
      limit: 25,
      offset: 0,
    });
    expect(
      screen.queryByRole("button", {
        name: /promover|conceder permissão|excluir/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("supports direct original admin URLs and browser reload on the same section", async () => {
    show("/admin/users");
    expect(
      await screen.findByRole("heading", { name: "Usuários cadastrados" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Usuários/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await waitFor(() => expect(mocks.profiles).toHaveBeenCalledTimes(1));
    expect(mocks.overview).not.toHaveBeenCalled();
  });

  it("searches the complete protected user directory instead of filtering only recent profiles", async () => {
    show("/admin/users");
    await screen.findByText("cliente@example.com");
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar em todos os perfis" }), {
      target: { value: "Cliente" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() =>
      expect(mocks.profiles).toHaveBeenLastCalledWith({
        search: "Cliente",
        limit: 25,
        offset: 0,
      }),
    );
  });

  it("fails closed when the protected user directory is unavailable", async () => {
    mocks.profiles.mockRejectedValueOnce(new Error("RLS blocked"));
    show("/admin/users");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar a lista de usuários",
    );
    expect(screen.queryByText("cliente@example.com")).not.toBeInTheDocument();
  });

  it("opens the original Coins module from the commercial administration", async () => {
    show("/admin/creditos");
    expect(await screen.findByRole("heading", { name: "Sistema de créditos · Coins" })).toBeInTheDocument();
    expect(await screen.findByText("Nenhuma movimentação registrada.")).toBeInTheDocument();
  });

  it("exposes Coins in commercial administration", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: /Créditos/ }));
    expect(await screen.findByRole("heading", { name: "Sistema de créditos · Coins" })).toBeInTheDocument();
  });

  it("shows protected quote status on the restored production board without treating quotes as manufactured products", async () => {
    mocks.overview.mockResolvedValueOnce({
      ...fixture,
      recentQuotes: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          status: "reviewing",
          customerEmail: "cliente@example.com",
          createdAt: "2026-11-13T10:00:00Z",
          quotedAmountCents: null,
          modelCount: 2,
        },
      ],
    });
    show("/admin/producao/kanban");
    expect(
      await screen.findByText(/Um orçamento não representa ordem de fabricação/),
    ).toBeInTheDocument();
    expect(await screen.findByText("Solicitação #22222222")).toBeInTheDocument();
    expect(mocks.overview).toHaveBeenCalledTimes(1);
  });

  it("shows the restored communication history as quote responses, not sent email history", async () => {
    mocks.overview.mockResolvedValueOnce({
      ...fixture,
      recentQuotes: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          status: "answered",
          customerEmail: "cliente@example.com",
          createdAt: "2026-11-13T10:00:00Z",
          quotedAmountCents: 24990,
          modelCount: 2,
        },
      ],
    });
    show("/admin/comunicacao/historico");
    expect(
      await screen.findByText(/não afirma que e-mails ou mensagens externas foram enviados/),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Solicitação #22222222"),
    ).toBeInTheDocument();
  });

  it("links payment key configuration to subscription voucher review", () => {
    show("/admin/pagamentos/chaves");
    expect(
      screen.getByText(/chaves PIX configuradas são usadas no checkout de assinaturas/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Revisar comprovantes de assinatura" }),
    ).toHaveAttribute("href", "/admin/assinaturas");
    expect(mocks.overview).not.toHaveBeenCalled();
  });

  it("restores original nested administration routes without inventing production dates", async () => {
    show("/admin/producao/calendario");
    expect(
      screen.getByRole("navigation", {
        name: "Páginas do módulo administrativo",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Quadro de produção" }),
    ).toHaveAttribute("href", "/admin/producao/kanban");
    expect(
      await screen.findByText(/Nenhuma data de produção é inferida/),
    ).toBeInTheDocument();
    expect(mocks.overview).toHaveBeenCalledTimes(1);
  });

  it("shows a read-only ledger for original Coins even while crediting is disabled", async () => {
    mocks.overview.mockResolvedValueOnce({
      ...fixture,
      coinEntryCount: 1,
      recentCoinEntries: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          userId: "11111111-1111-4111-8111-111111111111",
          userEmail: "cliente@example.com",
          type: "admin_credit",
          delta: 12,
          reason: "Crédito administrativo confirmado",
          createdAt: "2026-11-11T13:00:00Z",
        },
      ],
    });
    show();
    fireEvent.click(screen.getByRole("button", { name: /Créditos/ }));
    expect(
      await screen.findByText("Crédito administrativo confirmado"),
    ).toBeInTheDocument();
    expect(screen.getByText("cliente@example.com")).toBeInTheDocument();
    expect(screen.getByText("+12,00")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Histórico de movimentações" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Abrir operações autorizadas" }),
    ).toHaveAttribute("href", "/admin/moedas");
  });

  it("shows actual quote requests under Pedidos without presenting them as paid orders", async () => {
    mocks.overview.mockResolvedValueOnce({
      ...fixture,
      recentQuotes: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          customerEmail: "comprador@example.com",
          createdAt: "2026-11-11T18:00:00Z",
          modelCount: 2,
          status: "answered",
          quotedAmountCents: 24990,
        },
      ],
    });
    show("/admin/pedidos");
    expect(
      await screen.findByRole("heading", { name: "Solicitações recebidas" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("comprador@example.com"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("comprador@example.com").closest("tr"),
    ).toHaveTextContent(/R\$\s*249,90/);
    expect(
      screen.getByText(/não equivale a confirmar um pedido/),
    ).toBeInTheDocument();
  });

  it("shows a financial quote summary without calling quotations revenue or payments", async () => {
    show("/admin/financeiro");
    expect(
      await screen.findByRole("heading", { name: "Visão de valores orçados" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText("Soma dos valores orçados").parentElement,
      ).toHaveTextContent(/R\$\s*249,90/),
    );
    expect(
      screen.getByText(
        /Valores extraídos das respostas a orçamentos, não de vendas/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Não representam caixa ou receita realizada/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cobrar|confirmar pagamento/i }),
    ).not.toBeInTheDocument();
  });

  it("connects the existing communication section to real quote activity without a parallel inbox", async () => {
    const id = "33333333-3333-4333-8333-333333333333";
    mocks.overview.mockResolvedValueOnce({
      ...fixture,
      recentQuotes: [
        {
          id,
          customerEmail: "cliente@example.com",
          createdAt: "2026-11-11T18:00:00Z",
          modelCount: 2,
          status: "pending",
          quotedAmountCents: null,
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          customerEmail: "respondido@example.com",
          createdAt: "2026-11-11T19:00:00Z",
          modelCount: 1,
          status: "answered",
          quotedAmountCents: 24990,
        },
      ],
    });
    show("/admin/comunicacao");
    expect(
      screen.getAllByRole("heading", { name: "Central de Comunicação" }).length,
    ).toBeGreaterThan(0);
    expect(
      await screen.findByText("Solicitação #33333333"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Preparar e-mail para cliente@example.com",
      }),
    ).toHaveAttribute("href", expect.stringMatching(/^mailto:/));
    const link = screen.queryByRole("link", {
      name: "Abrir solicitação #33333333",
    });
    expect(link).toHaveAttribute("href", "/admin/orcamentos?quote=" + id);
    expect(screen.getByText("Respondido")).toBeInTheDocument();
    expect(
      screen.getByText(/resposta comercial e o valor ficam registrados/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /enviar e-mail/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the communication module usable when no recent contact exists", async () => {
    mocks.overview.mockResolvedValueOnce({
      ...fixture,
      recentQuotes: [],
    });
    show("/admin/comunicacao");
    expect(
      await screen.findByText(
        "Não há atividade recente de orçamento entre as últimas solicitações.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/As quantidades acima consideram a base completa/),
    ).toBeInTheDocument();
  });

  it("restores the production hub with protected pre-production figures, not fabricated production orders", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: /Produção/ }));
    expect(
      await screen.findByText(
        /Um orçamento não representa ordem de fabricação/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Solicitações recebidas")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Iniciar produção/ }),
    ).not.toBeInTheDocument();
  });

  it("uses the existing commercial overview for historical analytics without presenting quotes as revenue", async () => {
    show("/admin/analytics");
    expect(
      await screen.findByText(
        /Valores de propostas comerciais/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Valor total das propostas")).toBeInTheDocument();
    expect(mocks.overview).toHaveBeenCalledTimes(1);
  });

  it("exposes the original packaging and audit frontend without pretending that it can save data", () => {
    show("/admin/embalagem");
    expect(
      screen.getByText(/As opções de embalagem do sistema anterior/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Salvar embalagem/ }),
    ).not.toBeInTheDocument();
    cleanup();

    show("/admin/auditoria");
    expect(
      screen.getByText(/Não é apresentada uma lista simulada de eventos/),
    ).toBeInTheDocument();
    expect(mocks.overview).not.toHaveBeenCalled();
  });

  it("fails closed on dashboard query errors instead of inventing empty figures", async () => {
    mocks.overview.mockRejectedValueOnce(new Error("RLS blocked"));
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os dados administrativos",
    );
    expect(screen.queryByText("cliente@example.com")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
