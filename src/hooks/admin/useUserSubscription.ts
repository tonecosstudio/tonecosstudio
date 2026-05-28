import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";

interface UseUserSubscriptionProps {
  userId: string | undefined;
}

interface CoinsBalance {
  available_credits: number;
  total_earned: number;
  total_spent: number;
}

interface SubscriptionCollectionJoin {
  collections: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function useUserSubscription({ userId }: UseUserSubscriptionProps) {
  const activeSubscriptionQuery = useQuery({
    queryKey: ["admin-user-active-subscription", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return null;

      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select(
          `
          id, user_id, status, plan_type, plan_id,
          deliveries_completed, deliveries_total,
          started_at, cancelled_at, completed_at,
          payment_method, total_paid, notes,
          created_at, updated_at
        `
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!subscription) return null;

      const { data: subscriptionCollections } = await supabase
        .from("subscription_collections")
        .select("collection_id, collections(id, name, slug)")
        .eq("subscription_id", subscription.id);

      let plan = null;
      if (subscription.plan_id) {
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("id, name, price, billing_interval, deliveries_per_cycle")
          .eq("id", subscription.plan_id)
          .maybeSingle();
        plan = planData;
      }

      return {
        ...subscription,
        collections_list:
          (subscriptionCollections as SubscriptionCollectionJoin[] | null)
            ?.map((item) => item.collections)
            .filter((collection): collection is NonNullable<typeof collection> => Boolean(collection)) ||
          [],
        plan,
      };
    },
  });

  const coinsBalanceQuery = useQuery({
    queryKey: ["admin-user-coins-balance", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<CoinsBalance | null> => {
      if (!userId) return null;

      const { data } = await supabase
        .from("user_coins")
        .select("balance, total_earned, total_spent")
        .eq("user_id", userId)
        .maybeSingle();

      if (!data) return { available_credits: 0, total_earned: 0, total_spent: 0 };

      return {
        available_credits: data.balance || 0,
        total_earned: data.total_earned || 0,
        total_spent: data.total_spent || 0,
      };
    },
  });

  const monthlySelectionsQuery = useQuery({
    queryKey: ["admin-user-monthly-selections", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data: choices, error } = await supabase
        .from("character_choices")
        .select(
          `
          id, order_id, order_type, status,
          character_name, chosen_at, deadline,
          approved_at, rejected_at, rejection_reason,
          created_at,
          collection_characters:collection_characters!character_choices_character_id_fkey(id, name, image_url),
          collections:collections!character_choices_collection_id_fkey(id, name)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        log.error("Failed to fetch user character choices", { error, userId });
        return [];
      }

      return choices || [];
    },
  });

  return {
    activeSubscription: activeSubscriptionQuery.data,
    coinsBalance: coinsBalanceQuery.data,
    monthlySelections: monthlySelectionsQuery.data || [],
    isLoading:
      activeSubscriptionQuery.isLoading ||
      coinsBalanceQuery.isLoading ||
      monthlySelectionsQuery.isLoading,
  };
}
