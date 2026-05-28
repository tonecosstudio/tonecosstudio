import { supabase } from "@/integrations/supabase/client";
import { assertCurrentUserId } from "@/services/auth/current-user";

export type CustomerDashboardQuote = {
  id: string;
  status: string | null;
  created_at: string;
};

export type CustomerDashboardCollector = {
  collector_level: number | null;
  collector_xp: number | null;
  pieces_owned: number | null;
  total_spent: number | null;
};

export type CustomerDashboardNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export type CustomerDashboardStats = {
  quotes: CustomerDashboardQuote[];
  totalQuotes: number;
  totalLikes: number;
  totalWishlist: number;
  collector: CustomerDashboardCollector | null;
};

export async function getCustomerDashboardStats(userId: string): Promise<CustomerDashboardStats> {
  await assertCurrentUserId(userId);

  const [quotesRes, likesRes, wishlistRes, collectorRes] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("model_likes").select("id").eq("user_id", userId),
    supabase.from("wishlist").select("id").eq("user_id", userId),
    supabase
      .from("profiles")
      .select("collector_level, collector_xp, pieces_owned, total_spent")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (quotesRes.error) throw quotesRes.error;
  if (likesRes.error) throw likesRes.error;
  if (wishlistRes.error) throw wishlistRes.error;
  if (collectorRes.error) throw collectorRes.error;

  const quotes = (quotesRes.data ?? []) as CustomerDashboardQuote[];

  return {
    quotes,
    totalQuotes: quotes.length,
    totalLikes: likesRes.data?.length ?? 0,
    totalWishlist: wishlistRes.data?.length ?? 0,
    collector: (collectorRes.data as CustomerDashboardCollector | null) ?? null,
  };
}

export async function listCustomerDashboardNotifications(
  userId: string,
): Promise<CustomerDashboardNotification[]> {
  await assertCurrentUserId(userId);

  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,message,created_at")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return (data ?? []) as CustomerDashboardNotification[];
}
