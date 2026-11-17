import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import AdminCoins from "./TonecosAdminCoinsPage";

const USER = "11111111-1111-4111-8111-111111111111";
const REF = "22222222-2222-4222-8222-222222222222";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), credit: vi.fn(), reverse: vi.fn(), overview: vi.fn() }));
vi.mock("@/services/coins/tonecos-coins-service", () => ({
  findTonecosCoinRecipient: mocks.lookup,
  creditTonecosCoins: mocks.credit,
  reverseTonecosCoinEntry: mocks.reverse,
}));
vi.mock("@/services/admin/overview/tonart-admin-workspace-service", () => ({
  getTonartAdminOverview: mocks.overview,
}));
function renderPage() {
  return render(
    <MemoryRouter>
      <HelmetProvider>
        <AdminCoins />
      </HelmetProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.overview.mockResolvedValue({ recentCoinEntries: [] });
  vi.stubGlobal("crypto", { randomUUID: () => REF });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Tonecos controlled coin credit page", () => {
  it("does not expose a customer directory when admin authorization is denied", async () => {
    mocks.lookup.mockRejectedValue(new Error("Admin access required"));
    renderPage();
    fireEvent.change(screen.getByRole("textbox", { name: "E-mail exato" }), {
      target: { value: "client@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Localizar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Acesso administrativo não autorizado.",
    );
    expect(
      screen.queryByRole("button", { name: "Confirmar crédito" }),
    ).not.toBeInTheDocument();
    expect(mocks.credit).not.toHaveBeenCalled();
  });

  it("looks up a single customer and credits via an idempotent server-side RPC", async () => {
    mocks.lookup.mockResolvedValue({
      id: USER,
      email: "client@example.test",
      fullName: "Cliente",
    });
    mocks.credit.mockResolvedValue({
      userId: USER,
      credited: 23,
      balance: 23,
      transactionId: REF,
      idempotent: false,
    });
    renderPage();
    fireEvent.change(screen.getByRole("textbox", { name: "E-mail exato" }), {
      target: { value: "client@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Localizar" }));
    expect(
      await screen.findByText(/Cliente · client@example.test/),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Quantidade de moedas" }),
      {
        target: { value: "23" },
      },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Justificativa do crédito" }),
      {
        target: { value: "Crédito manual autorizado" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar crédito" }));
    await waitFor(() =>
      expect(mocks.credit).toHaveBeenCalledWith({
        userId: USER,
        amount: 23,
        referenceKey: REF,
        reason: "Crédito manual autorizado",
      }),
    );
    expect(
      await screen.findByText(/23 moedas registradas/),
    ).toBeInTheDocument();
  });

  it("reverses only an eligible ledger entry and refreshes the same history", async () => {
    const entry = {
      id: REF,
      userId: USER,
      userEmail: "client@example.test",
      type: "purchase_spend",
      delta: -25.5,
      reason: "Compra extra",
      createdAt: "2026-11-14T12:00:00Z",
      reversesEntryId: null,
    };
    mocks.overview
      .mockResolvedValueOnce({ recentCoinEntries: [entry] })
      .mockResolvedValueOnce({ recentCoinEntries: [
        entry,
        { ...entry, id: "33333333-3333-4333-8333-333333333333", type: "purchase_reversal", delta: 25.5, reversesEntryId: REF },
      ] });
    mocks.reverse.mockResolvedValue({ transactionId: "33333333-3333-4333-8333-333333333333", balance: 30, idempotent: false });
    renderPage();
    expect(await screen.findByText(/client@example\.test/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Motivo da reversão" }), {
      target: { value: "Correção de compra cancelada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reverter lançamento" }));
    await waitFor(() => expect(mocks.reverse).toHaveBeenCalledWith({
      entryId: REF,
      reason: "Correção de compra cancelada",
    }));
    expect(await screen.findByText(/Movimentação revertida/)).toBeInTheDocument();
    expect(await screen.findByText("Reversão já registrada no ledger.")).toBeInTheDocument();
  });
});
