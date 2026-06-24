import { fetchAdminOrderMetrics } from "@/services/admin/orders/admin-order-metrics-service";
import { fetchActiveSubscriptionCount } from "@/services/admin/analytics/admin-subscription-analytics-service";

export interface AdminFinancialOverview {
  totalRevenue: number;
  activeSubscriptions: number;
  standaloneSales: number;
  averageTicket: number;
  totalOrders: number;
  daysDiff: number;
}

export async function fetchAdminFinancialOverview(dateRange: { from: Date; to: Date }): Promise<AdminFinancialOverview> {
  const fromDate = dateRange.from;
  const toDate = dateRange.to;

  const [orderMetrics, activeSubscriptions] = await Promise.all([
    fetchAdminOrderMetrics({
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    }),
    fetchActiveSubscriptionCount(),
  ]);

  const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    totalRevenue: orderMetrics.revenue,
    activeSubscriptions,
    standaloneSales: orderMetrics.standaloneSales,
    averageTicket: orderMetrics.averageTicket,
    totalOrders: orderMetrics.total,
    daysDiff: daysDiff > 0 ? daysDiff : 1,
  };
}
