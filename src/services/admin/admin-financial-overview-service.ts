import { adminPaymentsGateway } from "@/services/admin/admin-payments-gateway";
import { fetchUnifiedOrders } from "@/services/admin/orders-service";

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

  const ordersResult = await fetchUnifiedOrders(
    {
      type: "all",
      status: [],
      dateFrom: fromDate.toISOString(),
      dateTo: toDate.toISOString(),
      searchQuery: "",
    },
    {
      page: 1,
      pageSize: 10000,
    }
  );

  const totalRevenue = ordersResult.data.reduce((acc, order) => acc + order.amount, 0);

  const { count: activeSubscriptions } = await adminPaymentsGateway
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString());

  const standaloneSales = ordersResult.data.filter((order) => order.type === "standalone_purchase").length;

  const ordersWithValue = ordersResult.data.filter((order) => order.amount > 0);

  const averageTicket = ordersWithValue.length > 0 ? totalRevenue / ordersWithValue.length : 0;
  const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    totalRevenue,
    activeSubscriptions: activeSubscriptions || 0,
    standaloneSales,
    averageTicket,
    totalOrders: ordersResult.total,
    daysDiff: daysDiff > 0 ? daysDiff : 1,
  };
}
