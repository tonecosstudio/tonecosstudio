import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  getMyTonecosCoinBalance, listMyTonecosCoinEntries, creditTonecosCoins,
  findTonecosCoinRecipient,
} from "./tonecos-coins-service";

const USER = "11111111-1111-4111-8111-111111111111";
const REF = "22222222-2222-4222-8222-222222222222";
const TX = "33333333-3333-4333-8333-333333333333";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), user: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.user,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  vi.stubEnv("VITE_TONECOS_COINS_ENABLED", "true");
  vi.stubEnv("VITE_SUPABASE_URL", "https://icmtmaakjucmuzxnofkd.supabase.co");
  mocks.user.mockResolvedValue({ id: USER, email: "cliente@example.test" });
});
afterEach(() => vi.unstubAllEnvs());

describe("Tonecos Coins ledger authority", () => {
  it("returns only server-computed ledger values; empty means a real empty ledger", async () => {
    mocks.rpc.mockResolvedValue({ data: {
      balance: 0, total_earned: 0, total_spent: 0, entry_count: 0, updated_at: null,
    }, error: null });
    await expect(getMyTonecosCoinBalance()).resolves.toEqual({
      balance: 0, totalEarned: 0, totalSpent: 0, entryCount: 0, updatedAt: null,
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("get_my_tonecos_coin_balance");
  });

  it("fails closed on permission/network errors and inconsistent balances", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "offline" } });
    await expect(getMyTonecosCoinBalance()).rejects.toMatchObject({ message: "offline" });
    mocks.rpc.mockResolvedValueOnce({ data: {
      balance: 999, total_earned: 100, total_spent: 1, entry_count: 1, updated_at: null,
    }, error: null });
    await expect(getMyTonecosCoinBalance()).rejects.toThrow("tonecos_coin_balance_invalid");
  });

  it("never contacts Supabase in public preview or before coins activation", async () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    await expect(getMyTonecosCoinBalance()).rejects.toThrow("catalog_quotes_not_enabled");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    vi.stubEnv("VITE_TONECOS_COINS_ENABLED", "false");
    await expect(listMyTonecosCoinEntries()).rejects.toThrow("tonecos_coins_not_enabled");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("requires authenticated owner for all reads", async () => {
    mocks.user.mockResolvedValue(null);
    await expect(getMyTonecosCoinBalance()).rejects.toThrow("tonecos_login_required");
    await expect(listMyTonecosCoinEntries()).rejects.toThrow("tonecos_login_required");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reads at most fifty owner-scoped ledger entries with no direct writes", async () => {
    const q = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
    q.select.mockReturnValue(q);
    q.eq.mockReturnValue(q);
    q.order.mockReturnValue(q);
    q.limit.mockResolvedValue({ data: [{
      id: TX, delta: 23, entry_type: "admin_credit", reason: "Crédito manual",
      created_at: "2026-11-05T08:00:00Z",
    }], error: null });
    mocks.from.mockReturnValue(q);
    const rows = await listMyTonecosCoinEntries(10);
    expect(rows).toEqual([{
      id: TX, delta: 23, type: "admin_credit", reason: "Crédito manual",
      createdAt: "2026-11-05T08:00:00Z",
    }]);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("tonecos_coin_entries");
    expect(q.eq).toHaveBeenCalledWith("user_id", USER);
    expect(q.limit).toHaveBeenCalledWith(10);
    await expect(listMyTonecosCoinEntries(100)).rejects.toThrow("tonecos_coin_limit_invalid");
  });

  it("never trusts malformed ledger entries", async () => {
    const q = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
    q.select.mockReturnValue(q); q.eq.mockReturnValue(q); q.order.mockReturnValue(q);
    q.limit.mockResolvedValue({ data: [{
      id: TX, delta: 10, entry_type: "self_credit", reason: "Não autorizado",
      created_at: "2026-11-05T08:00:00Z",
    }], error: null });
    mocks.from.mockReturnValue(q);
    await expect(listMyTonecosCoinEntries()).rejects.toThrow("tonecos_coin_entry_invalid");
  });

  it("looks up a single exact customer by e-mail only through restricted admin RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: {
      id: USER, email: "client@example.test", full_name: "Cliente",
    }, error: null });
    await expect(findTonecosCoinRecipient(" CLIENT@EXAMPLE.TEST ")).resolves.toEqual({
      id: USER, email: "client@example.test", fullName: "Cliente",
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("find_tonecos_coin_recipient", {
      p_email: "client@example.test",
    });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "Admin access required" } });
    await expect(findTonecosCoinRecipient("client@example.test"))
      .rejects.toMatchObject({ message: "Admin access required" });
  });

  it("does not expose directory results to invalid or missing e-mails", async () => {
    await expect(findTonecosCoinRecipient("../admin"))
      .rejects.toThrow("tonecos_coin_recipient_email_invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(findTonecosCoinRecipient("other@example.test")).resolves.toBeNull();
  });

  it("issues only an authenticated admin RPC with explicit idempotency reference", async () => {
    mocks.rpc.mockResolvedValue({ data: {
      user_id: USER, credited: 23, balance: 23, transaction_id: TX,
      idempotent: false,
    }, error: null });
    await expect(creditTonecosCoins({
      userId: USER, amount: 23, referenceKey: REF, reason: "  Crédito manual  ",
    })).resolves.toEqual({
      userId: USER, credited: 23, balance: 23, transactionId: TX, idempotent: false,
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("admin_credit_tonecos_coins", {
      p_user_id: USER, p_amount: 23, p_reference_key: REF,
      p_reason: "Crédito manual",
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("refuses invalid credit inputs, nonadmin errors and malformed results", async () => {
    await expect(creditTonecosCoins({
      userId: USER, amount: 0, referenceKey: REF, reason: "Crédito manual",
    })).rejects.toThrow("tonecos_coin_credit_input_invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "Admin access required" } });
    await expect(creditTonecosCoins({
      userId: USER, amount: 1, referenceKey: REF, reason: "Crédito manual",
    })).rejects.toMatchObject({ message: "Admin access required" });
    mocks.rpc.mockResolvedValueOnce({ data: {
      user_id: USER, credited: 1, balance: 0, transaction_id: TX, idempotent: false,
    }, error: null });
    await expect(creditTonecosCoins({
      userId: USER, amount: 1, referenceKey: REF, reason: "Crédito manual",
    })).rejects.toThrow("tonecos_coin_credit_result_invalid");
  });
});
