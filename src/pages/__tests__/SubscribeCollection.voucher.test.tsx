import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SubscribeCollection from "@/pages/SubscribeCollection";

const mocks = vi.hoisted(() => ({
  checkout: vi.fn(),
  currentUser: vi.fn(),
  getPaymentSettings: vi.fn(),
  loadCatalogModels: vi.fn(),
  useSubscribeCollectionCheckout: vi.fn(),
}));

vi.mock("@/components/SEOHead", () => ({ default: () => null }));
vi.mock("@/hooks/subscription/useSubscribeCollectionCheckout", () => ({
  useSubscribeCollectionCheckout: mocks.useSubscribeCollectionCheckout,
}));
vi.mock("@/services/subscriptions/subscription-checkout-service", () => ({
  createSubscriptionCheckoutForCurrentUser: mocks.checkout,
}));
vi.mock("@/services/payments/payment-settings-service", () => ({
  getPaymentSettings: mocks.getPaymentSettings,
}));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.currentUser,
}));
vi.mock("@/services/subscriptions/subscription-catalog-service", () => ({
  loadSubscriptionCatalogModels: mocks.loadCatalogModels,
}));
vi.mock("@/config/canonical-catalog-endpoint", () => ({
  CANONICAL_CATALOG_API_BASE: null,
}));

const COLLECTION_ID = "11111111-1111-4111-8111-111111111111";
const PLAN_6_ID = "22222222-2222-4222-8222-222222222222";
const PLAN_12_ID = "33333333-3333-4333-8333-333333333333";
const MODEL_SLUGS = Array.from({ length: 20 }, (_, index) => `terror-model-${index + 1}`);
const CATALOG_MODELS = MODEL_SLUGS.map((slug, index) => ({
  id: `model-${index + 1}`,
  slug,
  code: `TM-${index + 1}`,
  name: `Terror Model ${index + 1}`,
  variantName: "",
  category: "Terror",
  categorySlug: "terror",
  franchise: "Coleção Terror",
  franchiseSlug: "colecao-terror",
  collection: null,
  folderPath: null,
  imageCount: 1,
  galleryVersion: 1,
  coverStorageKey: null,
  description: null,
  material: null,
  heightCm: null,
  imageUrl: null,
}));

function plan(limit: 6 | 12) {
  return {
    id: limit === 6 ? PLAN_6_ID : PLAN_12_ID,
    name: `Plano ${limit} modelos`,
    description: null,
    plan_type: "trimestral",
    price_pix: 300,
    price_full: 360,
    deliveries_total: 3,
    total_credits: null,
    model_selection_limit: limit,
    is_active: true,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/assinar/terror"]}>
        <Routes>
          <Route path="/assinar/:slug" element={<SubscribeCollection />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function attachVoucher(user: ReturnType<typeof userEvent.setup>) {
  const input = screen.getByLabelText(/Escolher arquivo do comprovante/i);
  await user.upload(input, new File(["pix recebido"], "comprovante.pdf", { type: "application/pdf" }));
}

async function modelButtons() {
  await screen.findByText("Terror Model 1", { exact: true });
  return screen.getAllByRole("button", { name: /^Terror Model \d+\b/i });
}

describe("SubscribeCollection curated model checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useSubscribeCollectionCheckout.mockReturnValue({
      plans: [plan(6), plan(12)],
      plansLoading: false,
      collections: [{
        id: COLLECTION_ID,
        name: "Coleção Terror",
        slug: "terror",
        description: "Modelos escolhidos para a coleção de terror.",
        image_url: null,
        is_active: true,
        catalog_model_slugs: MODEL_SLUGS,
      }],
      collectionsLoading: false,
      initialCollectionLoading: false,
      loadError: null,
      retryLoad: vi.fn(),
    });
    mocks.loadCatalogModels.mockResolvedValue(CATALOG_MODELS);
    mocks.getPaymentSettings.mockResolvedValue({
      payment_type: "subscription",
      subscription_period: "quarterly",
      pix_key: "tonart@example.com",
      payment_link: "",
    });
    mocks.currentUser.mockResolvedValue({ id: "44444444-4444-4444-8444-444444444444" });
    mocks.checkout.mockResolvedValue({
      subscriptionId: "55555555-5555-4555-8555-555555555555",
      paymentId: "66666666-6666-4666-8666-666666666666",
      referenceNumber: "TON-TEST-12345",
      amount: 300,
      status: "under_review",
    });
  });

  it("submits exactly six selected models from the curated collection with the voucher", async () => {
    const user = userEvent.setup();
    renderPage();

    const models = await modelButtons();
    await screen.findByText("Chave PIX");

    for (const model of models.slice(0, 6)) {
      fireEvent.click(model);
    }

    expect(screen.getByText("6 de 6 selecionados")).toBeInTheDocument();
    expect(models[6]).toBeDisabled();
    await attachVoucher(user);
    await user.click(screen.getByRole("button", { name: /Enviar comprovante e solicitar assinatura/i }));

    await waitFor(() => {
      expect(mocks.checkout).toHaveBeenCalledWith({
        planId: PLAN_6_ID,
        collectionId: COLLECTION_ID,
        selectedModelSlugs: MODEL_SLUGS.slice(0, 6),
        modelSelectionLimit: 6,
        voucher: expect.any(File),
      });
    });
    expect(await screen.findByRole("heading", { name: "Sua solicitação está em análise" })).toBeInTheDocument();
  });

  it("switches to the twelve-model plan and prevents submitting an incomplete selection", async () => {
    const user = userEvent.setup();
    renderPage();

    const models = await modelButtons();
    await user.click(screen.getAllByRole("button", { name: "Selecionar plano" })[0]);

    expect(screen.getByRole("heading", { name: "Escolha 12 modelos" })).toBeInTheDocument();
    await attachVoucher(user);
    expect(screen.getByRole("button", { name: /Enviar comprovante e solicitar assinatura/i })).toBeDisabled();

    for (const model of models.slice(0, 12)) {
      fireEvent.click(model);
    }

    expect(screen.getByText("12 de 12 selecionados")).toBeInTheDocument();
    expect(models[12]).toBeDisabled();
    expect(screen.getByRole("button", { name: /Enviar comprovante e solicitar assinatura/i })).toBeEnabled();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
});
