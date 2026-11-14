import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import TonecosCustomerSections, {
  customerSectionLinks,
  TonecosCustomerNavigation,
} from "./TonecosCustomerSections";

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.getUser,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111",
    email: "cliente@example.com",
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

  it("shows the original customer address form without pretending to save unsupported data", async () => {
    show("/perfil/endereco");
    expect(await screen.findByRole("heading", { name: "Endereços e entrega" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Seções da Minha Conta" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "CEP" })).toBeDisabled();
    expect(screen.getByText(/Nenhum dado inserido aqui é armazenado/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar endereço" })).not.toBeInTheDocument();
  });

  it("preserves the original personal data fields as visible frontend without claiming persistence", async () => {
    show("/perfil/dados-pessoais");
    expect(await screen.findByRole("textbox", { name: "WhatsApp" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "CPF (para emissão fiscal quando necessário)" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Data de nascimento" })).toBeDisabled();
    expect(screen.getByText(/Nenhum dado inserido aqui é armazenado/)).toBeInTheDocument();
  });

  it("offers a proper sign-in instead of revealing personal sections to a guest", async () => {
    mocks.getUser.mockResolvedValue(null);
    show("/perfil/endereco");
    expect(await screen.findByRole("link", { name: "Entrar ou criar conta" })).toHaveAttribute(
      "href",
      "/login?next=%2Fperfil",
    );
    expect(screen.queryByRole("textbox", { name: "CEP" })).not.toBeInTheDocument();
  });

  it("allows retry when identity verification is unavailable", async () => {
    mocks.getUser
      .mockRejectedValueOnce(new Error("connection error"))
      .mockResolvedValueOnce({ id: "11111111-1111-4111-8111-111111111111" });
    show("/perfil/pedidos");
    fireEvent.click(await screen.findByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("link", { name: "Consultar meus orçamentos" })).toHaveAttribute(
      "href",
      "/meus-orcamentos",
    );
  });

  it("offers account navigation as a reusable component", () => {
    render(
      <MemoryRouter initialEntries={["/perfil"]}>
        <TonecosCustomerNavigation />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Dados da conta" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
