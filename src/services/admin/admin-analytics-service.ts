import { supabase } from "@/integrations/supabase/client";

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
  const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
  const { count: totalOrders } = await supabase.from("quotes").select("*", { count: "exact", head: true });
  const { count: totalModels } = await supabase.from("models").select("*", { count: "exact", head: true });
  const { count: activeSubscriptions } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { data: revenueData } = await supabase.from("profiles").select("total_spent");
  const totalRevenue = revenueData?.reduce((sum, p) => sum + (p.total_spent || 0), 0) || 0;

  const { data: profileData } = await supabase.from("profiles").select("profile_completion");
  const avgCompletion = profileData?.length
    ? profileData.reduce((sum, p) => sum + (p.profile_completion || 0), 0) / profileData.length
    : 0;

  return {
    totalUsers: totalUsers || 0,
    totalOrders: totalOrders || 0,
    totalModels: totalModels || 0,
    activeSubscriptions: activeSubscriptions || 0,
    totalRevenue,
    avgCompletion: Math.round(avgCompletion),
  };
}

export async function fetchAdminAnalyticsRecentUsers(): Promise<RecentUser[]> {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) {
    return [];
  }
  const users = (data || []) as RecentUser[];
  return users
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
}

export async function fetchAdminAnalyticsRecentOrders(): Promise<RecentOrder[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("id, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data || []) as RecentOrder[];
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
  const { data, error } = await supabase.from("collections").select("id, name, is_active");
  if (error) throw error;

  const active = data?.filter((c) => c.is_active).length || 0;
  const inactive = data?.filter((c) => !c.is_active).length || 0;

  return { total: data?.length || 0, active, inactive };
}

