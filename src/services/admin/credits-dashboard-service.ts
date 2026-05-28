import { supabase } from "@/integrations/supabase/client";

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
    activeSubsResult,
    totalSubsResult,
    coinUsersResult,
  ] = await Promise.all([
    supabase.from("coin_transactions").select("amount, transaction_type"),
    supabase.from("cycles").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("pricing_tiers").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("coin_packages").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }),
    supabase.from("user_coins").select("*", { count: "exact", head: true }),
  ]);

  if (coinsResult.error) throw coinsResult.error;
  if (cyclesResult.error) throw cyclesResult.error;
  if (tiersResult.error) throw tiersResult.error;
  if (packagesResult.error) throw packagesResult.error;
  if (activeSubsResult.error) throw activeSubsResult.error;
  if (totalSubsResult.error) throw totalSubsResult.error;
  if (coinUsersResult.error) throw coinUsersResult.error;

  let totalCredits = 0;
  let totalDebits = 0;
  (coinsResult.data || []).forEach((tx) => {
    if (tx.amount >= 0) {
      totalCredits += tx.amount;
    } else {
      totalDebits += Math.abs(tx.amount);
    }
  });

  return {
    coins: {
      total: totalCredits - totalDebits,
      credits: totalCredits,
      debits: totalDebits,
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
      active: activeSubsResult.count || 0,
      total: totalSubsResult.count || 0,
    },
    coinUsers: {
      count: coinUsersResult.count || 0,
    },
  };
}
