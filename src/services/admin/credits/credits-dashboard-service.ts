import { supabase } from "@/integrations/supabase/client";
import { summarizeCoinLedger } from "@/lib/coins-ledger";
import { fetchSubscriptionBaseCounts } from "@/services/admin/analytics/admin-subscription-analytics-service";

export interface CreditsDashboardMetrics {
  coins: {
    total: number;
    credits: number;
    debits: number;
  };
  cycles: {
    active: number;
  };
  tiers: {
    active: number;
  };
  packages: {
    active: number;
  };
  subscribers: {
    active: number;
    total: number;
  };
  coinUsers: {
    count: number;
  };
}

export async function fetchCreditsDashboardMetrics(): Promise<CreditsDashboardMetrics> {
  const [
    coinsResult,
    cyclesResult,
    tiersResult,
    packagesResult,
    subscriptionCounts,
    coinUsersResult,
  ] = await Promise.all([
    supabase.from("coin_transactions").select("amount, transaction_type"),
    supabase.from("cycles").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("pricing_tiers").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("coin_packages").select("*", { count: "exact", head: true }).eq("is_active", true),
    fetchSubscriptionBaseCounts(),
    supabase.from("user_coins").select("*", { count: "exact", head: true }),
  ]);

  if (coinsResult.error) throw coinsResult.error;
  if (cyclesResult.error) throw cyclesResult.error;
  if (tiersResult.error) throw tiersResult.error;
  if (packagesResult.error) throw packagesResult.error;
  if (coinUsersResult.error) throw coinUsersResult.error;

  const coinSummary = summarizeCoinLedger(coinsResult.data || []);

  return {
    coins: {
      total: coinSummary.netBalance,
      credits: coinSummary.totalEarned,
      debits: coinSummary.totalSpent,
    },
    cycles: {
      active: cyclesResult.count || 0,
    },
    tiers: {
      active: tiersResult.count || 0,
    },
    packages: {
      active: packagesResult.count || 0,
    },
    subscribers: {
      active: subscriptionCounts.active,
      total: subscriptionCounts.total,
    },
    coinUsers: {
      count: coinUsersResult.count || 0,
    },
  };
}
