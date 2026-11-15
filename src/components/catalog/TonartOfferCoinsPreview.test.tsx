import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TonartOfferCoinsPreview } from "./TonartOfferCoinsPreview";
import type { TonartCommercialOffer } from "@/services/commercial/tonart-commercial-offer";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  coinBalance: vi.fn(),
}));

vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.currentUser,
}));

vi.mock("@/services/coins/tonecos-coins-service", () => ({
  getMyTonecosCoinBalance: mocks.coinBalance,
}));

const offer: TonartCommercialOffer = {
  id: "b0000000-0000-4000-8000-000000000001",
  catalogModelSlug: "sample-model",
  scale: "1/10",
  finishing: "painted",
  contentsDescription: "Uma peça pintada.",
  itemPriceBrl: 250,
  shippingMode: "fixed",
  shippingAmountBrl: 12.99,
  deliveryTerms: "Prazo informado na oferta.",
  coinsEligible: true,
  subscriberDiscountEligible: true,
  isActive: true,
  updatedAt: "2026-11-15T12:00:00.000Z",
};

function renderPreview() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TonartOfferCoinsPreview offer={offer} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TonartOfferCoinsPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("separa Coins, saldo em reais e frete e permite simular sem Coins", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "a0000000-0000-4000-8000-000000000001",
      email: "cliente@example.com",
    });
    mocks.coinBalance.mockResolvedValue({
      balance: 30.5,
      totalEarned: 30.5,
      totalSpent: 0,
      entryCount: 1,
      updatedAt: "2026-11-15T12:00:00.000Z",
    });

    renderPreview();

    expect(await screen.findByText("Saldo: 30,50 Coins")).toBeTruthy();
    expect(screen.getByText(/219,50/)).toBeTruthy();
    expect(screen.getByText(/12,99/)).toBeTruthy();
    expect(screen.getByText(/232,49/)).toBeTruthy();
    expect(
      screen.getByText(/sem aplicar eventual desconto de assinante/i),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Aplicar Coins disponíveis à peça nesta simulação",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(/250,00/)).toBeTruthy();
      expect(screen.getByText(/262,99/)).toBeTruthy();
    });
  });

  it("encaminha clientes sem sessão ao login para consultar Coins", async () => {
    mocks.currentUser.mockResolvedValue(null);

    renderPreview();

    const loginLink = await screen.findByRole("link", {
      name: "Acessar minha conta",
    });
    expect(loginLink.getAttribute("href")).toBe("/login?next=%2Fmoedas");
    expect(mocks.coinBalance).not.toHaveBeenCalled();
  });

  it("não converte falha da carteira em saldo zero", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "a0000000-0000-4000-8000-000000000001",
      email: "cliente@example.com",
    });
    mocks.coinBalance.mockRejectedValue(new Error("wallet_unavailable"));

    renderPreview();

    expect(
      await screen.findByText(
        /O saldo não foi tratado como zero/i,
        undefined,
        { timeout: 4_000 },
      ),
    ).toBeTruthy();
  });
});
