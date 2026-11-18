import { beforeEach, describe, expect, it, vi } from "vitest";
import { CoinsTransactionType } from "@/types/coins";
import { fetchCoinsBalance } from "./coins-balance-service";
import {
  getCoinTransaction,
  getCoinTransactionStats,
  listCoinsTransactions,
  listRecentCoinTransactions,
} from "./coins-transactions-service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const TRANSACTION_ID = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  requireAuthenticatedUserId: vi.fn(),
  assertCurrentUserId: vi.fn(),
  getTonecosCurrentUser: vi.fn(),
  getMyTonecosCoinBalance: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/services/auth/current-user", () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
  assertCurrentUserId: mocks.assertCurrentUserId,
}));

vi.mock("@/services/customer/tonecos-account-service", () => ({
  getTonecosCurrentUser: mocks.getTonecosCurrentUser,
}));

vi.mock("./tonecos-coins-service", () => ({
  getMyTonecosCoinBalance: mocks.getMyTonecosCoinBalance,
}));

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
};

function createListQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    range: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lte.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

function createSingleQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function createStatsQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lte.mockReturnValue(query);
  return query;
}

function createRecentQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

function transactionRow(
  transaction_type: "purchase" | "spend" | "refund" | "bonus" | "adjustment" = "purchase",
  amount = 100,
) {
  return {
    id: TRANSACTION_ID,
    user_id: USER_ID,
    amount,
    transaction_type,
    description: null,
    reference_id: null,
    reference_type: null,
    created_at: "2026-09-17T12:00:00.000Z",
  };
}

describe("coins balance service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUserId.mockResolvedValue(USER_ID);
    mocks.assertCurrentUserId.mockResolvedValue(undefined);
    mocks.getTonecosCurrentUser.mockResolvedValue({ id: USER_ID });
    mocks.getMyTonecosCoinBalance.mockResolvedValue({
      balance: 250,
      totalEarned: 400,
      totalSpent: 150,
      entryCount: 2,
      updatedAt: "2026-09-17T12:00:00.000Z",
    });
  });

  it("reads the authenticated user's persisted balance from the canonical ledger adapter", async () => {
    await expect(fetchCoinsBalance()).resolves.toEqual({
      user_id: USER_ID,
      balance: 250,
      total_earned: 400,
      total_spent: 150,
      last_updated: "2026-09-17T12:00:00.000Z",
      updated_at: "2026-09-17T12:00:00.000Z",
    });
    expect(mocks.getTonecosCurrentUser).toHaveBeenCalledExactlyOnceWith();
    expect(mocks.getMyTonecosCoinBalance).toHaveBeenCalledExactlyOnceWith();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("validates an explicitly supplied user id before reading the canonical ledger", async () => {
    await fetchCoinsBalance(USER_ID);
    expect(mocks.assertCurrentUserId).toHaveBeenCalledExactlyOnceWith(USER_ID);
    expect(mocks.requireAuthenticatedUserId).not.toHaveBeenCalled();
    expect(mocks.getMyTonecosCoinBalance).toHaveBeenCalledOnce();
  });

  it("returns zero only when the authoritative ledger reports zero", async () => {
    mocks.getMyTonecosCoinBalance.mockResolvedValue({
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      entryCount: 0,
      updatedAt: null,
    });
    await expect(fetchCoinsBalance()).resolves.toEqual({
      user_id: USER_ID,
      balance: 0,
      total_earned: 0,
      total_spent: 0,
      last_updated: null,
      updated_at: null,
    });
  });

  it("propagates authoritative ledger read failures without fabricating a zero balance", async () => {
    mocks.getMyTonecosCoinBalance.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(fetchCoinsBalance()).rejects.toThrow("database unavailable");
  });

  it("rejects guests before requesting a balance from the ledger", async () => {
    mocks.getTonecosCurrentUser.mockResolvedValueOnce(null);
    await expect(fetchCoinsBalance()).rejects.toThrow("tonecos_login_required");
    expect(mocks.getMyTonecosCoinBalance).not.toHaveBeenCalled();
  });
});

describe("coins transactions service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUserId.mockResolvedValue(USER_ID);
    mocks.assertCurrentUserId.mockResolvedValue(undefined);
  });

  it("lists transactions with filters, ordering and pagination", async () => {
    const query = createListQuery({ data: [transactionRow()], error: null, count: 21 });
    mocks.from.mockReturnValue(query);

    await expect(
      listCoinsTransactions({
        userId: USER_ID,
        type: CoinsTransactionType.PURCHASE,
        startDate: "2026-09-01T00:00:00.000Z",
        endDate: "2026-09-30T23:59:59.999Z",
        page: 2,
        perPage: 10,
        orderBy: "amount",
        orderDirection: "asc",
      }),
    ).resolves.toEqual({
      transactions: [
        {
          id: TRANSACTION_ID,
          user_id: USER_ID,
          amount: 100,
          type: CoinsTransactionType.PURCHASE,
          description: "",
          reference_id: null,
          reference_type: null,
          created_at: "2026-09-17T12:00:00.000Z",
        },
      ],
      total: 21,
      page: 2,
      per_page: 10,
      has_next: true,
    });

    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER_ID);
    expect(query.eq).toHaveBeenCalledWith("user_id", USER_ID);
    expect(query.eq).toHaveBeenCalledWith("transaction_type", "purchase");
    expect(query.gte).toHaveBeenCalledWith("created_at", "2026-09-01T00:00:00.000Z");
    expect(query.lte).toHaveBeenCalledWith("created_at", "2026-09-30T23:59:59.999Z");
    expect(query.order).toHaveBeenCalledWith("amount", { ascending: true });
    expect(query.range).toHaveBeenCalledWith(10, 19);
  });

  it.each([
    [CoinsTransactionType.PURCHASE, "purchase"],
    [CoinsTransactionType.SPEND, "spend"],
    [CoinsTransactionType.REFUND, "refund"],
    [CoinsTransactionType.BONUS, "bonus"],
    [CoinsTransactionType.ADMIN_ADJUSTMENT, "adjustment"],
  ] as const)("maps %s to the persisted transaction enum", async (type, persistedType) => {
    const query = createListQuery({ data: [], error: null, count: 0 });
    mocks.from.mockReturnValue(query);

    await listCoinsTransactions({ type });
    expect(query.eq).toHaveBeenCalledWith("transaction_type", persistedType);
  });

  it("rejects subscription credits from the coin transaction ledger", async () => {
    mocks.from.mockReturnValue(createListQuery({ data: [], error: null, count: 0 }));
    await expect(
      listCoinsTransactions({ type: CoinsTransactionType.SUBSCRIPTION_CREDIT }),
    ).rejects.toThrow(
      "Creditos de assinatura usam o ledger de subscription credits, nao coin_transactions",
    );
  });

  it("uses authenticated defaults and handles an empty final page", async () => {
    const query = createListQuery({ data: null, error: null, count: null });
    mocks.from.mockReturnValue(query);

    await expect(listCoinsTransactions()).resolves.toEqual({
      transactions: [],
      total: 0,
      page: 1,
      per_page: 20,
      has_next: false,
    });
    expect(mocks.requireAuthenticatedUserId).toHaveBeenCalledTimes(1);
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.range).toHaveBeenCalledWith(0, 19);
  });

  it("wraps list query failures", async () => {
    mocks.from.mockReturnValue(
      createListQuery({ data: null, error: { message: "list failed" }, count: null }),
    );
    await expect(listCoinsTransactions()).rejects.toThrow("Erro ao buscar transacoes: list failed");
  });

  it("reads one transaction scoped to the authenticated user", async () => {
    const query = createSingleQuery({ data: transactionRow("refund", 25), error: null });
    mocks.from.mockReturnValue(query);

    await expect(getCoinTransaction(TRANSACTION_ID)).resolves.toEqual(
      expect.objectContaining({
        id: TRANSACTION_ID,
        type: CoinsTransactionType.REFUND,
        amount: 25,
      }),
    );
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", TRANSACTION_ID);
    expect(query.eq).toHaveBeenNthCalledWith(2, "user_id", USER_ID);
  });

  it("handles single transaction query failures and missing rows", async () => {
    mocks.from.mockReturnValueOnce(
      createSingleQuery({ data: null, error: { message: "single failed" } }),
    );
    await expect(getCoinTransaction(TRANSACTION_ID)).rejects.toThrow(
      "Erro ao buscar transacao: single failed",
    );

    mocks.from.mockReturnValueOnce(createSingleQuery({ data: null, error: null }));
    await expect(getCoinTransaction(TRANSACTION_ID)).rejects.toThrow("Transacao nao encontrada");
  });

  it("calculates transaction stats from the canonical ledger semantics", async () => {
    const query = createStatsQuery({
      data: [
        transactionRow("purchase", 100),
        { ...transactionRow("spend", -40), id: "33333333-3333-4333-8333-333333333333" },
        { ...transactionRow("refund", 10), id: "44444444-4444-4444-8444-444444444444" },
      ],
      error: null,
    });
    mocks.from.mockReturnValue(query);

    await expect(
      getCoinTransactionStats(
        USER_ID,
        "2026-09-01T00:00:00.000Z",
        "2026-09-30T23:59:59.999Z",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        total_received: 100,
        total_spent: 30,
        net_balance: 70,
        transaction_count: 3,
        last_transaction: expect.objectContaining({ type: CoinsTransactionType.PURCHASE }),
      }),
    );
    expect(query.gte).toHaveBeenCalledWith("created_at", "2026-09-01T00:00:00.000Z");
    expect(query.lte).toHaveBeenCalledWith("created_at", "2026-09-30T23:59:59.999Z");
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("wraps transaction stats query failures", async () => {
    mocks.from.mockReturnValue(
      createStatsQuery({ data: null, error: { message: "stats failed" } }),
    );
    await expect(getCoinTransactionStats(null)).rejects.toThrow(
      "Erro ao calcular estatisticas: stats failed",
    );
  });

  it("lists recent transactions with a bounded limit", async () => {
    const query = createRecentQuery({ data: [transactionRow("bonus", 50)], error: null });
    mocks.from.mockReturnValue(query);

    await expect(listRecentCoinTransactions(USER_ID, 5)).resolves.toEqual([
      expect.objectContaining({ type: CoinsTransactionType.BONUS, amount: 50 }),
    ]);
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(5);
  });

  it("wraps recent transaction query failures", async () => {
    mocks.from.mockReturnValue(
      createRecentQuery({ data: null, error: { message: "recent failed" } }),
    );
    await expect(listRecentCoinTransactions(null)).rejects.toThrow(
      "Erro ao buscar transacoes recentes: recent failed",
    );
  });






});
