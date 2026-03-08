/**
 * Hook para gerenciar dados de detalhes do usuário no admin
 * Segue padrão AAA: Arrange, Act, Assert
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseUserDetailsProps {
  userId: string | undefined;
}

export function useUserDetails({ userId }: UseUserDetailsProps) {
  // Arrange: Query para perfil do usuário
  const profileQuery = useQuery({
    queryKey: ["admin-user-profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Usuário não encontrado");

      return data;
    },
  });

  // Arrange: Query para roles do usuário
  const rolesQuery = useQuery({
    queryKey: ["admin-user-roles", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) throw error;
      return data || [];
    },
  });

  // Arrange: Query para badges do usuário
  const badgesQuery = useQuery({
    queryKey: ["admin-user-badges", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("user_badges")
        .select("id, earned_at, badge:collector_badges(*)")
        .eq("user_id", userId);

      if (error) throw error;
      return data || [];
    },
  });

  // Arrange: Query para métodos de pagamento
  const paymentMethodsQuery = useQuery({
    queryKey: ["admin-user-payment-methods", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
  });

  // Act & Assert: Retornar dados e estados
  return {
    profile: profileQuery.data,
    roles: rolesQuery.data || [],
    badges: badgesQuery.data || [],
    paymentMethods: paymentMethodsQuery.data || [],
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
  };
}
