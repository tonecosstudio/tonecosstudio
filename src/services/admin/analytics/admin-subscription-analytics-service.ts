import { supabase } from "@/integrations/supabase/client";

interface DateRange {
  from: Date;
  to: Date;
}

type SubscriptionPlanRef = { price: number | null } | { price: number | null }[] | null;

interface SubscriptionAnalyticsRow {
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  subscription_plans?: SubscriptionPlanRef;
}

export interface SubscriptionDashboardSnapshot {
  counts: {
    totalActive: number;
    createdCurrent: number;
    createdPrevious: number;
  };
  metrics: {
    mrr: number;
    previousMrr: number;
    activeSubscriptions: number;
    previousActiveSubscriptions: number;
    newSubscriptions: number;
    canceledSubscriptions: number;
    churnRate: number;
    ltv: number;
    averageSubscriptionValue: number;
  };
}

export interface SubscriptionBaseCounts {
  active: number;
  total: number;
}

export async function fetchSubscriptionBaseCounts(): Promise<SubscriptionBaseCounts> {
  const [activeResult, totalResult] = await Promise.all([
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }),
  ]);

  if (activeResult.error) {
    throw activeResult.error;
  }

  if (totalResult.error) {
    throw totalResult.error;
  }

  return {
    active: activeResult.count || 0,
    total: totalResult.count || 0,
  };
}

export async function fetchActiveSubscriptionCount(): Promise<number> {
  const counts = await fetchSubscriptionBaseCounts();
  return counts.active;
}

function isWithin(dateValue: string | null | undefined, from: Date, to: Date): boolean {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return Number.isFinite(date.getTime()) && date >= from && date <= to;
}

function isActiveAt(row: SubscriptionAnalyticsRow, at: Date): boolean {
  if (!row.created_at || new Date(row.created_at) > at) return false;
  if (row.cancelled_at && new Date(row.cancelled_at) <= at) return false;
  if (row.completed_at && new Date(row.completed_at) <= at) return false;
  return row.status === "active" || Boolean(row.cancelled_at || row.completed_at);
}

function getPlanPrice(row: SubscriptionAnalyticsRow): number {
  const plan = Array.isArray(row.subscription_plans) ? row.subscription_plans[0] : row.subscription_plans;
  return plan?.price ?? 0;
}

export async function fetchSubscriptionDashboardSnapshot(
  currentRange: DateRange,
  previousRange: DateRange
): Promise<SubscriptionDashboardSnapshot> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, created_at, updated_at, cancelled_at, completed_at, subscription_plans(price)");

  if (error) {
    throw error;
  }

  const subscriptions = (data ?? []) as SubscriptionAnalyticsRow[];
  const activeRows = subscriptions.filter((subscription) => subscription.status === "active");
  const previousActiveRows = subscriptions.filter((subscription) =>
    isActiveAt(subscription, previousRange.to)
  );
  const newSubscriptions = subscriptions.filter((subscription) =>
    isWithin(subscription.created_at, currentRange.from, currentRange.to)
  ).length;
  const previousSubscriptions = subscriptions.filter((subscription) =>
    isWithin(subscription.created_at, previousRange.from, previousRange.to)
  ).length;
  const canceledSubscriptions = subscriptions.filter(
    (subscription) =>
      isWithin(subscription.cancelled_at, currentRange.from, currentRange.to) ||
      (subscription.status === "cancelled" &&
        isWithin(subscription.updated_at, currentRange.from, currentRange.to))
  ).length;

  const mrr = activeRows.reduce((sum, subscription) => sum + getPlanPrice(subscription), 0);
  const previousMrr = previousActiveRows.reduce((sum, subscription) => sum + getPlanPrice(subscription), 0);
  const averagePrice = activeRows.length > 0 ? mrr / activeRows.length : 0;

  return {
    counts: {
      totalActive: activeRows.length,
      createdCurrent: newSubscriptions,
      createdPrevious: previousSubscriptions,
    },
    metrics: {
      mrr,
      previousMrr,
      activeSubscriptions: activeRows.length,
      previousActiveSubscriptions: previousActiveRows.length,
      newSubscriptions,
      canceledSubscriptions,
      churnRate: previousActiveRows.length > 0 ? (canceledSubscriptions / previousActiveRows.length) * 100 : 0,
      ltv: averagePrice * 12,
      averageSubscriptionValue: averagePrice,
    },
  };
}
