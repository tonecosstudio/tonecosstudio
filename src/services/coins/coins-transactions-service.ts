import { supabase } from "@/integrations/supabase/client";
import { summarizeCoinLedger } from "@/lib/coins-ledger";
import { assertCurrentUserId, requireAuthenticatedUserId } from "@/services/auth/current-user";
import { CoinsTransactionType } from "@/types/coins";
import type {
  CoinsTransaction,
  CoinsTransactionsResponse,
  TransactionId,
  UserId,
} from "@/types/coins";

export interface TransactionFilters {
  userId?: UserId | null;
  type?: CoinsTransactionType | null;
  startDate?: string | null;
  endDate?: string | null;
  page?: number;
  perPage?: number;
  orderBy?: "created_at" | "amount";
  orderDirection?: "asc" | "desc";
}

export interface TransactionStats {
  total_received: number;
  total_spent: number;
  net_balance: number;
  transaction_count: number;
  last_transaction?: CoinsTransaction;
}

export type LegacyTransactionType =
  | "purchase"
  | "spend"
  | "refund"
  | "bonus"
  | "subscription_credit"
  | "adjustment";

export interface LegacyCoinTransaction {
  id: string;
  user_id: UserId;
  amount: number;
  transaction_type: LegacyTransactionType;
  reference_id?: string | null;
  reference_type?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

type CoinTransactionDbType = "purchase" | "spend" | "refund" | "bonus" | "adjustment";

type CoinTransactionRow = {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: CoinTransactionDbType;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
};

const DB_TYPE_TO_DOMAIN: Record<CoinTransactionDbType, CoinsTransactionType> = {
  purchase: CoinsTransactionType.PURCHASE,
  spend: CoinsTransactionType.SPEND,
  refund: CoinsTransactionType.REFUND,
  bonus: CoinsTransactionType.BONUS,
  adjustment: CoinsTransactionType.ADMIN_ADJUSTMENT,
};

function toCoinTransactionDbType(type: CoinsTransactionType): CoinTransactionDbType {
  switch (type) {
    case CoinsTransactionType.PURCHASE:
      return "purchase";
    case CoinsTransactionType.SPEND:
      return "spend";
    case CoinsTransactionType.REFUND:
      return "refund";
    case CoinsTransactionType.BONUS:
      return "bonus";
    case CoinsTransactionType.ADMIN_ADJUSTMENT:
      return "adjustment";
    case CoinsTransactionType.SUBSCRIPTION_CREDIT:
      throw new Error(
        "Creditos de assinatura usam o ledger de subscription credits, nao coin_transactions",
      );
  }
}

function toCoinsTransaction(row: CoinTransactionRow): CoinsTransaction {
  return {
    id: row.id,
    user_id: row.user_id,
    amount: row.amount,
    type: DB_TYPE_TO_DOMAIN[row.transaction_type],
    description: row.description ?? "",
    reference_id: row.reference_id,
    reference_type: row.reference_type,
    created_at: row.created_at,
  };
}

async function resolveCurrentUserId(userId?: UserId | null): Promise<UserId> {
  if (!userId) {
    return requireAuthenticatedUserId();
  }

  await assertCurrentUserId(userId);
  return userId;
}

export async function listCoinsTransactions(
  filters: TransactionFilters = {},
): Promise<CoinsTransactionsResponse> {
  const {
    userId,
    page = 1,
    perPage = 20,
    orderBy = "created_at",
    orderDirection = "desc",
  } = filters;
  const targetUserId = await resolveCurrentUserId(userId);

  let query = supabase
    .from("coin_transactions")
    .select("*", { count: "exact" })
    .eq("user_id", targetUserId);

  if (filters.type) {
    query = query.eq("transaction_type", toCoinTransactionDbType(filters.type));
  }

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  query = query.order(orderBy, { ascending: orderDirection === "asc" });

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Erro ao buscar transacoes: ${error.message}`);
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / perPage);

  return {
    transactions: ((data || []) as CoinTransactionRow[]).map(toCoinsTransaction),
    total,
    page,
    per_page: perPage,
    has_next: page < totalPages,
  };
}

export async function getCoinTransaction(transactionId: TransactionId): Promise<CoinsTransaction> {
  const userId = await requireAuthenticatedUserId();

  const { data, error } = await supabase
    .from("coin_transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error(`Erro ao buscar transacao: ${error.message}`);
  }

  if (!data) {
    throw new Error("Transacao nao encontrada");
  }

  return toCoinsTransaction(data as CoinTransactionRow);
}

export async function getCoinTransactionStats(
  userId: UserId | null,
  startDate?: string,
  endDate?: string,
): Promise<TransactionStats> {
  const targetUserId = await resolveCurrentUserId(userId);

  let query = supabase
    .from("coin_transactions")
    .select("*")
    .eq("user_id", targetUserId);

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao calcular estatisticas: ${error.message}`);
  }

  const transactions = ((data || []) as CoinTransactionRow[]).map(toCoinsTransaction);
  const summary = summarizeCoinLedger(transactions);

  return {
    total_received: summary.totalEarned,
    total_spent: summary.totalSpent,
    net_balance: summary.netBalance,
    transaction_count: transactions.length,
    last_transaction: transactions[0] || undefined,
  };
}

export async function listRecentCoinTransactions(
  userId: UserId | null,
  limit = 10,
): Promise<CoinsTransaction[]> {
  const targetUserId = await resolveCurrentUserId(userId);

  const { data, error } = await supabase
    .from("coin_transactions")
    .select("*")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Erro ao buscar transacoes recentes: ${error.message}`);
  }

  return ((data || []) as CoinTransactionRow[]).map(toCoinsTransaction);
}

export async function listLegacyCoinTransactions(
  userId?: UserId | null,
  limit = 50,
): Promise<LegacyCoinTransaction[]> {
  if (!userId) return [];

  await assertCurrentUserId(userId);

  const { data, error } = await supabase
    .from("coin_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []) as LegacyCoinTransaction[];
}
