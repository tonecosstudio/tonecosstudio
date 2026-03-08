/**
 * Hook para gerenciar dados de assinatura do usuário (Sistema Híbrido)
 * Segue padrão AAA: Arrange, Act, Assert
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseUserSubscriptionProps {
  userId: string | undefined;
}

interface CoinsBalance {
  available_credits: number;
  total_allocated: number;
  used_credits: number;
}

export function useUserSubscription({ userId }: UseUserSubscriptionProps) {
  // Arrange: Query para assinatura ativa
  const activeSubscriptionQuery = useQuery({
    queryKey: ["admin-user-active-subscription", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, collections:active_collection_id(name, slug)")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Arrange: Query para saldo de coins
  const coinsBalanceQuery = useQuery({
    queryKey: ["admin-user-coins-balance", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<CoinsBalance | null> => {
      if (!userId) return null;

      const { data: activeSub } = await supabase
        .from("subscriptions")
        .select("coins_balance, coins_initial")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeSub) return null;

      return {
        available_credits: activeSub.coins_balance || 0,
        total_allocated: activeSub.coins_initial || 0,
        used_credits: (activeSub.coins_initial || 0) - (activeSub.coins_balance || 0),
      };
    },
  });

  // Arrange: Query para escolhas mensais
  const monthlySelectionsQuery = useQuery({
    queryKey: ["admin-user-monthly-selections", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data: selections, error } = await supabase
        .from("subscription_monthly_selections")
        .select("*")
        .eq("user_id", userId)
        .order("delivery_month", { ascending: false });

      if (error) {
        console.error("Erro ao buscar escolhas mensais:", error);
        return [];
      }

      if (!selections || selections.length === 0) return [];

      // Enriquecer com dados de personagens e coleções
      const enriched = await Promise.all(
        selections.map(async (selection) => {
          const [characterResult, collectionResult] = await Promise.all([
            selection.character_id
              ? supabase
                  .from("collection_characters")
                  .select("name, status, image_url")
                  .eq("id", selection.character_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            selection.collection_id
              ? supabase
                  .from("collections")
                  .select("name")
                  .eq("id", selection.collection_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...selection,
            character: characterResult.data,
            collection: collectionResult.data,
          };
        })
      );

      return enriched;
    },
  });

  // Act & Assert: Retornar dados e estados
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
