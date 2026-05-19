import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";

interface UseUserDetailsProps {
  userId: string | undefined;
}

export function useUserDetails({ userId }: UseUserDetailsProps) {
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
      if (!data) throw new Error("User not found");

      return data;
    },
  });

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

  const paymentMethodsQuery = useQuery({
    queryKey: ["admin-user-payment-methods", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("manual_payments")
        .select("id, amount, status, payment_method, payment_date, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        log.error("Failed to fetch user payment history", { error, userId });
        return [];
      }

      return data || [];
    },
  });

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
