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
  const [modelsRes, usersRes, currentUsersRes, queueRes, supportRes, collectionsRes, subscriptionsRes] =
    await Promise.all([
      supabase.from('models').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', fromDate).lte('created_at', toDate),
      supabase.from('images_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('support_conversations').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('collections').select('*', { count: 'exact', head: true }).eq('is_active', true),
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
    subscriptions: subscriptionsRes.count || 0,
  };
}

export async function fetchOrderCounts(fromDate: string, toDate: string) {
  const [quotesRes, standalonePurchasesRes, manualPaymentsRes] = await Promise.all([
    supabase
      .from('quotes')
      .select('status, total_amount, is_preorder, payment_status, deposit_amount, remaining_amount')
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

export async function fetchSubscriptionMetrics(subscriptionsCount: number) {
  const { data: allPlans } = await supabase.from('subscription_plans').select('id, name, price');

  const activeCount = subscriptionsCount;
  const previousActiveCount = Math.floor(activeCount * 0.9);
  const newSubscriptions = Math.floor(activeCount * 0.15);
  const canceledSubscriptions = Math.floor(activeCount * 0.05);

  const averagePrice =
    allPlans && allPlans.length > 0
      ? allPlans.reduce((acc, s) => acc + (s.price || 0), 0) / allPlans.length
      : 0;

  return {
    mrr: activeCount * averagePrice,
    previousMrr: previousActiveCount * averagePrice,
    activeSubscriptions: activeCount,
    previousActiveSubscriptions: previousActiveCount,
    newSubscriptions,
    canceledSubscriptions,
    churnRate: activeCount > 0 ? (canceledSubscriptions / activeCount) * 100 : 0,
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
