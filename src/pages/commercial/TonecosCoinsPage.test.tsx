import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TonecosCoinsPage from "./TonecosCoinsPage";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), balance: vi.fn(), entries: vi.fn(),
}));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.getUser,
}));
vi.mock("@/services/coins/tonecos-coins-service", () => ({
  getMyTonecosCoinBalance: mocks.balance,
  listMyTonecosCoinEntries: mocks.entries,
}));
function renderPage() {
  return render(<MemoryRouter><TonecosCoinsPage /></MemoryRouter>);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", email: "u@example.test" });
  mocks.entries.mockResolvedValue([]);
  mocks.balance.mockResolvedValue({
    balance: 0, totalEarned: 0, totalSpent: 0, entryCount: 0, updatedAt: null,
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("commercial coins account UI", () => {
  it("shows an actual empty ledger as 0 only after successful Supabase read", async () => {
    renderPage();
    expect(await screen.findByText("Nenhuma movimentação registrada.")).toBeInTheDocument();
    expect(screen.getAllByText("0", { selector: "p" })).toHaveLength(3);
    expect(mocks.entries).toHaveBeenCalledWith(25);
  });
  it("never displays a fake zero balance when Supabase is offline", async () => {
    mocks.balance.mockRejectedValue(new Error("offline"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
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
      balance: 15, totalEarned: 20, totalSpent: 5, entryCount: 2,
      updatedAt: "2026-11-05T08:00:00Z",
    });
    mocks.entries.mockResolvedValue([{
      id: "33333333-3333-4333-8333-333333333333", delta: 20,
      type: "admin_credit", reason: "Crédito manual", createdAt: "2026-11-05T08:00:00Z",
    }]);
    renderPage();
    expect(await screen.findByText("Crédito manual")).toBeInTheDocument();
    expect(screen.getByText("+20")).toBeInTheDocument();
    expect(screen.getByText("15", { selector: "p" })).toBeInTheDocument();
  });
});
