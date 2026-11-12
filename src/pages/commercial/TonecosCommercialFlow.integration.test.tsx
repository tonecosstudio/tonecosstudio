import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CatalogBrowsingProvider, useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";
import type { PublicCatalogModel } from "@/services/catalog/public-catalog-gateway";
import TonecosQuoteRequestPage from "./TonecosQuoteRequestPage";
import TonecosMyQuotesPage from "./TonecosMyQuotesPage";
import TonecosAccountPage from "./TonecosAccountPage";
import TonecosAdminQuotesPage from "./TonecosAdminQuotesPage";

const USER = "11111111-1111-4111-8111-111111111111";
const QUOTE = "22222222-2222-4222-8222-222222222222";
const mocks = vi.hoisted(() => {
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  return {
    getUser: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
    getProfile: vi.fn(), updateProfile: vi.fn(),
    quoteItems: vi.fn(), submit: vi.fn(), listMine: vi.fn(),
    listAdmin: vi.fn(), answerAdmin: vi.fn(), changeStatus: vi.fn(), hasAdmin: vi.fn(),
  };
});
vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.getUser,
  signInTonecosAccount: mocks.signIn,
  registerTonecosAccount: mocks.signUp,
  signOutTonecosAccount: mocks.signOut,
  getMyTonecosProfile: mocks.getProfile,
  updateMyTonecosProfile: mocks.updateProfile,
}));
vi.mock("@/services/auth/tonecos-admin-access", () => ({
  hasTonecosAdminAccess: mocks.hasAdmin,
}));
vi.mock("@/services/customer/catalog-quote-service", () => ({
  quoteItemsFromSelection: mocks.quoteItems,
  submitCatalogQuoteRequest: mocks.submit,
  listMyCatalogQuotes: mocks.listMine,
}));
vi.mock("@/services/admin/config/catalog-quote-admin-service", () => ({
  listAdminCatalogQuotes: mocks.listAdmin,
  answerCatalogQuoteRequest: mocks.answerAdmin,
  changeCatalogQuoteStatus: mocks.changeStatus,
}));

const model = {
  id: "model-1", slug: "naruto", code: "TC-NARUTO", name: "Naruto",
} as PublicCatalogModel;
function SelectModel() {
  const { setSelectedModels } = useCatalogBrowsing();
  useEffect(() => { setSelectedModels([model]); }, [setSelectedModels]);
  return null;
}
function renderApp(entry: string | { pathname: string; state?: { recovered?: boolean } }, seed = false) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <CatalogBrowsingProvider>
        {seed && <SelectModel />}
        <Routes>
          <Route path="/login" element={<TonecosAccountPage />} />
          <Route path="/perfil" element={<TonecosAccountPage />} />
          <Route path="/solicitar-orcamento" element={<TonecosQuoteRequestPage />} />
          <Route path="/meus-orcamentos" element={<TonecosMyQuotesPage />} />
          <Route path="/admin/orcamentos" element={<TonecosAdminQuotesPage />} />
          <Route path="/modelos" element={<div>Catálogo público</div>} />
        </Routes>
      </CatalogBrowsingProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  mocks.getUser.mockResolvedValue({ id: USER, email: "cliente@example.com" });
  mocks.hasAdmin.mockResolvedValue(false);
  mocks.getProfile.mockResolvedValue({
    id: USER, email: "cliente@example.com", full_name: "Cliente",
    phone: null, created_at: "2026-11-05T00:00:00Z", updated_at: "2026-11-05T00:00:00Z",
  });
  mocks.quoteItems.mockImplementation((models: PublicCatalogModel[]) =>
    models.map(({ slug }) => ({ slug, quantity: 1 })),
  );
  mocks.listMine.mockResolvedValue([]);
  mocks.listAdmin.mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("TONART commercial screens: account → request → history → response", () => {
  it("keeps logged-out quote selection and sends visitors to sign in", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderApp("/solicitar-orcamento", true);
    expect(await screen.findByText("Naruto")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar ou criar conta" }))
      .toHaveAttribute("href", "/login?next=%2Fsolicitar-orcamento");
    expect(screen.getByRole("button", { name: "Enviar solicitação" })).toBeDisabled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("submits quantities and notes, then navigates to the customer's history", async () => {
    mocks.submit.mockResolvedValue(QUOTE);
    renderApp("/solicitar-orcamento", true);
    expect(await screen.findByText("Naruto")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Quantidade de Naruto" }), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Observações (opcional)"), {
      target: { value: "Escala 1/5" },
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar solicitação" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith(
      USER, [{ slug: "naruto", quantity: 2 }], "Escala 1/5",
      { whatsapp: "", postalCode: "", scale: "a definir", finishing: "a definir" },
    ));
    expect(await screen.findByText("Solicitação enviada. Você poderá acompanhar a resposta aqui."))
      .toBeInTheDocument();
  });

  it("shows a priced request but never renders an unpriced quote as R$ 0", async () => {
    mocks.listMine.mockResolvedValue([
      { id: QUOTE, status: "pending", createdAt: "2026-11-05T00:00:00Z",
        notes: "Teste", quotedAmount: null, deadline: null,
        items: [{ slug: "naruto", quantity: 1 }] },
    ]);
    renderApp("/meus-orcamentos");
    expect(await screen.findByText("Valor em análise")).toBeInTheDocument();
    expect(screen.queryByText(/R\$ 0,00/)).not.toBeInTheDocument();
    expect(mocks.listMine).toHaveBeenCalledWith(USER);
  });

  it("does not display another person's history without a session", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderApp("/meus-orcamentos");
    expect(await screen.findByRole("link", { name: "Entrar" }))
      .toHaveAttribute("href", "/login?next=%2Fmeus-orcamentos");
    expect(mocks.listMine).not.toHaveBeenCalled();
  });

  it("shows a reassuring success message after password recovery without an active login session", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderApp({ pathname: "/login", state: { recovered: true } });
    expect(await screen.findByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Senha atualizada com sucesso. Entre com sua nova senha.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("requires account sign-in and preserves a return-to path", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.signIn.mockResolvedValue(USER);
    renderApp("/login?next=%2Fmeus-orcamentos");
    expect(await screen.findByRole("button", { name: "Entrar" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "cliente@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "StrongPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith(
      "cliente@example.com", "StrongPass123!",
    ));
    expect(await screen.findByText("Meus orçamentos")).toBeInTheDocument();
  });

  it("toggles password visibility without changing the typed password or submitting the login", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderApp("/login");
    await screen.findByRole("button", { name: "Entrar" });
    const field = screen.getByLabelText("Senha") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "SenhaSecreta123!" } });
    expect(field.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(field.type).toBe("text");
    expect(field.value).toBe("SenhaSecreta123!");
    expect(screen.getByRole("button", { name: "Ocultar senha" }))
      .toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(field.type).toBe("password");
    expect(field.value).toBe("SenhaSecreta123!");
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("shows account confirmation instead of claiming that signup is already active", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.signUp.mockResolvedValue({ userId: USER, emailConfirmationRequired: true });
    renderApp("/login?mode=signup");
    expect(await screen.findByRole("button", { name: "Criar conta" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Cliente" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "cliente@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "StrongPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("Solicitação processada. Se esta for uma nova conta, verifique o e-mail de confirmação, inclusive no spam. Se já tem cadastro, entre com sua senha ou use a recuperação de acesso."))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Esqueci minha senha" })).toBeInTheDocument();
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "cliente@example.com", password: "StrongPass123!", fullName: "Cliente",
    });
  });

  it("shows admin navigation only after the server verifies membership", async () => {
    mocks.hasAdmin.mockResolvedValue(false);
    renderApp("/perfil");
    await screen.findByText(/Conectado como cliente@example.com/);
    expect(screen.queryByRole("link", { name: "Atendimento TONART" })).not.toBeInTheDocument();
  });

  it("never permits admin self-promotion through a browser button", async () => {
    mocks.listAdmin.mockRejectedValue(new Error("Admin access required"));
    renderApp("/admin/orcamentos");
    expect(await screen.findByText(/Acesso administrativo restrito/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ativar administração" })).not.toBeInTheDocument();
    expect(mocks.answerAdmin).not.toHaveBeenCalled();
  });

  it("shows only a real administrator's console link", async () => {
    mocks.hasAdmin.mockResolvedValue(true);
    renderApp("/perfil");
    expect(await screen.findByRole("link", { name: "Atendimento TONART" }))
      .toHaveAttribute("href", "/admin/orcamentos");
  });

  it("admin page uses the restricted service and does not submit prices for unauthorized users", async () => {
    mocks.listAdmin.mockRejectedValue(new Error("Admin access required"));
    renderApp("/admin/orcamentos");
    expect(await screen.findByText("Admin access required")).toBeInTheDocument();
    expect(mocks.answerAdmin).not.toHaveBeenCalled();
  });

  it("admin page answers with a validated quote price through its service", async () => {
    mocks.listAdmin.mockResolvedValue([{
      id: QUOTE, userId: USER, status: "pending", createdAt: "2026-11-05T00:00:00Z",
      notes: null, quotedAmount: null, items: [{ slug: "naruto", quantity: 1 }],
    }]);
    mocks.answerAdmin.mockResolvedValue(QUOTE);
    renderApp("/admin/orcamentos");
    expect(await screen.findByRole("button", { name: "Responder com valor" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Valor do orçamento " + QUOTE.slice(0, 8) }), {
      target: { value: "249,90" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Responder com valor" }));
    await waitFor(() => expect(mocks.answerAdmin).toHaveBeenCalledWith(QUOTE, 249.9));
  });
  it("updates the canonical quote workflow only through the authorized admin service", async () => {
    mocks.listAdmin.mockResolvedValue([{
      id: QUOTE, userId: USER, status: "pending", createdAt: "2026-11-05T00:00:00Z",
      notes: null, quotedAmount: null, items: [{ slug: "naruto", quantity: 1 }],
    }]);
    mocks.changeStatus.mockResolvedValue(QUOTE);
    renderApp("/admin/orcamentos");
    fireEvent.click(await screen.findByRole("button", { name: "Marcar em análise" }));
    await waitFor(() => expect(mocks.changeStatus).toHaveBeenCalledWith(QUOTE, "reviewing"));
    expect(mocks.answerAdmin).not.toHaveBeenCalled();
  });

});
