import { supabase } from '@/integrations/supabase/client';

export interface DateRange {
  from: Date;
  to: Date;
}

export function getPreviousPeriod(dateRange: DateRange): DateRange {
  const periodDiff = dateRange.to.getTime() - dateRange.from.getTime();
  return {
    from: new Date(dateRange.from.getTime() - periodDiff),
    to: dateRange.from,
  };
}

export async function fetchAggregatedCounts(fromDate: string, toDate: string) {
  const [
    modelsRes,
    usersRes,
    currentUsersRes,
    queueRes,
    supportRes,
    collectionsRes,
    activeSubscriptionsRes,
    currentSubscriptionsRes,
  ] = await Promise.all([
      supabase.from('models').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', fromDate).lte('created_at', toDate),
      supabase.from('images_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('support_conversations').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('collections').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('created_at', fromDate)
        .lte('created_at', toDate),
    ]);

  return {
    models: modelsRes.count || 0,
    usersTotal: usersRes.count || 0,
    usersCurrent: currentUsersRes.count || 0,
    queue: queueRes.count || 0,
    support: supportRes.count || 0,
    collections: collectionsRes.count || 0,
    subscriptions: activeSubscriptionsRes.count || 0,
    currentSubscriptions: currentSubscriptionsRes.count || 0,
  };
}

export async function fetchOrderCounts(fromDate: string, toDate: string) {
  const [quotesRes, standalonePurchasesRes, manualPaymentsRes] = await Promise.all([
    supabase
      .from('quotes')
      .select('user_id, status, total_amount, is_preorder, payment_status, deposit_amount, remaining_amount')
      .gte('created_at', fromDate)
      .lte('created_at', toDate),
    supabase.from('standalone_purchases').select('status, amount').gte('created_at', fromDate).lte('created_at', toDate),
    supabase.from('manual_payments').select('status, amount').gte('created_at', fromDate).lte('created_at', toDate),
  ]);

  const quotes = quotesRes.data || [];
  const standalonePurchases = standalonePurchasesRes.data || [];
  const manualPayments = manualPaymentsRes.data || [];

  const quotesRevenue = quotes.reduce((acc, q) => acc + (q.total_amount || 0), 0);
  const standaloneRevenue = standalonePurchases.reduce((acc, sp) => acc + (sp.amount || 0), 0);
  const manualRevenue = manualPayments.reduce((acc, mp) => acc + (mp.amount || 0), 0);
  const totalRevenue = quotesRevenue + standaloneRevenue + manualRevenue;
  const totalOrders = quotes.length + standalonePurchases.length + manualPayments.length;
  const preorders = quotes.filter((q) => q.is_preorder);
  const quoteUserCount = new Set(quotes.map((q) => q.user_id).filter(Boolean)).size;

  return {
    byType: {
      subscriptionDeliveries: 0,
      standalonePurchases: standalonePurchases.length,
      manualPayments: manualPayments.length,
      quotes: quotes.length,
    },
    byStatus: {
      pending:
        quotes.filter((q) => q.status === 'pending').length +
        standalonePurchases.filter((sp) => sp.status === 'pending').length,
      confirmed:
        quotes.filter((q) => q.status === 'approved').length +
        standalonePurchases.filter((sp) => sp.status === 'confirmed').length,
      inProduction:
        quotes.filter((q) => q.status === 'in_production').length +
        standalonePurchases.filter((sp) => sp.status === 'in_production').length,
      shipped:
        quotes.filter((q) => q.status === 'shipped').length +
        standalonePurchases.filter((sp) => sp.status === 'shipped').length,
      delivered:
        quotes.filter((q) => q.status === 'delivered').length +
        standalonePurchases.filter((sp) => sp.status === 'delivered').length,
      completed:
        quotes.filter((q) => q.status === 'completed').length +
        standalonePurchases.filter((sp) => sp.status === 'completed').length,
    },
    total: totalOrders,
    revenue: totalRevenue,
    averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    quotes: {
      total: quotes.length,
      uniqueUsers: quoteUserCount,
      pending: quotes.filter((q) => q.status === 'pending').length,
      approved: quotes.filter((q) => q.status === 'approved').length,
      completed: quotes.filter((q) => q.status === 'completed').length,
      totalRevenue: quotesRevenue,
      averageTicket: quotes.length > 0 ? quotesRevenue / quotes.length : 0,
      conversionRate:
        quotes.length > 0 ? (quotes.filter((q) => q.status === 'completed').length / quotes.length) * 100 : 0,
    },
    preorders: {
      total: preorders.length,
      pending_deposit: preorders.filter((p) => p.payment_status === 'pending').length,
      in_production: preorders.filter((p) => p.payment_status === 'deposit_paid').length,
      completed: preorders.filter((p) => p.payment_status === 'fully_paid').length,
      total_deposits: preorders.reduce((acc, p) => acc + (p.deposit_amount || 0), 0),
      total_remaining: preorders.reduce((acc, p) => acc + (p.remaining_amount || 0), 0),
    },
  };
}

export async function fetchRevenueChartData() {
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return {
      month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      firstDay: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
      lastDay: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString(),
    };
  });

  return Promise.all(
    last6Months.map(async ({ month, firstDay, lastDay }) => {
      const { data: monthQuotes } = await supabase
        .from('quotes')
        .select('total_amount')
        .gte('created_at', firstDay)
        .lte('created_at', lastDay);

      return {
        month,
        receita: monthQuotes?.reduce((acc, q) => acc + (q.total_amount || 0), 0) || 0,
        orcamentos: monthQuotes?.length || 0,
      };
    }),
  );
}

type SubscriptionPlanRef = { price: number | null } | { price: number | null }[] | null;

interface SubscriptionMetricRow {
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  total_paid: number | null;
  subscription_plans?: SubscriptionPlanRef;
}

function isWithin(dateValue: string | null | undefined, from: Date, to: Date): boolean {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return Number.isFinite(date.getTime()) && date >= from && date <= to;
}

function isActiveAt(row: SubscriptionMetricRow, at: Date): boolean {
  if (!row.created_at || new Date(row.created_at) > at) return false;
  if (row.cancelled_at && new Date(row.cancelled_at) <= at) return false;
  if (row.completed_at && new Date(row.completed_at) <= at) return false;
  return row.status === 'active' || Boolean(row.cancelled_at || row.completed_at);
}

function getPlanPrice(row: SubscriptionMetricRow): number {
  const plan = Array.isArray(row.subscription_plans) ? row.subscription_plans[0] : row.subscription_plans;
  return plan?.price ?? 0;
}

export async function fetchSubscriptionMetrics(dateRange: DateRange, previous: DateRange) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, created_at, updated_at, cancelled_at, completed_at, total_paid, subscription_plans(price)');

  if (error) throw error;

  const subscriptions = (data || []) as SubscriptionMetricRow[];
  const activeRows = subscriptions.filter((subscription) => subscription.status === 'active');
  const previousActiveRows = subscriptions.filter((subscription) => isActiveAt(subscription, previous.to));
  const newSubscriptions = subscriptions.filter((subscription) =>
    isWithin(subscription.created_at, dateRange.from, dateRange.to),
  ).length;
  const canceledSubscriptions = subscriptions.filter(
    (subscription) =>
      isWithin(subscription.cancelled_at, dateRange.from, dateRange.to) ||
      (subscription.status === 'cancelled' && isWithin(subscription.updated_at, dateRange.from, dateRange.to)),
  ).length;

  const mrr = activeRows.reduce((sum, subscription) => sum + getPlanPrice(subscription), 0);
  const previousMrr = previousActiveRows.reduce((sum, subscription) => sum + getPlanPrice(subscription), 0);
  const averagePrice = activeRows.length > 0 ? mrr / activeRows.length : 0;

  return {
    mrr,
    previousMrr,
    activeSubscriptions: activeRows.length,
    previousActiveSubscriptions: previousActiveRows.length,
    newSubscriptions,
    canceledSubscriptions,
    churnRate: previousActiveRows.length > 0 ? (canceledSubscriptions / previousActiveRows.length) * 100 : 0,
    ltv: averagePrice * 12,
    averageSubscriptionValue: averagePrice,
  };
}

export async function fetchPreviousPeriodCounts(previous: DateRange) {
  const [previousUsersRes, previousSubsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', previous.from.toISOString())
      .lte('created_at', previous.to.toISOString()),
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('created_at', previous.from.toISOString())
      .lte('created_at', previous.to.toISOString()),
  ]);

  return {
    previousUsersCount: previousUsersRes.count || 0,
    previousSubscriptionsCount: previousSubsRes.count || 0,
  };
}

export async function fetchQuotesPerDay(fromDate: string, toDate: string) {
  const { data: chartQuotes } = await supabase
    .from('quotes')
    .select('created_at, total_amount')
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  return last7Days.map((date) => {
    const dayQuotes = chartQuotes?.filter((q) => q.created_at?.startsWith(date)) || [];
    return {
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      orcamentos: dayQuotes.length,
      receita: dayQuotes.reduce((acc, q) => acc + (q.total_amount || 0), 0),
    };
  });
}
