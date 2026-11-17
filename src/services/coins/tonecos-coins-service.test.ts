import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  applyTonecosCoinsToQuote,
  getMyTonecosCoinBalance,
  listMyTonecosCoinEntries,
  creditTonecosCoins,
  findTonecosCoinRecipient,
  reverseTonecosCoinEntry,
} from "./tonecos-coins-service";

const USER = "11111111-1111-4111-8111-111111111111";
const REF = "22222222-2222-4222-8222-222222222222";
const TX = "33333333-3333-4333-8333-333333333333";
const QUOTE = "44444444-4444-4444-8444-444444444444";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  user: vi.fn(),
  isLocalPreviewActive: vi.fn(() => false),
  assertCommercialEnabled: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock("@/services/customer/tonecos-account-service", () => ({
  isTonecosLocalPreviewEnabled: mocks.isLocalPreviewActive,
  getTonecosCurrentUser: mocks.user,
}));
vi.mock("@/config/tonecos-commercial-authority", () => ({
  assertTonecosCommercialEnabled: mocks.assertCommercialEnabled,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "true");
  vi.stubEnv("VITE_TONECOS_COINS_ENABLED", "true");
  vi.stubEnv("VITE_SUPABASE_URL", "https://icmtmaakjucmuzxnofkd.supabase.co");
  mocks.user.mockResolvedValue({ id: USER, email: "cliente@example.test" });
  mocks.isLocalPreviewActive.mockReturnValue(false);
  mocks.assertCommercialEnabled.mockReset();
  mocks.assertCommercialEnabled.mockImplementation(() => undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("Tonecos Coins ledger authority", () => {
  it("serves the local customer's wallet data without calling Supabase", async () => {
    mocks.isLocalPreviewActive.mockReturnValue(true);
    mocks.user.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      email: "marina.oliveira@tonart.local",
    });

    await expect(getMyTonecosCoinBalance()).resolves.toMatchObject({
      balance: 150,
      totalEarned: 150,
      totalSpent: 0,
      entryCount: 2,
    });
    await expect(listMyTonecosCoinEntries()).resolves.toHaveLength(2);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("reads private coins with quotes disabled, without reactivating quotes", async () => {
    vi.stubEnv("VITE_CATALOG_QUOTES_ENABLED", "false");
    mocks.rpc.mockResolvedValue({
      data: {
        balance: 0,
        total_earned: 0,
        total_spent: 0,
        entry_count: 0,
        updated_at: null,
      },
      error: null,
    });
    await expect(getMyTonecosCoinBalance()).resolves.toMatchObject({
      balance: 0,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_my_tonecos_coin_balance");
  });

  it("returns only server-computed ledger values; empty means a real empty ledger", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        balance: 0,
        total_earned: 0,
        total_spent: 0,
        entry_count: 0,
        updated_at: null,
      },
      error: null,
    });
    await expect(getMyTonecosCoinBalance()).resolves.toEqual({
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      entryCount: 0,
      updatedAt: null,
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "get_my_tonecos_coin_balance",
    );
  });

  it("fails closed on permission/network errors and inconsistent balances", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "offline" },
    });
    await expect(getMyTonecosCoinBalance()).rejects.toMatchObject({
      message: "offline",
    });
    mocks.rpc.mockResolvedValueOnce({
      data: {
        balance: 999,
        total_earned: 100,
        total_spent: 1,
        entry_count: 1,
        updated_at: null,
      },
      error: null,
    });
    await expect(getMyTonecosCoinBalance()).rejects.toThrow(
      "tonecos_coin_balance_invalid",
    );
  });

  it("blocks read-only previews and ignores the retired coins feature switch", async () => {
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    mocks.assertCommercialEnabled.mockImplementationOnce(() => {
      throw new Error("tonecos_commercial_mvp_disabled");
    });
    await expect(getMyTonecosCoinBalance()).rejects.toThrow(
      "tonecos_commercial_mvp_disabled",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    vi.stubEnv("VITE_TONECOS_COINS_ENABLED", "false");
    mocks.rpc.mockResolvedValueOnce({
      data: {
        balance: 0,
        total_earned: 0,
        total_spent: 0,
        entry_count: 0,
        updated_at: null,
      },
      error: null,
    });
    await expect(getMyTonecosCoinBalance()).resolves.toMatchObject({
      balance: 0,
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "get_my_tonecos_coin_balance",
    );
  });

  it("requires authenticated owner for all reads", async () => {
    mocks.user.mockResolvedValue(null);
    await expect(getMyTonecosCoinBalance()).rejects.toThrow(
      "tonecos_login_required",
    );
    await expect(listMyTonecosCoinEntries()).rejects.toThrow(
      "tonecos_login_required",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reads at most fifty owner-scoped ledger entries with no direct writes", async () => {
    const q = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() };
    q.select.mockReturnValue(q);
    q.eq.mockReturnValue(q);
    q.order.mockReturnValue(q);
    q.range.mockResolvedValue({
      data: [
        {
          id: TX,
          delta: 23,
          entry_type: "admin_credit",
          reason: "Crédito manual",
          created_at: "2026-11-05T08:00:00Z",
        },
      ],
      error: null,
    });
    mocks.from.mockReturnValue(q);
    const rows = await listMyTonecosCoinEntries(10);
    expect(rows).toEqual([
      {
        id: TX,
        delta: 23,
        type: "admin_credit",
        reason: "Crédito manual",
        createdAt: "2026-11-05T08:00:00Z",
      },
    ]);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("tonecos_coin_entries");
    expect(q.eq).toHaveBeenCalledWith("user_id", USER);
    expect(q.order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: false,
    });
    expect(q.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(q.range).toHaveBeenCalledWith(0, 9);
    await listMyTonecosCoinEntries(10, 25);
    expect(q.range).toHaveBeenLastCalledWith(25, 34);
    q.range.mockResolvedValueOnce({
      data: [
        {
          id: TX,
          delta: -7.25,
          entry_type: "legacy_import",
          reason: "Histórico Coins legado (spend): compra antiga",
          created_at: "2026-10-05T08:00:00Z",
        },
      ],
      error: null,
    });
    await expect(listMyTonecosCoinEntries(10)).resolves.toMatchObject([
      { type: "legacy_import", delta: -7.25 },
    ]);
    await expect(listMyTonecosCoinEntries(100)).rejects.toThrow(
      "tonecos_coin_limit_invalid",
    );
    await expect(listMyTonecosCoinEntries(25, 100001)).rejects.toThrow(
      "tonecos_coin_limit_invalid",
    );
  });

  it("never trusts malformed ledger entries", async () => {
    const q = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() };
    q.select.mockReturnValue(q);
    q.eq.mockReturnValue(q);
    q.order.mockReturnValue(q);
    q.range.mockResolvedValue({
      data: [
        {
          id: TX,
          delta: 10,
          entry_type: "self_credit",
          reason: "Não autorizado",
          created_at: "2026-11-05T08:00:00Z",
        },
      ],
      error: null,
    });
    mocks.from.mockReturnValue(q);
    await expect(listMyTonecosCoinEntries()).rejects.toThrow(
      "tonecos_coin_entry_invalid",
    );
  });

  it("looks up a single exact customer by e-mail only through restricted admin RPC", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        id: USER,
        email: "client@example.test",
        full_name: "Cliente",
      },
      error: null,
    });
    await expect(
      findTonecosCoinRecipient(" CLIENT@EXAMPLE.TEST "),
    ).resolves.toEqual({
      id: USER,
      email: "client@example.test",
      fullName: "Cliente",
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "find_tonecos_coin_recipient",
      {
        p_email: "client@example.test",
      },
    );
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Admin access required" },
    });
    await expect(
      findTonecosCoinRecipient("client@example.test"),
    ).rejects.toMatchObject({ message: "Admin access required" });
  });

  it("does not expose directory results to invalid or missing e-mails", async () => {
    await expect(findTonecosCoinRecipient("../admin")).rejects.toThrow(
      "tonecos_coin_recipient_email_invalid",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(
      findTonecosCoinRecipient("other@example.test"),
    ).resolves.toBeNull();
  });

  it("issues only an authenticated admin RPC with explicit idempotency reference", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        user_id: USER,
        credited: 23,
        balance: 23,
        transaction_id: TX,
        idempotent: false,
      },
      error: null,
    });
    await expect(
      creditTonecosCoins({
        userId: USER,
        amount: 23,
        referenceKey: REF,
        reason: "  Crédito manual  ",
      }),
    ).resolves.toEqual({
      userId: USER,
      credited: 23,
      balance: 23,
      transactionId: TX,
      idempotent: false,
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "admin_credit_tonecos_coins",
      {
        p_user_id: USER,
        p_amount: 23,
        p_reference_key: REF,
        p_reason: "Crédito manual",
      },
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("refuses invalid credit inputs, nonadmin errors and malformed results", async () => {
    await expect(
      creditTonecosCoins({
        userId: USER,
        amount: 0,
        referenceKey: REF,
        reason: "Crédito manual",
      }),
    ).rejects.toThrow("tonecos_coin_credit_input_invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Admin access required" },
    });
    await expect(
      creditTonecosCoins({
        userId: USER,
        amount: 1,
        referenceKey: REF,
        reason: "Crédito manual",
      }),
    ).rejects.toMatchObject({ message: "Admin access required" });
    mocks.rpc.mockResolvedValueOnce({
      data: {
        user_id: USER,
        credited: 1,
        balance: 0,
        transaction_id: TX,
        idempotent: false,
      },
      error: null,
    });
    await expect(
      creditTonecosCoins({
        userId: USER,
        amount: 1,
        referenceKey: REF,
        reason: "Crédito manual",
      }),
    ).rejects.toThrow("tonecos_coin_credit_result_invalid");
  });

  it("keeps quote redemption closed because quotes are not eligible offers", async () => {
    await expect(
      applyTonecosCoinsToQuote({ quoteId: QUOTE, amount: 23 }),
    ).rejects.toThrow("tonecos_coins_not_eligible_for_quotes");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects invalid coin amounts before contacting the database", async () => {
    await expect(
      applyTonecosCoinsToQuote({ quoteId: QUOTE, amount: 0 }),
    ).rejects.toThrow("tonecos_coin_quote_payment_input_invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("validates and returns an idempotent Coins reversal result with exact hundredths", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { transaction_id: TX, balance: "24.50", idempotent: true },
      error: null,
    });
    await expect(reverseTonecosCoinEntry({ entryId: REF, reason: "Correção solicitada" })).resolves.toEqual({
      transactionId: TX,
      balance: 24.5,
      idempotent: true,
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("admin_reverse_tonecos_coin_entry", {
      p_entry_id: REF,
      p_reason: "Correção solicitada",
    });

    await expect(reverseTonecosCoinEntry({ entryId: REF, reason: "x" })).rejects.toThrow(
      "tonecos_coin_reversal_input_invalid",
    );
  });
});
