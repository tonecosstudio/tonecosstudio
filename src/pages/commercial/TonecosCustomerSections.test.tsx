import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useEffect } from "react";
import {
  CatalogBrowsingProvider,
  useCatalogBrowsing,
} from "@/services/catalog/catalog-browsing-context";
import type { PublicCatalogModel } from "@/services/catalog/public-catalog-gateway";
import { HelmetProvider } from "react-helmet-async";
import TonecosCustomerSections, {
  customerSectionLinks,
  TonecosCustomerNavigation,
} from "./TonecosCustomerSections";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getProfile: vi.fn(),
  listMine: vi.fn(),
}));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.getUser,
  getMyTonecosProfile: mocks.getProfile,
}));
vi.mock("@/services/customer/catalog-quote-service", () => ({
  loadMyCatalogQuotePage: mocks.listMine,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111",
    email: "cliente@example.com",
  });
  mocks.getProfile.mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111",
    email: "cliente@example.com",
    full_name: "Cliente Cadastrado",
    phone: "(71) 99988-7766",
    created_at: "2026-11-05T00:00:00Z",
    updated_at: "2026-11-05T00:00:00Z",
  });
  mocks.listMine.mockResolvedValue({
    total: 0,
    limit: 5,
    offset: 0,
    rows: [],
  });
});
afterEach(() => cleanup());

function show(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <HelmetProvider>
        <TonecosCustomerSections />
      </HelmetProvider>
    </MemoryRouter>,
  );
}

describe("Original customer account navigation in the commercial app", () => {
  it("keeps the old payment, notifications and support sections alongside restored pages", () => {
    const paths = customerSectionLinks.map((x) => x.path);
    expect(paths).toContain("/perfil");
    expect(paths).toContain("/perfil/pagamentos");
    expect(paths).toContain("/perfil/notificacoes");
    expect(paths).toContain("/perfil/suporte");
    expect(paths).toContain("/perfil/endereco");
    expect(paths).toContain("/perfil/dados-pessoais");
    expect(paths).toContain("/perfil/pedidos");
    expect(paths).not.toContain("/moedas");
    expect(paths).not.toContain("/perfil/moedas");
  });

  it("uses one navigation link per canonical destination and keeps sections organized", () => {
    const paths = customerSectionLinks.map((item) => item.path);
    expect(paths).toEqual([...new Set(paths)]);
    render(
      <MemoryRouter initialEntries={["/perfil"]}>
        <TonecosCustomerNavigation />
      </MemoryRouter>,
    );
    expect(screen.getByText("Cadastro e preferências")).toBeInTheDocument();
    expect(
      screen.getByText("Solicitações e relacionamento"),
    ).toBeInTheDocument();
    expect(screen.getByText("Comunicação")).toBeInTheDocument();
  });

  it("keeps the original subscription alias visible without presenting a functional payment", async () => {
    show("/perfil/assinaturas");
    expect(
      await screen.findByText(
        /não tem operações financeiras ou assinaturas habilitadas/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /pagar|contratar/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the original customer address form without pretending to save unsupported data", async () => {
    show("/perfil/endereco");
    expect(
      await screen.findByRole("heading", { name: "Endereços e entrega" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Seções da Minha Conta" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "CEP" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "CEP" })).toHaveAttribute(
      "autocomplete",
      "postal-code",
    );
    expect(
      screen.getByText(/Nenhum dado inserido aqui é armazenado/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Salvar endereço" }),
    ).not.toBeInTheDocument();
  });

  it("preserves the original personal data fields as visible frontend without claiming persistence", async () => {
    show("/perfil/dados-pessoais");
    expect(
      await screen.findByRole("textbox", { name: "WhatsApp" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("textbox", {
        name: "CPF (para emissão fiscal quando necessário)",
      }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Data de nascimento")).toHaveAttribute(
      "type",
      "date",
    );
    expect(screen.getByLabelText("Data de nascimento")).toBeDisabled();
    expect(
      screen.getByText(/Nenhum dado inserido aqui é armazenado/),
    ).toBeInTheDocument();
  });

  it("shows the canonical registered contact data alongside the old personal fields", async () => {
    show("/perfil/dados-pessoais");
    expect(
      await screen.findByRole("region", {
        name: "Dados cadastrais da conta",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cliente Cadastrado")).toBeInTheDocument();
    expect(screen.getByText("(71) 99988-7766")).toBeInTheDocument();
    expect(mocks.getProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox", { name: "WhatsApp" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /Salvar dados pessoais/i }),
    ).not.toBeInTheDocument();
  });

  it("fails closed if the registered contact profile cannot be loaded", async () => {
    mocks.getProfile
      .mockRejectedValueOnce(new Error("connection unavailable"))
      .mockResolvedValueOnce({
        id: "11111111-1111-4111-8111-111111111111",
        email: "cliente@example.com",
        full_name: "Cliente Cadastrado",
        phone: null,
      });
    show("/perfil/dados-pessoais");
    expect(
      await screen.findByText(/Não foi possível consultar seus dados cadastrais/),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Tentar carregar dados" }),
    );
    expect(await screen.findByText("Cliente Cadastrado")).toBeInTheDocument();
    expect(mocks.getProfile).toHaveBeenCalledTimes(2);
  });

  it("shows the existing catalog selection in the restored collection and removes items through the same store", async () => {
    function SeedSelection() {
      const { setSelectedModels } = useCatalogBrowsing();
      useEffect(() => {
        setSelectedModels([
          {
            id: "model-1",
            slug: "naruto",
            name: "Naruto",
            code: "TC-001",
          } as PublicCatalogModel,
        ]);
      }, [setSelectedModels]);
      return null;
    }

    render(
      <MemoryRouter initialEntries={["/perfil/colecao"]}>
        <HelmetProvider>
          <CatalogBrowsingProvider>
            <SeedSelection />
            <TonecosCustomerSections />
          </CatalogBrowsingProvider>
        </HelmetProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("region", { name: "Seleção atual de modelos" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Naruto" })).toHaveAttribute(
      "href",
      "/modelos/naruto",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remover Naruto da seleção" }),
    );
    expect(
      screen.getByText(/ainda não escolheu modelos para solicitar orçamento/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Naruto" })).not.toBeInTheDocument();
  });

  it("offers a proper sign-in instead of revealing personal sections to a guest", async () => {
    mocks.getUser.mockResolvedValue(null);
    show("/perfil/endereco");
    expect(
      await screen.findByRole("link", { name: "Entrar ou criar conta" }),
    ).toHaveAttribute("href", "/login?next=%2Fperfil%2Fendereco");
    expect(
      screen.queryByRole("textbox", { name: "CEP" }),
    ).not.toBeInTheDocument();
  });

  it("shows the actual customer's recent quotes on the recovered orders page", async () => {
    mocks.listMine.mockResolvedValueOnce({
      total: 1,
      limit: 5,
      offset: 0,
      rows: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          status: "reviewing",
          createdAt: "2026-11-12T12:00:00Z",
          items: [{ slug: "naruto", quantity: 2 }],
          quotedAmount: null,
        },
      ],
    });
    show("/perfil/pedidos");
    expect(
      await screen.findByText("Orçamento #22222222"),
    ).toBeInTheDocument();
    expect(screen.getByText("Em análise")).toBeInTheDocument();
    expect(screen.getByText("Valor em análise")).toBeInTheDocument();
    expect(mocks.listMine).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      { limit: 5, offset: 0 },
    );
  });

  it("does not invent production milestones from an answered quote", async () => {
    mocks.listMine.mockResolvedValueOnce({
      total: 1,
      limit: 5,
      offset: 0,
      rows: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          status: "answered",
          createdAt: "2026-11-12T12:00:00Z",
          items: [{ slug: "naruto", quantity: 1 }],
          quotedAmount: 249.9,
        },
      ],
    });
    show("/perfil/producao");
    expect(await screen.findByText("Pré-produção e propostas")).toBeInTheDocument();
    expect(screen.getByText("Respondido")).toBeInTheDocument();
    expect(screen.getByText(/nenhuma etapa de fabricação é inferida/i)).toBeInTheDocument();
    expect(screen.queryByText(/Produção iniciada/i)).not.toBeInTheDocument();
  });

  it("exposes a retry without fabricating an empty history when quote loading fails", async () => {
    mocks.listMine
      .mockRejectedValueOnce(new Error("service unavailable"))
      .mockResolvedValueOnce({ total: 0, limit: 5, offset: 0, rows: [] });
    show("/perfil/pedidos");
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Não foi possível concluir a operação de orçamento");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByText("Você ainda não enviou solicitações de orçamento."),
    ).toBeInTheDocument();
    expect(mocks.listMine).toHaveBeenCalledTimes(2);
  });

  it("allows retry when identity verification is unavailable", async () => {
    mocks.getUser
      .mockRejectedValueOnce(new Error("connection error"))
      .mockResolvedValueOnce({ id: "11111111-1111-4111-8111-111111111111" });
    show("/perfil/pedidos");
    fireEvent.click(
      await screen.findByRole("button", { name: "Tentar novamente" }),
    );
    expect(
      await screen.findByRole("link", { name: "Consultar meus orçamentos" }),
    ).toHaveAttribute("href", "/meus-orcamentos");
  });

  it("offers account navigation as a reusable component", () => {
    render(
      <MemoryRouter initialEntries={["/perfil"]}>
        <TonecosCustomerNavigation />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "Dados da conta" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
