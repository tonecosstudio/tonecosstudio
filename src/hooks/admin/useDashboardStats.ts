import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  fetchAggregatedCounts,
  fetchOrderCounts,
  fetchPreviousPeriodCounts,
  fetchQuotesPerDay,
  fetchRevenueChartData,
  fetchSubscriptionMetrics,
  getPreviousPeriod,
} from '@/services/admin/admin-dashboard-stats-service';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DashboardStats {
  models: number;
  users: {
    total: number;
    current: number;
    previous: number;
  };
  orders: {
    total: number;
    current: number;
    previous: number;
    byType: {
      subscriptionDeliveries: number;
      standalonePurchases: number;
      manualPayments: number;
      quotes: number;
    };
    byStatus: {
      pending: number;
      confirmed: number;
      inProduction: number;
      shipped: number;
      delivered: number;
      completed: number;
    };
    revenue: number;
    previousRevenue: number;
    averageTicket: number;
    previousAverageTicket: number;
  };
  quotes: {
    total: number;
    pending: number;
    approved: number;
    completed: number;
    totalRevenue: number;
    averageTicket: number;
    conversionRate: number;
  };
  previousQuotes: {
    total: number;
    totalRevenue: number;
    averageTicket: number;
    conversionRate: number;
  };
  preorders: {
    total: number;
    pending_deposit: number;
    in_production: number;
    completed: number;
    total_deposits: number;
    total_remaining: number;
  };
  subscriptions: {
    total: number;
    current: number;
    previous: number;
  };
  queue: number;
  support: number;
  collections: number;
  quotesPerDay: Array<{ date: string; orcamentos: number; receita: number }>;
  revenueData: Array<{ month: string; receita: number; orcamentos: number }>;
  funnelData: {
    visitors: number;
    leads: number;
    quotes: number;
    conversions: number;
  };
  subscriptionMetrics: {
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

export function useDashboardStats(dateRange: DateRange) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const query = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard-stats', dateRange],
    queryFn: async () => {
      setLastUpdate(new Date());

      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();
      const previous = getPreviousPeriod(dateRange);

      const [counts, currentOrders, previousOrders, previousCounts, revenueData] = await Promise.all([
        fetchAggregatedCounts(fromDate, toDate),
        fetchOrderCounts(fromDate, toDate),
        fetchOrderCounts(previous.from.toISOString(), previous.to.toISOString()),
        fetchPreviousPeriodCounts(previous),
        fetchRevenueChartData(),
      ]);

      const quotesPerDay = await fetchQuotesPerDay(fromDate, toDate);

      const funnelData = {
        visitors: counts.usersTotal,
        leads: Math.floor(counts.usersTotal * 0.4),
        quotes: currentOrders.quotes.total,
        conversions: currentOrders.quotes.completed,
      };

      const subscriptionMetrics = await fetchSubscriptionMetrics(counts.subscriptions);

      return {
        models: counts.models,
        users: {
          total: counts.usersTotal,
          current: counts.usersCurrent,
          previous: previousCounts.previousUsersCount,
        },
        orders: {
          total: currentOrders.total,
          current: currentOrders.total,
          previous: previousOrders.total,
          byType: currentOrders.byType,
          byStatus: currentOrders.byStatus,
          revenue: currentOrders.revenue,
          previousRevenue: previousOrders.revenue,
          averageTicket: currentOrders.averageTicket,
          previousAverageTicket: previousOrders.averageTicket,
        },
        quotes: currentOrders.quotes,
        previousQuotes: previousOrders.quotes,
        preorders: currentOrders.preorders,
        subscriptions: {
          total: counts.subscriptions,
          current: counts.subscriptions,
          previous: previousCounts.previousSubscriptionsCount,
        },
        queue: counts.queue,
        support: counts.support,
        collections: counts.collections,
        quotesPerDay,
        revenueData,
        funnelData,
        subscriptionMetrics,
      };
    },
  });

  return { ...query, lastUpdate };
}
