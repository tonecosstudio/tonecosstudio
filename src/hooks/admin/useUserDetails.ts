import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import type { ProfileRow } from "@/lib/profile";

interface UseUserDetailsProps {
  userId: string | undefined;
}

type AdminUserProfile = ProfileRow & {
  email_notifications: boolean;
  order_updates: boolean;
  marketing_emails: boolean;
};

type AdminUserRole = {
  role: string;
};

type UserPaymentHistory = {
  id: string;
  amount: number;
  status: string | null;
  payment_method: string | null;
  payment_date: string | null;
  created_at: string;
};

export function useUserDetails({ userId }: UseUserDetailsProps) {
  const profileQuery = useQuery<AdminUserProfile>({
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

      return {
        ...(data as unknown as ProfileRow),
        email_notifications: (data as unknown as ProfileRow).email_notifications ?? true,
        order_updates: (data as unknown as ProfileRow).order_updates ?? true,
        marketing_emails: (data as unknown as ProfileRow).marketing_emails ?? false,
      };
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

  const paymentHistoryQuery = useQuery<UserPaymentHistory[]>({
    queryKey: ["admin-user-payment-history", userId],
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

  const roles: AdminUserRole[] = profileQuery.data?.role ? [{ role: profileQuery.data.role }] : [];

  return {
    profile: profileQuery.data,
    roles,
    badges: badgesQuery.data || [],
    paymentHistory: paymentHistoryQuery.data || [],
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
  };
}
