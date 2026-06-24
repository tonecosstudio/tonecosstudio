import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminUserProfile,
  listAdminUserBadges,
  listAdminUserPaymentHistory,
  type AdminUserProfile,
  type AdminUserRole,
  type UserPaymentHistory,
} from "@/services/admin/users/admin-user-details-service";

interface UseUserDetailsProps {
  userId: string | undefined;
}

export function useUserDetails({ userId }: UseUserDetailsProps) {
  const profileQuery = useQuery<AdminUserProfile>({
    queryKey: ["admin-user-profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      return fetchAdminUserProfile(userId);
    },
  });

  const badgesQuery = useQuery({
    queryKey: ["admin-user-badges", userId],
    enabled: Boolean(userId),
    queryFn: () => listAdminUserBadges(userId),
  });

  const paymentHistoryQuery = useQuery<UserPaymentHistory[]>({
    queryKey: ["admin-user-payment-history", userId],
    enabled: Boolean(userId),
    queryFn: () => listAdminUserPaymentHistory(userId),
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
