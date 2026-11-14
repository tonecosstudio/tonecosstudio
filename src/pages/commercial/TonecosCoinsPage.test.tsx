import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import TonecosCoinsPage from "./TonecosCoinsPage";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  balance: vi.fn(),
  entries: vi.fn(),
}));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.getUser,
}));
vi.mock("@/services/coins/tonecos-coins-service", () => ({
  getMyTonecosCoinBalance: mocks.balance,
  listMyTonecosCoinEntries: mocks.entries,
}));
function renderPage() {
  return render(
    <MemoryRouter>
      <HelmetProvider>
        <TonecosCoinsPage />
      </HelmetProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({
    id: "11111111-1111-4111-8111-111111111111",
    email: "u@example.test",
  });
  mocks.entries.mockResolvedValue([]);
  mocks.balance.mockResolvedValue({
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    entryCount: 0,
    updatedAt: null,
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("commercial coins account UI", () => {
  it("shows an actual empty ledger as 0 only after successful Supabase read", async () => {
    renderPage();
    expect(
      await screen.findByText(/1 Coin abate R\$ 1 do valor em aberto/),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Nenhuma movimentação registrada."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("0", { selector: "p" })).toHaveLength(3);
    expect(mocks.entries).toHaveBeenCalledWith(25, 0);
  });
  it("never displays a fake zero balance when Supabase is offline", async () => {
    mocks.balance.mockRejectedValue(new Error("offline"));
    renderPage();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível conectar à carteira.");
    expect(alert).not.toHaveTextContent("offline");
    expect(screen.queryByText("Saldo disponível")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(mocks.balance).toHaveBeenCalledTimes(2));
  });
  it("prompts guests to log in without calling the ledger", async () => {
    mocks.getUser.mockResolvedValue(null);
    renderPage();
    const login = await screen.findByRole("link", { name: "Entrar" });
    expect(login).toHaveAttribute("href", "/login?next=%2Fmoedas");
    expect(mocks.balance).not.toHaveBeenCalled();
    expect(mocks.entries).not.toHaveBeenCalled();
  });
  it("renders server-provided gains and spending with movement history", async () => {
    mocks.balance.mockResolvedValue({
      balance: 15,
      totalEarned: 20,
      totalSpent: 5,
      entryCount: 2,
      updatedAt: "2026-11-05T08:00:00Z",
    });
    mocks.entries.mockResolvedValue([
      {
        id: "33333333-3333-4333-8333-333333333333",
        delta: 20,
        type: "admin_credit",
        reason: "Crédito manual",
        createdAt: "2026-11-05T08:00:00Z",
      },
    ]);
    renderPage();
    expect(await screen.findByText("Crédito manual")).toBeInTheDocument();
    expect(screen.getByText("+20")).toBeInTheDocument();
    expect(screen.getByText("15", { selector: "p" })).toBeInTheDocument();
  });

  it("pages through the full append-only coin history", async () => {
    const entries = (start: number, count: number) => Array.from({ length: count }, (_, index) => ({
      id: `movement-${start + index}`,
      delta: 1,
      type: "admin_credit" as const,
      reason: `Crédito ${start + index}`,
      createdAt: "2026-11-05T08:00:00Z",
    }));
    mocks.balance.mockResolvedValue({
      balance: 32,
      totalEarned: 32,
      totalSpent: 0,
      entryCount: 32,
      updatedAt: "2026-11-05T08:00:00Z",
    });
    mocks.entries
      .mockResolvedValue(entries(0, 25))
      .mockResolvedValueOnce(entries(0, 25))
      .mockResolvedValueOnce(entries(25, 7));

    renderPage();

    expect(await screen.findByText("Crédito 0")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–25 de 32")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Movimentações mais antigas" }));
    expect(await screen.findByText("Crédito 25")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 26–32 de 32")).toBeInTheDocument();
    expect(mocks.entries).toHaveBeenLastCalledWith(25, 25);
    fireEvent.click(screen.getByRole("button", { name: "Movimentações mais recentes" }));
    expect(await screen.findByText("Crédito 0")).toBeInTheDocument();
    expect(mocks.entries).toHaveBeenLastCalledWith(25, 0);
  });

  it("offers sign-in instead of retry when the wallet session has expired", async () => {
    mocks.balance.mockRejectedValue(new Error("tonecos_login_required"));
    renderPage();
    const login = await screen.findByRole("link", { name: "Entrar novamente" });
    expect(login).toHaveAttribute("href", "/login?next=%2Fmoedas");
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
  });
});
