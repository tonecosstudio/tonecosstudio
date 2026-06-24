import { adminCoinsGateway } from "@/services/admin/credits/admin-coins-gateway";
import { summarizeCoinLedger } from "@/lib/coins-ledger";

interface CoinTransactionSummaryRow {
  amount: number;
  transaction_type: string;
  user_id: string;
}

interface UserCoinBalanceSummaryRow {
  balance: number;
  user_id: string;
}

export interface AdminCoinTransactionRow {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  user_id: string;
  created_at: string;
}

export interface AdminCoinPackageRow {
  id: string;
  name: string;
  amount: number;
  bonus: number;
  price_brl: number;
  is_active: boolean;
}

export interface AdminCoinsStats {
  totalBalance: number;
  totalEarned: number;
  totalSpent: number;
  totalUsers: number;
  transactions: AdminCoinTransactionRow[];
  packages: AdminCoinPackageRow[];
  totalPurchases: number;
}

export interface AdminCoinsBasePrice {
  base_price_coins: number;
  collection_types: { name: string } | null;
}

export interface AdminCoinsPricingMultiplier {
  id: string;
  user_context: string;
  multiplier: number;
  description: string | null;
  is_active: boolean;
}

export interface AdminCoinsPricingConfig {
  basePrices: AdminCoinsBasePrice[];
  multipliers: AdminCoinsPricingMultiplier[];
}

export async function fetchAdminCoinsStats(): Promise<AdminCoinsStats> {
  const { data: allBalances, error: balancesError } = await adminCoinsGateway
    .from("user_coins")
    .select("balance, user_id");

  if (balancesError) throw balancesError;

  const { data: allTransactions, error: transactionsError } = await adminCoinsGateway
    .from("coin_transactions")
    .select("amount, transaction_type, user_id");

  if (transactionsError) throw transactionsError;

  const balanceRows = (allBalances as UserCoinBalanceSummaryRow[] | null) ?? [];
  const totalBalance = balanceRows.reduce((sum, row) => sum + row.balance, 0);
  const ledgerSummary = summarizeCoinLedger(
    (allTransactions as CoinTransactionSummaryRow[] | null) ?? []
  );

  const { data: transactions, error: recentTransactionsError } = await adminCoinsGateway
    .from("coin_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentTransactionsError) throw recentTransactionsError;

  const { data: packages, error: packagesError } = await adminCoinsGateway
    .from("coin_packages")
    .select("*")
    .eq("is_active", true)
    .order("amount", { ascending: true });

  if (packagesError) throw packagesError;

  const { count: purchaseCount, error: purchasesError } = await adminCoinsGateway
    .from("coin_transactions")
    .select("*", { count: "exact", head: true })
    .eq("transaction_type", "spend")
    .in("reference_type", ["character_purchase", "collection_purchase"]);

  if (purchasesError) throw purchasesError;

  return {
    totalBalance,
    totalEarned: ledgerSummary.totalEarned,
    totalSpent: ledgerSummary.totalSpent,
    totalUsers: balanceRows.length,
    transactions: (transactions ?? []) as AdminCoinTransactionRow[],
    packages: (packages ?? []) as AdminCoinPackageRow[],
    totalPurchases: purchaseCount ?? 0,
  };
}

export async function fetchAdminCoinsPricingConfig(): Promise<AdminCoinsPricingConfig> {
  const { data: basePrices, error: basePricesError } = await adminCoinsGateway
    .from("collection_base_pricing")
    .select(`
      base_price_coins,
      collection_types (name)
    `)
    .eq("is_active", true);

  if (basePricesError) throw basePricesError;

  const { data: multipliers, error: multipliersError } = await adminCoinsGateway
    .from("pricing_context_multipliers")
    .select("*")
    .eq("is_active", true);

  if (multipliersError) throw multipliersError;

  return {
    basePrices: (basePrices ?? []) as AdminCoinsBasePrice[],
    multipliers: (multipliers ?? []) as AdminCoinsPricingMultiplier[],
  };
}
