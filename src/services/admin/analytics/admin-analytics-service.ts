import { supabase } from "@/integrations/supabase/client";
import { fetchOrdersCounts } from "@/services/admin/orders/orders-counts-service";
import { fetchAdminUsers } from "@/services/admin/users/admin-users-service";
import { fetchUnifiedOrders } from "@/services/admin/orders/orders-service";
import { fetchAdminOrderMetrics } from "@/services/admin/orders/admin-order-metrics-service";
import { fetchActiveSubscriptionCount } from "@/services/admin/analytics/admin-subscription-analytics-service";

export type AdminAnalyticsStats = {
  totalUsers: number;
  totalOrders: number;
  totalModels: number;
  activeSubscriptions: number;
  totalRevenue: number;
  avgCompletion: number;
};

export type RecentUser = {
  id: string;
  email: string;
  created_at: string;
};

export type RecentOrder = {
  id: string;
  status: string;
  created_at: string;
};

export type TopCollector = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  collector_level: number | null;
  pieces_owned: number | null;
  total_spent: number | null;
};

export type CollectionsStats = {
  total: number;
  active: number;
  inactive: number;
};

export async function fetchAdminAnalyticsStats(): Promise<AdminAnalyticsStats> {
  const [
    { count: totalUsers },
    ordersCounts,
    { count: totalModels },
    activeSubscriptions,
    orderMetrics,
    { data: profileData },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    fetchOrdersCounts(),
    supabase.from("models").select("*", { count: "exact", head: true }),
    fetchActiveSubscriptionCount(),
    fetchAdminOrderMetrics(),
    supabase.from("profiles").select("profile_completion"),
  ]);

  const avgCompletion = profileData?.length
    ? profileData.reduce((sum, p) => sum + (p.profile_completion || 0), 0) / profileData.length
    : 0;

  return {
    totalUsers: totalUsers || 0,
    totalOrders: ordersCounts.all,
    totalModels: totalModels || 0,
    activeSubscriptions,
    totalRevenue: orderMetrics.revenue,
    avgCompletion: Math.round(avgCompletion),
  };
}

export async function fetchAdminAnalyticsRecentUsers(): Promise<RecentUser[]> {
  const users = await fetchAdminUsers();
  return users
    .map((user) => ({
      id: user.id,
      email: user.email || "",
      created_at: user.created_at,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
}

export async function fetchAdminAnalyticsRecentOrders(): Promise<RecentOrder[]> {
  const recentOrders = await fetchUnifiedOrders(
    {
      type: "all",
      status: [],
      dateFrom: null,
      dateTo: null,
      searchQuery: "",
    },
    {
      page: 1,
      pageSize: 5,
    },
  );

  return recentOrders.data.map((order) => ({
    id: order.id,
    status: order.status,
    created_at: order.createdAt,
  }));
}

export async function fetchAdminAnalyticsTopCollectors(): Promise<TopCollector[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, full_name, collector_level, pieces_owned, total_spent")
    .order("total_spent", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data || []) as TopCollector[];
}

export async function fetchAdminAnalyticsCollectionsStats(): Promise<CollectionsStats> {
  const { data, error } = await supabase.from("collections").select("*");
  if (error) throw error;

  const commercialCollections = (
    (data ?? []) as unknown as Array<{
      id: string;
      is_active: boolean;
      collection_kind?: string;
    }>
  ).filter((collection) => collection.collection_kind !== "internal");

  const active = commercialCollections.filter((collection) => collection.is_active).length;
  const inactive = commercialCollections.length - active;

  return { total: commercialCollections.length, active, inactive };
}
