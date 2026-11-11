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
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/services/auth/current-user", () => ({
  requireAuthenticatedUserId: mocks.requireAuthenticatedUserId,
  assertCurrentUserId: mocks.assertCurrentUserId,
}));

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
};

function createBalanceQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

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
  });

  it("reads the authenticated user's persisted balance", async () => {
    const query = createBalanceQuery({
      data: {
        balance: 250,
        total_earned: 400,
        total_spent: 150,
        updated_at: "2026-09-17T12:00:00.000Z",
      },
      error: null,
    });
    mocks.from.mockReturnValue(query);

    await expect(fetchCoinsBalance()).resolves.toEqual({
      user_id: USER_ID,
      balance: 250,
      total_earned: 400,
      total_spent: 150,
      last_updated: "2026-09-17T12:00:00.000Z",
      updated_at: "2026-09-17T12:00:00.000Z",
    });
    expect(mocks.requireAuthenticatedUserId).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith("user_id", USER_ID);
  });

  it("validates an explicitly supplied user id", async () => {
    mocks.from.mockReturnValue(
      createBalanceQuery({
        data: {
          balance: 1,
          total_earned: 1,
          total_spent: 0,
          updated_at: "2026-09-17T12:00:00.000Z",
        },
        error: null,
      }),
    );

    await fetchCoinsBalance(USER_ID);
    expect(mocks.assertCurrentUserId).toHaveBeenCalledWith(USER_ID);
    expect(mocks.requireAuthenticatedUserId).not.toHaveBeenCalled();
  });

  it("returns a zero balance when the user has no ledger row", async () => {
    mocks.from.mockReturnValue(createBalanceQuery({ data: null, error: null }));
    const result = await fetchCoinsBalance();

    expect(result.user_id).toBe(USER_ID);
    expect(result.balance).toBe(0);
    expect(result.total_earned).toBe(0);
    expect(result.total_spent).toBe(0);
    expect(new Date(result.updated_at).toString()).not.toBe("Invalid Date");
    expect(result.last_updated).toBe(result.updated_at);
  });

  it("wraps balance query failures with the domain error", async () => {
    mocks.from.mockReturnValue(
      createBalanceQuery({ data: null, error: { message: "database unavailable" } }),
    );
    await expect(fetchCoinsBalance()).rejects.toThrow(
      "Erro ao buscar saldo de coins: database unavailable",
    );
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
