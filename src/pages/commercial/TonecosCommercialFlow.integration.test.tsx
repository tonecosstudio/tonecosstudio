import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
  within,
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
  vi.stubEnv("VITE_CONTACT_EMAIL", "atendimento@example.com");
  vi.stubEnv("VITE_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "local-test-publishable-key");
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
    submitVoucher: vi.fn(),
    cancelExtraOrder: vi.fn(),
    coinBalance: vi.fn(),
    applyCoins: vi.fn(),
    listAdmin: vi.fn(),
    answerAdmin: vi.fn(),
    changeStatus: vi.fn(),
    hasAdmin: vi.fn(),
    signupAvailability: vi.fn(),
  };
});
vi.mock("@/hooks/auth/useTonecosSignupAvailability", () => ({
  useTonecosSignupAvailability: mocks.signupAvailability,
}));
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
  submitCatalogPreorderVoucher: mocks.submitVoucher,
  loadMyCatalogQuotePage: mocks.listMine,
}));
vi.mock("@/services/commercial/tonart-extra-order-service", () => ({
  cancelTonartExtraOrder: mocks.cancelExtraOrder,
}));
vi.mock("@/services/payments/payment-voucher-storage-service", () => ({
  ALLOWED_PAYMENT_VOUCHER_TYPES: ["image/jpeg", "image/png", "application/pdf"],
  MAX_PAYMENT_VOUCHER_SIZE: 5 * 1024 * 1024,
  validatePaymentVoucher: vi.fn(),
}));
vi.mock("@/services/coins/tonecos-coins-service", () => ({
  getMyTonecosCoinBalance: mocks.coinBalance,
  applyTonecosCoinsToQuote: mocks.applyCoins,
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
const DEFAULT_SEED_MODELS = [model];
function SelectModel({
  models = DEFAULT_SEED_MODELS,
}: {
  models?: PublicCatalogModel[];
}) {
  const { setSelectedModels } = useCatalogBrowsing();
  useEffect(() => {
    setSelectedModels(models);
  }, [setSelectedModels, models]);
  return null;
}
type RouteEntry =
  | string
  | {
      pathname: string;
      state?: { recovered?: boolean; sent?: string };
    };
function renderApp(
  entry: RouteEntry,
  seed = false,
  models?: PublicCatalogModel[],
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <HelmetProvider>
        <CatalogBrowsingProvider>
          {seed && <SelectModel models={models} />}
          <Routes>
            <Route path="/login" element={<TonecosAccountPage />} />
            <Route
              path="/admin"
              element={<div>Painel administrativo TONART</div>}
            />
            <Route path="/perfil" element={<TonecosAccountPage />} />
            <Route
              path="/perfil/:section"
              element={<div>Seção autenticada da Minha Conta</div>}
            />
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
  mocks.signupAvailability.mockReturnValue("enabled");
  mocks.getProfile.mockResolvedValue({
    id: USER,
    email: "cliente@example.com",
    full_name: "Cliente",
    phone: null,
    whatsapp: null,
    delivery_address: null,
    preferred_contact_channel: null,
    quote_updates: false,
    production_updates: false,
    marketing_emails: false,
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
  mocks.coinBalance.mockResolvedValue({
    balance: 40,
    totalEarned: 40,
    totalSpent: 0,
    entryCount: 1,
    updatedAt: "2026-11-14T00:00:00Z",
  });
  mocks.applyCoins.mockResolvedValue({
    quoteId: QUOTE,
    spent: 20,
    balance: 20,
    remainingAmount: 100,
    idempotent: false,
  });
  mocks.cancelExtraOrder.mockResolvedValue({
    quoteId: QUOTE,
    coinsReversed: 100,
    balance: 100,
    idempotent: false,
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
  it("lets a customer cancel a fully Coins-funded extra before a cash payment", async () => {
    mocks.listMine.mockResolvedValue({
      total: 1,
      limit: 20,
      offset: 0,
      rows: [
        {
          id: QUOTE,
          status: "answered",
          createdAt: "2026-11-14T00:00:00Z",
          deadline: null,
          notes: null,
          items: [{ slug: "terror-monster", quantity: 1 }],
          quotedAmount: 100,
          listAmount: 100,
          discountPercent: 0,
          discountAmount: 0,
          responseMessage: "Frete confirmado.",
          whatsapp: "5511999999999",
          postalCode: "01310100",
          scale: "1/10",
          finishing: "pintado",
          isPreorder: false,
          depositAmount: null,
          remainingAmount: null,
          paymentStatus: "fully_paid",
          paymentLink: null,
          pixKey: null,
          paymentInstructions: null,
          paymentLinkSentAt: null,
          finalPaymentNotifiedAt: null,
          readyForFinalPayment: false,
          paymentVoucherPath: null,
          paymentVoucherType: null,
          paymentVoucherRejectionReason: null,
          coinAmountApplied: 100,
          commercialShippingAmountBrl: 0,
          commercialOfferSnapshot: {
            schemaVersion: 1,
            offerId: "22222222-2222-4222-8222-222222222222",
            catalogModelSlug: "terror-monster",
            scale: "1/10",
            finishing: "painted",
            contentsDescription: "Peça pintada.",
            itemListPriceBrl: 100,
            itemDiscountBrl: 0,
            itemPriceBrl: 100,
            subscriberDiscountEligible: false,
            subscriberDiscountApplied: false,
            subscriberDiscountBasisPoints: 0,
            shippingMode: "fixed",
            configuredShippingAmountBrl: 0,
            deliveryTerms: "Prazo informado na oferta.",
            coinsEligible: true,
            coinsRequested: 100,
            coinsApplied: 100,
            initialCashAmountDueBrl: 0,
            currency: "BRL",
          },
        },
      ],
    });

    renderApp("/meus-orcamentos");
    fireEvent.click(
      await screen.findByRole("button", { name: "Cancelar pedido" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar cancelamento" }),
    );
    await waitFor(() =>
      expect(mocks.cancelExtraOrder).toHaveBeenCalledExactlyOnceWith(QUOTE),
    );
  });

  it("keeps logged-out quote selection and sends visitors to sign in", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderApp("/solicitar-orcamento", true);
    expect(
      await screen.findByRole("link", { name: "Entrar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login?next=%2Fsolicitar-orcamento",
    );
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute(
      "href",
      "/login?mode=signup&next=%2Fsolicitar-orcamento",
    );
    expect(
      screen.queryByRole("button", { name: "Enviar solicitação" }),
    ).not.toBeInTheDocument();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("offers a selected-model email quote while public signup stays closed", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.signupAvailability.mockReturnValue("disabled");
    renderApp("/solicitar-orcamento", true);

    const contact = await screen.findByRole("link", {
      name: "Pedir orçamento por e-mail",
    });
    const href = contact.getAttribute("href") ?? "";
    expect(href).toMatch(/^mailto:/);
    expect(contact).toHaveClass("font-semibold");
    const login = screen.getByRole("link", { name: "Entrar" });
    expect(login).not.toHaveClass("font-semibold");
    expect(
      screen.getByText(/solicitar um orçamento por e-mail, sem criar conta/),
    ).toBeInTheDocument();
    const message = decodeURIComponent(href);
    expect(message).toContain("Naruto");
    expect(message).toContain("TC-NARUTO");
    expect(message).toContain("CEP para estimativa de entrega:");
    expect(
      screen.getByText(/sem protocolo em Meus Orçamentos/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Criar conta" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enviar solicitação" }),
    ).not.toBeInTheDocument();
    const fallback = screen.getByText("Ver e copiar texto do orçamento");
    fireEvent.click(fallback);
    expect(
      (
        screen.getByLabelText(
          "Texto completo para enviar ao estúdio",
        ) as HTMLTextAreaElement
      ).value,
    ).toContain("TC-NARUTO");
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("preserves 50 model references when the guest mailto body exceeds safe URL length", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.signupAvailability.mockReturnValue("disabled");
    const selected = Array.from({ length: 50 }, (_, index) => ({
      ...model,
      id: `model-${index}`,
      slug: `model-${index}`,
      name: `Escultura ${index + 1} ${"N".repeat(90)}`,
      code: `TC-M${index + 1}-${"X".repeat(75)}`,
    }));
    renderApp("/solicitar-orcamento", true, selected);
    const email = await screen.findByRole("link", {
      name: "Pedir orçamento por e-mail",
    });
    expect(decodeURIComponent(email.getAttribute("href") ?? "")).toBe(
      "mailto:atendimento@example.com",
    );
    expect(email).toHaveClass("font-semibold");
    expect(
      screen.getByText(/seleção é extensa para um link de e-mail preenchido/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Ver e copiar texto do orçamento"));
    const body = (
      screen.getByLabelText(
        "Texto completo para enviar ao estúdio",
      ) as HTMLTextAreaElement
    ).value;
    expect(body).toContain("TC-M1-");
    expect(body).toContain("TC-M50-");
    expect(body.match(/ — código /g)).toHaveLength(50);
    expect(
      screen.queryByRole("link", { name: "Criar conta" }),
    ).not.toBeInTheDocument();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("shows only the catalog chooser when a visitor has selected no models", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderApp("/solicitar-orcamento");
    expect(
      await screen.findByText("Nenhum modelo selecionado nesta visita."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Entrar" }),
    ).not.toBeInTheDocument();
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
      screen.queryByRole("link", { name: "Entrar" }),
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

  it("uses saved account details instead of duplicate quote contact inputs", async () => {
    mocks.getProfile.mockResolvedValueOnce({
      id: USER,
      email: "cliente@example.com",
      full_name: "Cliente TONART",
      phone: "(71) 99999-9999",
    });
    mocks.submit.mockResolvedValue(QUOTE);
    renderApp("/solicitar-orcamento", true);
    expect(
      await screen.findByRole("region", {
        name: "Dados cadastrais da conta",
      }),
    ).toHaveTextContent("Cliente TONART");
    expect(
      screen.getByRole("link", { name: "Editar na Minha Conta" }),
    ).toHaveAttribute("href", "/perfil");
    expect(
      screen.queryByLabelText("WhatsApp para contato (opcional)"),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("CEP (opcional)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
    await waitFor(() =>
      expect(mocks.submit).toHaveBeenCalledWith(
        USER,
        [{ slug: "naruto", quantity: 1 }],
        "",
        {
          whatsapp: "71999999999",
          postalCode: "",
          scale: "a definir",
          finishing: "a definir",
        },
        "quote",
      ),
    );
  });

  it("routes a selected catalog model into the R$50 pre-sale request", async () => {
    mocks.submit.mockResolvedValue(QUOTE);
    renderApp("/solicitar-orcamento?tipo=pre-venda", true);
    const submit = await screen.findByRole("button", {
      name: "Solicitar pré-venda",
    });
    expect(
      screen.getByRole("radio", { name: /Quero fazer pré-venda/ }),
    ).toBeChecked();
    expect(
      screen.getByText(/R\$50 só será solicitado após confirmação/),
    ).toBeInTheDocument();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(mocks.submit).toHaveBeenCalledWith(
        USER,
        [{ slug: "naruto", quantity: 1 }],
        "",
        {
          whatsapp: "",
          postalCode: "",
          scale: "a definir",
          finishing: "a definir",
        },
        "preorder",
      ),
    );
  });

  it("sends the saved WhatsApp and delivery CEP from one profile without duplicate quote inputs", async () => {
    mocks.getProfile.mockResolvedValueOnce({
      id: USER,
      email: "cliente@example.com",
      full_name: "Cliente",
      phone: "71999999999",
      whatsapp: "71988887777",
      delivery_address: {
        street: "Rua Exemplo",
        number: "10",
        neighborhood: "Centro",
        city: "Salvador",
        state: "BA",
        zipCode: "40000000",
        country: "BR",
      },
    });
    mocks.submit.mockResolvedValue(QUOTE);
    renderApp("/solicitar-orcamento", true);
    await screen.findByRole("button", { name: "Enviar solicitação" });
    expect(screen.getByText("71988887777")).toBeInTheDocument();
    expect(screen.getByText("40000000")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitação" }));
    await waitFor(() =>
      expect(mocks.submit).toHaveBeenCalledWith(
        USER,
        [{ slug: "naruto", quantity: 1 }],
        "",
        {
          whatsapp: "71988887777",
          postalCode: "40000000",
          scale: "a definir",
          finishing: "a definir",
        },
        "quote",
      ),
    );
    expect(screen.queryByLabelText("CEP (opcional)")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("WhatsApp para contato (opcional)"),
    ).not.toBeInTheDocument();
  });

  it("requires the saved customer profile before enabling an actual quote request", async () => {
    mocks.getProfile.mockRejectedValueOnce(new Error("profile offline"));
    renderApp("/solicitar-orcamento", true);
    expect(
      await screen.findByRole("button", { name: "Tentar carregar dados" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enviar solicitação" }),
    ).not.toBeInTheDocument();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("sends an incomplete customer to the existing My Account", async () => {
    mocks.getProfile.mockResolvedValueOnce({
      id: USER,
      email: "cliente@example.com",
      full_name: null,
      phone: null,
    });
    renderApp("/solicitar-orcamento", true);
    expect(
      await screen.findByRole("link", { name: "Completar Minha Conta" }),
    ).toHaveAttribute("href", "/perfil");
    expect(
      screen.queryByRole("button", { name: "Enviar solicitação" }),
    ).not.toBeInTheDocument();
  });

  it("submits quantities and notes, then navigates to the customer's history", async () => {
    mocks.submit.mockResolvedValue(QUOTE);
    // The read side confirms the newly persisted quote before the success notice.
    mocks.listMine.mockResolvedValueOnce({
      total: 1,
      limit: 20,
      offset: 0,
      rows: [
        {
          id: QUOTE,
          status: "pending",
          createdAt: "2026-11-13T00:00:00Z",
          notes: "Escala 1/5",
          quotedAmount: null,
          responseMessage: null,
          deadline: null,
          items: [{ slug: "naruto", quantity: 2 }],
          whatsapp: null,
          postalCode: null,
          scale: "a definir",
          finishing: "a definir",
        },
      ],
    });
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
        "quote",
      ),
    );
    expect(
      await screen.findByText(
        "Solicitação enviada. Você poderá acompanhar a resposta aqui.",
      ),
    ).toBeInTheDocument();
  });

  it("carries a selected-model request through admin response into customer history using mocked services", async () => {
    let quoteStatus: "pending" | "answered" = "pending";
    let quotedAmount: number | null = null;
    let responseMessage: string | null = null;

    const quoteRow = () => ({
      id: QUOTE,
      status: quoteStatus,
      createdAt: "2026-11-14T00:00:00Z",
      notes: "Escala 1/6",
      quotedAmount,
      responseMessage,
      deadline: null,
      items: [{ slug: "naruto", quantity: 1 }],
      whatsapp: null,
      postalCode: null,
      scale: "1/6",
      finishing: "pintado",
    });
    const quoteEvents = () => ({
      [QUOTE]: [
        {
          id: 1,
          quoteId: QUOTE,
          type: "submitted",
          fromStatus: null,
          toStatus: "pending",
          amount: null,
          responseText: null,
          createdAt: "2026-11-14T00:00:00Z",
        },
        ...(quoteStatus === "answered"
          ? [
              {
                id: 2,
                quoteId: QUOTE,
                type: "answered",
                fromStatus: "reviewing",
                toStatus: "answered",
                amount: quotedAmount,
                responseText: responseMessage,
                createdAt: "2026-11-14T01:00:00Z",
              },
            ]
          : []),
      ],
    });

    mocks.submit.mockImplementation(async () => {
      quoteStatus = "pending";
      return QUOTE;
    });
    mocks.listMine.mockImplementation(async (_userId, query) => ({
      total: 1,
      limit: query?.limit ?? 20,
      offset: query?.offset ?? 0,
      rows: [quoteRow()],
    }));
    mocks.listAdmin.mockImplementation(async () => ({
      total: 1,
      limit: 25,
      offset: 0,
      rows: [
        {
          id: QUOTE,
          userId: USER,
          customerEmail: "cliente@example.com",
          status: quoteStatus,
          createdAt: "2026-11-14T00:00:00Z",
          notes: "Escala 1/6",
          quotedAmount,
          responseMessage,
          items: [{ slug: "naruto", quantity: 1 }],
        },
      ],
    }));
    mocks.answerAdmin.mockImplementation(async (_quoteId, amount, message) => {
      quoteStatus = "answered";
      quotedAmount = amount;
      responseMessage = message;
      return QUOTE;
    });
    mocks.history.mockImplementation(async (quoteIds: string[]) =>
      quoteIds.includes(QUOTE) ? quoteEvents() : {},
    );

    renderApp("/solicitar-orcamento", true);
    expect(await screen.findByText("Naruto")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Escala desejada" }),
      {
        target: { value: "1/6" },
      },
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Enviar solicitação" }),
    );
    expect(await screen.findByText("Orçamento #22222222")).toBeInTheDocument();
    expect(mocks.submit).toHaveBeenCalledWith(
      USER,
      [{ slug: "naruto", quantity: 1 }],
      "",
      {
        whatsapp: "",
        postalCode: "",
        scale: "1/6",
        finishing: "a definir",
      },
      "quote",
    );

    cleanup();
    renderApp("/admin/orcamentos");
    expect(
      await screen.findByRole("button", { name: "Registrar resposta" }),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Valor-base antes da promoção (R$) " + QUOTE.slice(0, 8),
      }),
      { target: { value: "249,90" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Mensagem ao cliente " + QUOTE.slice(0, 8),
      }),
      { target: { value: "Proposta válida por 7 dias." } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar resposta" }));
    expect(
      await screen.findByText(
        /Resposta registrada e disponível na conta do cliente/,
      ),
    ).toBeInTheDocument();
    expect(mocks.answerAdmin).toHaveBeenCalledWith(
      QUOTE,
      249.9,
      "Proposta válida por 7 dias.",
      0,
    );

    cleanup();
    renderApp("/meus-orcamentos");
    expect(
      await screen.findByText("Proposta válida por 7 dias."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Respondido/)).toBeInTheDocument();
    expect(mocks.history).toHaveBeenCalledWith([QUOTE]);
  });

  it("never claims an unverified navigation-state quote was submitted", async () => {
    renderApp({ pathname: "/meus-orcamentos", state: { sent: QUOTE } });
    expect(
      await screen.findByText("Você ainda não enviou solicitações."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Solicitação enviada. Você poderá acompanhar a resposta aqui.",
      ),
    ).not.toBeInTheDocument();
  });

  it("opens only the exact customer-owned quote from a validated deep link", async () => {
    mocks.listMine.mockResolvedValueOnce({
      total: 1,
      limit: 1,
      offset: 0,
      rows: [
        {
          id: QUOTE,
          status: "reviewing",
          createdAt: "2026-11-14T00:00:00Z",
          notes: null,
          quotedAmount: null,
          responseMessage: null,
          deadline: null,
          items: [{ slug: "naruto", quantity: 1 }],
          whatsapp: null,
          postalCode: null,
          scale: "a definir",
          finishing: "a definir",
        },
      ],
    });
    renderApp("/meus-orcamentos?quote=" + QUOTE);
    expect(
      await screen.findByRole("heading", { name: "Orçamento #22222222" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver todos os orçamentos" }),
    ).toHaveAttribute("href", "/meus-orcamentos");
    expect(mocks.listMine).toHaveBeenCalledWith(USER, {
      quoteId: QUOTE,
      limit: 1,
      offset: 0,
    });
    expect(mocks.history).toHaveBeenCalledWith([QUOTE]);
    expect(
      screen.queryByRole("button", { name: "Próxima" }),
    ).not.toBeInTheDocument();
  });

  it("does not claim an absent customer quote is an empty account", async () => {
    renderApp("/meus-orcamentos?quote=" + QUOTE);
    expect(
      await screen.findByText(
        "Esse orçamento não foi encontrado na sua conta.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Você ainda não enviou solicitações."),
    ).not.toBeInTheDocument();
    expect(mocks.listMine).toHaveBeenCalledWith(USER, {
      quoteId: QUOTE,
      limit: 1,
      offset: 0,
    });
  });

  it("rejects an invalid quote deep link without performing a protected lookup", async () => {
    renderApp("/meus-orcamentos?quote=../../admin");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O link do orçamento é inválido",
    );
    expect(mocks.listMine).not.toHaveBeenCalled();
  });

  it("restores the exact quote deep link after account sign-in", async () => {
    mocks.getUser.mockResolvedValueOnce(null).mockResolvedValue({
      id: USER,
      email: "cliente@example.com",
    });
    mocks.signIn.mockResolvedValue(USER);
    renderApp(
      "/login?next=" + encodeURIComponent("/meus-orcamentos?quote=" + QUOTE),
    );
    fireEvent.change(await screen.findByLabelText("E-mail"), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() =>
      expect(mocks.listMine).toHaveBeenCalledWith(USER, {
        quoteId: QUOTE,
        limit: 1,
        offset: 0,
      }),
    );
  });

  it("preserves selected models and offers login if the session expires during submission", async () => {
    mocks.submit.mockRejectedValueOnce(new Error("User not authenticated"));
    renderApp("/solicitar-orcamento", true);
    fireEvent.click(
      await screen.findByRole("button", { name: "Enviar solicitação" }),
    );
    expect(
      await screen.findByText(
        "Sua sessão expirou. Entre novamente para continuar.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login?next=%2Fsolicitar-orcamento",
    );
    expect(
      screen.queryByText("Nenhum modelo selecionado nesta visita."),
    ).not.toBeInTheDocument();
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
        "Confira os dados de contato da Minha Conta e as preferências deste orçamento.",
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

  it("offers sign-in instead of an ineffective retry after quote-session expiry", async () => {
    mocks.listMine.mockRejectedValueOnce(new Error("User not authenticated"));
    renderApp("/meus-orcamentos");
    expect(
      await screen.findByText(
        "Sua sessão expirou. Entre novamente para continuar.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Entrar novamente" }),
    ).toHaveAttribute("href", "/login?next=%2Fmeus-orcamentos");
    expect(
      screen.queryByRole("button", { name: "Tentar novamente" }),
    ).not.toBeInTheDocument();
  });

  it("lets a customer upload the R$50 pre-sale voucher from their quote history", async () => {
    const preorder = {
      id: QUOTE,
      status: "answered",
      createdAt: "2026-11-14T00:00:00Z",
      deadline: null,
      notes: null,
      items: [{ slug: "naruto", quantity: 1 }],
      quotedAmount: 240,
      listAmount: 300,
      discountPercent: 20,
      discountAmount: 60,
      responseMessage: "Total R$240; sinal de R$50 e saldo na finalização.",
      whatsapp: null,
      postalCode: null,
      scale: "1/10",
      finishing: "pintado",
      isPreorder: true,
      depositAmount: 50,
      remainingAmount: 190,
      paymentStatus: "pending",
      paymentLink: null,
      pixKey: "pix@tonart.example",
      paymentInstructions: "Pague R$50 e envie o comprovante.",
      paymentLinkSentAt: "2026-11-14T00:10:00Z",
      finalPaymentNotifiedAt: null,
      readyForFinalPayment: false,
      paymentVoucherPath: null,
      paymentVoucherType: null,
      paymentVoucherRejectionReason: null,
    };
    mocks.listMine.mockResolvedValue({
      total: 1,
      limit: 20,
      offset: 0,
      rows: [preorder],
    });
    mocks.submitVoucher.mockResolvedValue({
      quoteId: QUOTE,
      paymentType: "deposit",
      amount: 50,
      paymentStatus: "under_review",
    });
    renderApp("/meus-orcamentos");
    expect(await screen.findAllByText(/300,00/)).toHaveLength(1);
    expect(
      screen.getByText(/Desconto Black Friday \(20%\)/)?.parentElement,
    ).toHaveTextContent(/60,00/);
    expect(screen.getByText(/Valor total/)?.parentElement).toHaveTextContent(
      /240,00/,
    );
    expect(screen.getByText("pix@tonart.example")).toBeInTheDocument();
    const file = new File(["proof"], "pix.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Comprovante de pagamento"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar comprovante" }));
    await waitFor(() =>
      expect(mocks.submitVoucher).toHaveBeenCalledWith({
        quoteId: QUOTE,
        paymentType: "deposit",
        file,
        previousVoucherPath: null,
      }),
    );
  });

  it("refreshes quote status after a voucher response cannot be confirmed", async () => {
    const preorder = {
      id: QUOTE,
      status: "answered",
      createdAt: "2026-11-14T00:00:00Z",
      deadline: null,
      notes: null,
      items: [{ slug: "naruto", quantity: 1 }],
      quotedAmount: 240,
      listAmount: 300,
      discountPercent: 20,
      discountAmount: 60,
      responseMessage: "Total R$240; sinal de R$50 e saldo na finalização.",
      whatsapp: null,
      postalCode: null,
      scale: "1/10",
      finishing: "pintado",
      isPreorder: true,
      depositAmount: 50,
      remainingAmount: 190,
      paymentStatus: "pending",
      paymentLink: null,
      pixKey: "pix@tonart.example",
      paymentInstructions: "Pague R$50 e envie o comprovante.",
      paymentLinkSentAt: "2026-11-14T00:10:00Z",
      finalPaymentNotifiedAt: null,
      readyForFinalPayment: false,
      paymentVoucherPath: null,
      paymentVoucherType: null,
      paymentVoucherRejectionReason: null,
    };
    mocks.listMine
      .mockResolvedValueOnce({
        total: 1,
        limit: 20,
        offset: 0,
        rows: [preorder],
      })
      .mockResolvedValueOnce({
        total: 1,
        limit: 20,
        offset: 0,
        rows: [
          {
            ...preorder,
            paymentStatus: "under_review",
            paymentVoucherPath: `quotes/${USER}/${QUOTE}/1788130800000-a1b2c3d4e5f60708.png`,
            paymentVoucherType: "deposit",
          },
        ],
      });
    mocks.submitVoucher.mockRejectedValueOnce(
      new Error("catalog_preorder_voucher_response_invalid"),
    );
    renderApp("/meus-orcamentos");
    const file = new File(["proof"], "pix.png", { type: "image/png" });
    fireEvent.change(await screen.findByLabelText("Comprovante de pagamento"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar comprovante" }));

    await waitFor(() => expect(mocks.listMine).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText("Comprovante em análise"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enviar comprovante" }),
    ).not.toBeInTheDocument();
  });

  it("refreshes customer quotes after an administrator responds", async () => {
    renderApp("/meus-orcamentos");
    expect(
      await screen.findByRole("button", { name: "Atualizar orçamentos" }),
    ).toBeEnabled();
    await waitFor(() => expect(mocks.listMine).toHaveBeenCalledTimes(1));
    fireEvent.click(
      screen.getByRole("button", { name: "Atualizar orçamentos" }),
    );
    await waitFor(() => expect(mocks.listMine).toHaveBeenCalledTimes(2));
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

  it("shows the Black Friday saving and final price in the customer's quote history", async () => {
    mocks.listMine.mockResolvedValue({
      total: 1,
      limit: 20,
      offset: 0,
      rows: [
        {
          id: QUOTE,
          status: "answered",
          createdAt: "2026-11-14T00:00:00Z",
          notes: null,
          quotedAmount: 150,
          listAmount: 300,
          discountPercent: 50,
          discountAmount: 150,
          responseMessage: "Oferta Black Friday aplicada.",
          deadline: null,
          items: [{ slug: "naruto", quantity: 1 }],
          whatsapp: null,
          postalCode: null,
          scale: "a definir",
          finishing: "a definir",
        },
      ],
    });

    renderApp("/meus-orcamentos");

    const listAmountLabel = await screen.findByText(
      "Valor antes da Black Friday",
    );
    expect(listAmountLabel.parentElement).toHaveTextContent(/300,00/);
    expect(
      screen.getByText("Desconto Black Friday (50%)").parentElement,
    ).toHaveTextContent(/150,00/);
    expect(screen.getByText("Valor total").parentElement).toHaveTextContent(
      /150,00/,
    );
    expect(screen.queryByText(/Valor final:/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Desconto Black Friday (50%)")).toHaveLength(1);
  });

  it("keeps Coins out of quote checkout while preserving its ordinary payment flow", async () => {
    mocks.listMine.mockResolvedValue({
      total: 1,
      limit: 20,
      offset: 0,
      rows: [
        {
          id: QUOTE,
          status: "answered",
          createdAt: "2026-11-14T00:00:00Z",
          notes: null,
          quotedAmount: 120,
          listAmount: 120,
          discountPercent: 0,
          discountAmount: 0,
          responseMessage: "Orçamento respondido.",
          deadline: null,
          items: [{ slug: "naruto", quantity: 1 }],
          whatsapp: null,
          postalCode: null,
          scale: "a definir",
          finishing: "a definir",
          isPreorder: false,
          depositAmount: null,
          remainingAmount: null,
          paymentStatus: "pending",
          paymentLink: null,
          pixKey: "pix@tonart.example",
          paymentInstructions: null,
          paymentLinkSentAt: "2026-11-14T01:00:00Z",
          finalPaymentNotifiedAt: null,
          readyForFinalPayment: false,
          paymentVoucherPath: null,
          paymentVoucherType: null,
          paymentVoucherRejectionReason: null,
          coinAmountApplied: 0,
        },
      ],
    });

    renderApp("/meus-orcamentos");

    expect(
      await screen.findByText("Orçamento respondido."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Use seus Coins")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Quantos Coins deseja usar?"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Usar Coins" }),
    ).not.toBeInTheDocument();
    expect(mocks.coinBalance).not.toHaveBeenCalled();
    expect(mocks.applyCoins).not.toHaveBeenCalled();
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

  it("shows the authenticated account in a separate navigation and content layout", async () => {
    renderApp("/perfil");
    expect(
      await screen.findByRole("complementary", {
        name: "Navegação lateral da conta",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Dados da conta" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Segurança da conta" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Cliente");
    expect(screen.getByRole("button", { name: "Salvar dados" })).toBeEnabled();
  });

  it("explains an empty registered name without fabricating profile data", async () => {
    mocks.getProfile.mockResolvedValueOnce({
      id: USER,
      email: "cliente@example.com",
      full_name: null,
      phone: null,
    });
    renderApp("/perfil");
    expect(
      await screen.findByText(/Nome ainda não cadastrado/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome completo")).toHaveValue("");
    expect(mocks.updateProfile).not.toHaveBeenCalled();
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

  it("returns signed-in customers to the requested profile subsection", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.signIn.mockResolvedValue(USER);
    renderApp("/login?next=%2Fperfil%2Fendereco");
    fireEvent.change(await screen.findByLabelText("E-mail"), {
      target: { value: "cliente@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(
      await screen.findByText("Seção autenticada da Minha Conta"),
    ).toBeInTheDocument();
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
  });

  it("continues a verified session to a restored profile subsection", async () => {
    renderApp("/login?next=%2Fperfil%2Fpedidos");
    expect(
      await screen.findByText("Seção autenticada da Minha Conta"),
    ).toBeInTheDocument();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("does not honor arbitrary nested return URLs during authentication", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderApp("/login?next=%2Fperfil%2F..%2F..%2Fadmin");
    expect(
      await screen.findByRole("button", { name: "Entrar" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Seção autenticada da Minha Conta"),
    ).not.toBeInTheDocument();
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

  it("hides signup and preserves login/recovery when Auth closes signup", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.signupAvailability.mockReturnValue("disabled");
    renderApp("/login?mode=signup&next=%2Fsolicitar-orcamento");
    expect(
      await screen.findByRole("button", { name: "Entrar" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cadastrar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Criar conta" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Novos cadastros estão fechados nesta etapa/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Esqueci minha senha" }),
    ).toBeInTheDocument();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("preserves selected quote models and only offers login when signup is closed", async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.signupAvailability.mockReturnValue("disabled");
    renderApp("/solicitar-orcamento", true);
    expect(await screen.findByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/login?next=%2Fsolicitar-orcamento",
    );
    expect(
      screen.queryByRole("link", { name: "Criar conta" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Novos cadastros estão fechados nesta etapa/),
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

  it("does not silently hide administrative access during an outage and supports retry", async () => {
    mocks.hasAdmin
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(true);
    renderApp("/perfil");
    expect(
      await screen.findByText(
        /Não foi possível verificar o acesso administrativo/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Painel administrativo" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Verificar acesso novamente" }),
    );
    expect(
      await screen.findByRole("link", { name: "Painel administrativo" }),
    ).toHaveAttribute("href", "/admin");
    expect(mocks.hasAdmin).toHaveBeenCalledTimes(2);
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

  it("places the verified administrator's console link in the account header", async () => {
    mocks.hasAdmin.mockResolvedValue(true);
    renderApp("/perfil");
    const account = await screen.findByRole("region", {
      name: "Dados da conta",
    });
    expect(
      await within(account).findByRole("link", {
        name: "Painel administrativo",
      }),
    ).toHaveAttribute("href", "/admin");
    expect(
      screen.getAllByRole("link", { name: "Painel administrativo" }),
    ).toHaveLength(1);
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
      await screen.findByRole("button", { name: "Registrar resposta" }),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Valor-base antes da promoção (R$) " + QUOTE.slice(0, 8),
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
    fireEvent.click(screen.getByRole("button", { name: "Registrar resposta" }));
    await waitFor(() =>
      expect(mocks.answerAdmin).toHaveBeenCalledWith(
        QUOTE,
        249.9,
        "Proposta válida por 7 dias.",
        0,
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
