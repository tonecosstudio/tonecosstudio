import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import {
  CatalogBrowsingProvider,
  useCatalogBrowsing,
} from "@/services/catalog/catalog-browsing-context";
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
    getUser: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    resendConfirmation: vi.fn(),
    signOut: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    history: vi.fn(),
    quoteItems: vi.fn(),
    submit: vi.fn(),
    listMine: vi.fn(),
    listAdmin: vi.fn(),
    answerAdmin: vi.fn(),
    changeStatus: vi.fn(),
    hasAdmin: vi.fn(),
  };
});
vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.getUser,
  signInTonecosAccount: mocks.signIn,
  registerTonecosAccount: mocks.signUp,
  resendTonecosSignupConfirmation: mocks.resendConfirmation,
  signOutTonecosAccount: mocks.signOut,
  getMyTonecosProfile: mocks.getProfile,
  updateMyTonecosProfile: mocks.updateProfile,
  changeTonecosPassword: mocks.changePassword,
}));
vi.mock("@/services/quotes/catalog-quote-history-service", () => ({
  loadCatalogQuoteHistory: mocks.history,
}));
vi.mock("@/services/auth/tonecos-admin-access", () => ({
  hasTonecosAdminAccess: mocks.hasAdmin,
}));
vi.mock("@/services/customer/catalog-quote-service", () => ({
  quoteItemsFromSelection: mocks.quoteItems,
  submitCatalogQuoteRequest: mocks.submit,
  loadMyCatalogQuotePage: mocks.listMine,
}));
vi.mock("@/services/admin/config/catalog-quote-admin-service", () => ({
  loadAdminCatalogQuotePage: mocks.listAdmin,
  answerCatalogQuoteRequest: mocks.answerAdmin,
  changeCatalogQuoteStatus: mocks.changeStatus,
}));

const model = {
  id: "model-1",
  slug: "naruto",
  code: "TC-NARUTO",
  name: "Naruto",
} as PublicCatalogModel;
function SelectModel() {
  const { setSelectedModels } = useCatalogBrowsing();
  useEffect(() => {
    setSelectedModels([model]);
  }, [setSelectedModels]);
  return null;
}
function renderApp(
  entry: string | { pathname: string; state?: { recovered?: boolean } },
  seed = false,
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <HelmetProvider>
        <CatalogBrowsingProvider>
          {seed && <SelectModel />}
          <Routes>
            <Route path="/login" element={<TonecosAccountPage />} />
            <Route
              path="/admin"
              element={<div>Painel administrativo TONART</div>}
            />
            <Route path="/perfil" element={<TonecosAccountPage />} />
            <Route
              path="/solicitar-orcamento"
              element={<TonecosQuoteRequestPage />}
            />
            <Route path="/meus-orcamentos" element={<TonecosMyQuotesPage />} />
            <Route
              path="/admin/orcamentos"
              element={<TonecosAdminQuotesPage />}
            />
            <Route path="/modelos" element={<div>Catálogo público</div>} />
          </Routes>
        </CatalogBrowsingProvider>
      </HelmetProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  mocks.getUser.mockResolvedValue({ id: USER, email: "cliente@example.com" });
  mocks.hasAdmin.mockResolvedValue(false);
  mocks.getProfile.mockResolvedValue({
    id: USER,
    email: "cliente@example.com",
    full_name: "Cliente",
    phone: null,
    created_at: "2026-11-05T00:00:00Z",
    updated_at: "2026-11-05T00:00:00Z",
  });
  mocks.quoteItems.mockImplementation((models: PublicCatalogModel[]) =>
    models.map(({ slug }) => ({ slug, quantity: 1 })),
  );
  mocks.listMine.mockResolvedValue({
    total: 0,
    limit: 20,
    offset: 0,
    rows: [],
  });
  mocks.listAdmin.mockResolvedValue({
    total: 0,
    limit: 25,
    offset: 0,
    rows: [],
  });
  mocks.changePassword.mockResolvedValue(undefined);
  mocks.resendConfirmation.mockResolvedValue(undefined);
  mocks.history.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("TONART commercial screens: account → request → history → response", () => {
  it("keeps logged-out quote selection and sends visitors to sign in", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderApp("/solicitar-orcamento", true);
    expect(
      await screen.findByRole("link", { name: "Entrar ou criar conta" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Entrar ou criar conta" }),
    ).toHaveAttribute("href", "/login?next=%2Fsolicitar-orcamento");
    expect(
      screen.queryByRole("button", { name: "Enviar solicitação" }),
    ).not.toBeInTheDocument();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("retries a failed session check without treating the visitor as signed out", async () => {
    mocks.getUser
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce({ id: USER, email: "cliente@example.com" });
    renderApp("/solicitar-orcamento", true);
    expect(
      await screen.findByText(
        "Não foi possível verificar sua sessão. Tente novamente antes de entrar na conta.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Entrar ou criar conta" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByRole("button", { name: "Enviar solicitação" }),
    ).toBeEnabled();
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
  });

  it("retries a failed quote history session check before requesting quotes", async () => {
    mocks.getUser
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce({ id: USER, email: "cliente@example.com" });
    renderApp("/meus-orcamentos");
    expect(
      await screen.findByText("Não foi possível verificar sua sessão."),
    ).toBeInTheDocument();
    expect(mocks.listMine).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() =>
      expect(mocks.listMine).toHaveBeenCalledWith(USER, {
        limit: 20,
        offset: 0,
      }),
    );
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
  });

  it("submits quantities and notes, then navigates to the customer's history", async () => {
    mocks.submit.mockResolvedValue(QUOTE);
    renderApp("/solicitar-orcamento", true);
    expect(await screen.findByText("Naruto")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Quantidade de Naruto" }),
      {
        target: { value: "2" },
      },
    );
    fireEvent.change(screen.getByLabelText("Observações (opcional)"), {
      target: { value: "Escala 1/5" },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Enviar solicitação" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
    await waitFor(() =>
      expect(mocks.submit).toHaveBeenCalledWith(
        USER,
        [{ slug: "naruto", quantity: 2 }],
        "Escala 1/5",
        {
          whatsapp: "",
          postalCode: "",
          scale: "a definir",
          finishing: "a definir",
        },
      ),
    );
    expect(
      await screen.findByText(
        "Solicitação enviada. Você poderá acompanhar a resposta aqui.",
      ),
    ).toBeInTheDocument();
  });

  it("shows clear customer quote errors without exposing internal codes", async () => {
    mocks.submit.mockRejectedValueOnce(
      new Error("catalog_quote_contact_invalid"),
    );
    renderApp("/solicitar-orcamento", true);
    fireEvent.click(
      await screen.findByRole("button", { name: "Enviar solicitação" }),
    );
    expect(
      await screen.findByText(
        "Revise WhatsApp, CEP, escala e acabamento antes de enviar.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("catalog_quote_contact_invalid"),
    ).not.toBeInTheDocument();
  });

  it("shows clear history errors without exposing backend details", async () => {
    mocks.listMine.mockRejectedValueOnce(
      new Error("postgres internal detail xyz"),
    );
    renderApp("/meus-orcamentos");
    expect(
      await screen.findByText(
        "Não foi possível concluir a operação de orçamento. Tente novamente.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/postgres internal detail/i),
    ).not.toBeInTheDocument();
  });

  it("shows a priced request but never renders an unpriced quote as R$ 0", async () => {
    mocks.listMine.mockResolvedValue({
      total: 1,
      limit: 20,
      offset: 0,
      rows: [
        {
          id: QUOTE,
          status: "pending",
          createdAt: "2026-11-05T00:00:00Z",
          notes: "Teste",
          quotedAmount: null,
          deadline: null,
          items: [{ slug: "naruto", quantity: 1 }],
        },
      ],
    });
    renderApp("/meus-orcamentos");
    expect(await screen.findByText("Valor em análise")).toBeInTheDocument();
    expect(screen.queryByText(/R\$ 0,00/)).not.toBeInTheDocument();
    expect(mocks.listMine).toHaveBeenCalledWith(USER, {
      limit: 20,
      offset: 0,
    });
  });

  it("shows the canonical quote timeline returned through RLS", async () => {
    mocks.listMine.mockResolvedValue({
      total: 1,
      limit: 20,
      offset: 0,
      rows: [
        {
          id: QUOTE,
          status: "answered",
          createdAt: "2026-11-05T00:00:00Z",
          notes: null,
          quotedAmount: 249.9,
          responseMessage: "Proposta válida por 7 dias.",
          deadline: null,
          items: [{ slug: "naruto", quantity: 1 }],
          whatsapp: null,
          postalCode: null,
          scale: "a definir",
          finishing: "a definir",
        },
      ],
    });
    mocks.history.mockResolvedValue({
      [QUOTE]: [
        {
          id: 1,
          quoteId: QUOTE,
          type: "submitted",
          fromStatus: null,
          toStatus: "pending",
          amount: null,
          responseText: null,
          createdAt: "2026-11-05T00:00:00Z",
        },
        {
          id: 2,
          quoteId: QUOTE,
          type: "answered",
          fromStatus: "reviewing",
          toStatus: "answered",
          amount: 249.9,
          responseText: "Proposta válida por 7 dias.",
          createdAt: "2026-11-05T01:00:00Z",
        },
      ],
    });
    renderApp("/meus-orcamentos");
    expect(await screen.findByText("Solicitação enviada")).toBeInTheDocument();
    expect(screen.getByText(/Orçamento respondido:/)).toHaveTextContent("R$");
    expect(screen.getByText("Proposta válida por 7 dias.")).toBeInTheDocument();
    expect(mocks.history).toHaveBeenCalledWith([QUOTE]);
  });

  it("does not display another person's history without a session", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderApp("/meus-orcamentos");
    expect(await screen.findByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login?next=%2Fmeus-orcamentos",
    );
    expect(mocks.listMine).not.toHaveBeenCalled();
  });

  it("shows a reassuring success message after password recovery without an active login session", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderApp({ pathname: "/login", state: { recovered: true } });
    expect(
      await screen.findByRole("button", { name: "Entrar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Senha atualizada com sucesso. Entre com sua nova senha.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("does not show the login form when checking the session fails transiently", async () => {
    mocks.getUser
      .mockRejectedValueOnce(new Error("session offline"))
      .mockResolvedValueOnce(null);
    renderApp("/login");
    expect(
      await screen.findByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Entrar" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByRole("button", { name: "Entrar" }),
    ).toBeInTheDocument();
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
  });

  it("protects saved account data from replacement if the profile cannot be loaded", async () => {
    mocks.getProfile.mockRejectedValueOnce(new Error("profile offline"));
    renderApp("/perfil");
    expect(
      await screen.findByRole("button", { name: "Tentar carregar dados" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Salvar dados" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Minhas moedas · indisponível"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Recursos da área do cliente" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Tentar carregar dados" }),
    );
    expect(
      await screen.findByRole("button", { name: "Salvar dados" }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Cliente");
    expect(mocks.getProfile).toHaveBeenCalledTimes(2);
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("lets an authenticated customer change the password only with the current credential and requires a fresh login", async () => {
    renderApp("/perfil");
    await screen.findByText(/Conectado como cliente@example.com/);
    fireEvent.change(screen.getByLabelText("Senha atual"), {
      target: { value: "OldPassword123!" },
    });
    fireEvent.change(screen.getByLabelText("Nova senha"), {
      target: { value: "NewPassword123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "NewPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Alterar senha" }));

    await waitFor(() =>
      expect(mocks.changePassword).toHaveBeenCalledWith({
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
      }),
    );
    expect(
      await screen.findByText(
        "Senha alterada com sucesso. Entre novamente com a nova senha.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("requires account sign-in and preserves a return-to path", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.signIn.mockResolvedValue(USER);
    renderApp("/login?next=%2Fmeus-orcamentos");
    expect(
      await screen.findByRole("button", { name: "Entrar" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() =>
      expect(mocks.signIn).toHaveBeenCalledWith(
        "cliente@example.com",
        "StrongPass123!",
      ),
    );
    expect(await screen.findByText("Meus orçamentos")).toBeInTheDocument();
  });

  it("continues an already-confirmed session to the preserved quote destination", async () => {
    mocks.getUser.mockResolvedValue({
      id: USER,
      email: "cliente@example.com",
    });
    renderApp("/login?next=%2Fsolicitar-orcamento");
    expect(
      await screen.findByText("Nenhum modelo selecionado nesta visita."),
    ).toBeInTheDocument();
  });

  it("preserves the quote destination when the customer chooses password recovery", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderApp("/login?next=%2Fsolicitar-orcamento");
    expect(
      await screen.findByRole("link", { name: "Esqueci minha senha" }),
    ).toHaveAttribute("href", "/recuperar-senha?next=%2Fsolicitar-orcamento");
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
    expect(
      screen.getByRole("button", { name: "Ocultar senha" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar senha" }));
    expect(field.type).toBe("password");
    expect(field.value).toBe("SenhaSecreta123!");
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("lets a returning customer resend email confirmation from login", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderApp("/login");
    await screen.findByRole("button", { name: "Entrar" });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Reenviar confirmação" }),
    );
    await waitFor(() =>
      expect(mocks.resendConfirmation).toHaveBeenCalledWith(
        "cliente@example.com",
        "/perfil",
      ),
    );
    expect(
      await screen.findByText(/Nova confirmação solicitada/),
    ).toBeInTheDocument();
  });

  it("shows account confirmation instead of claiming that signup is already active", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.signUp.mockResolvedValue({
      userId: USER,
      emailConfirmationRequired: true,
    });
    renderApp("/login?mode=signup&next=%2Fsolicitar-orcamento");
    expect(
      await screen.findByRole("button", { name: "Criar conta" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Cliente" },
    });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(
      await screen.findByText(
        "Solicitação processada. Se esta for uma nova conta, verifique o e-mail de confirmação, inclusive no spam. Se já tem cadastro, entre com sua senha ou use a recuperação de acesso.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Esqueci minha senha" }),
    ).toBeInTheDocument();
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "cliente@example.com",
      password: "StrongPass123!",
      fullName: "Cliente",
      returnTo: "/solicitar-orcamento",
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Reenviar confirmação" }),
    );
    await waitFor(() =>
      expect(mocks.resendConfirmation).toHaveBeenCalledWith(
        "cliente@example.com",
        "/solicitar-orcamento",
      ),
    );
    expect(
      await screen.findByText(/Nova confirmação solicitada/),
    ).toBeInTheDocument();
  });

  it("routes verified administrators to the existing /admin entry rather than quote-only intake", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.signIn.mockResolvedValue(USER);
    mocks.hasAdmin.mockResolvedValue(true);
    renderApp("/login");
    expect(
      await screen.findByRole("button", { name: "Entrar" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(
      await screen.findByText("Painel administrativo TONART"),
    ).toBeInTheDocument();
    expect(mocks.hasAdmin).toHaveBeenCalled();
  });

  it("shows admin navigation only after the server verifies membership", async () => {
    mocks.hasAdmin.mockResolvedValue(false);
    renderApp("/perfil");
    await screen.findByText(/Conectado como cliente@example.com/);
    await waitFor(() => expect(mocks.hasAdmin).toHaveBeenCalled());
    expect(
      screen.queryByRole("link", { name: "Painel administrativo" }),
    ).not.toBeInTheDocument();
  });

  it("never permits admin self-promotion through a browser button", async () => {
    mocks.listAdmin.mockRejectedValue(new Error("Admin access required"));
    renderApp("/admin/orcamentos");
    expect(
      await screen.findByText(/Acesso administrativo restrito/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ativar administração" }),
    ).not.toBeInTheDocument();
    expect(mocks.answerAdmin).not.toHaveBeenCalled();
  });

  it("shows only a real administrator's console link", async () => {
    mocks.hasAdmin.mockResolvedValue(true);
    renderApp("/perfil");
    expect(
      await screen.findByRole("link", { name: "Painel administrativo" }),
    ).toHaveAttribute("href", "/admin");
  });

  it("admin page uses the restricted service and does not submit prices for unauthorized users", async () => {
    mocks.listAdmin.mockRejectedValue(new Error("Admin access required"));
    renderApp("/admin/orcamentos");
    expect(
      await screen.findByText("Acesso administrativo não autorizado."),
    ).toBeInTheDocument();
    expect(mocks.answerAdmin).not.toHaveBeenCalled();
  });

  it("admin page answers with a validated quote price through its service", async () => {
    mocks.listAdmin.mockResolvedValue({
      total: 1,
      limit: 25,
      offset: 0,
      rows: [
        {
          id: QUOTE,
          userId: USER,
          status: "pending",
          createdAt: "2026-11-05T00:00:00Z",
          notes: null,
          quotedAmount: null,
          items: [{ slug: "naruto", quantity: 1 }],
        },
      ],
    });
    mocks.answerAdmin.mockResolvedValue(QUOTE);
    renderApp("/admin/orcamentos");
    expect(
      await screen.findByRole("button", { name: "Enviar resposta" }),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Valor do orçamento " + QUOTE.slice(0, 8),
      }),
      {
        target: { value: "249,90" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Mensagem ao cliente " + QUOTE.slice(0, 8),
      }),
      { target: { value: "Proposta válida por 7 dias." } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));
    await waitFor(() =>
      expect(mocks.answerAdmin).toHaveBeenCalledWith(
        QUOTE,
        249.9,
        "Proposta válida por 7 dias.",
      ),
    );
  });
  it("updates the canonical quote workflow only through the authorized admin service", async () => {
    mocks.listAdmin.mockResolvedValue({
      total: 1,
      limit: 25,
      offset: 0,
      rows: [
        {
          id: QUOTE,
          userId: USER,
          status: "pending",
          createdAt: "2026-11-05T00:00:00Z",
          notes: null,
          quotedAmount: null,
          items: [{ slug: "naruto", quantity: 1 }],
        },
      ],
    });
    mocks.changeStatus.mockResolvedValue(QUOTE);
    renderApp("/admin/orcamentos");
    fireEvent.click(
      await screen.findByRole("button", { name: "Marcar em análise" }),
    );
    await waitFor(() =>
      expect(mocks.changeStatus).toHaveBeenCalledWith(QUOTE, "reviewing"),
    );
    expect(mocks.answerAdmin).not.toHaveBeenCalled();
  });
});
