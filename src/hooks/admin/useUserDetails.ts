import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminUserProfile,
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

  const paymentHistoryQuery = useQuery<UserPaymentHistory[]>({
    queryKey: ["admin-user-payment-history", userId],
    enabled: Boolean(userId),
    queryFn: () => listAdminUserPaymentHistory(userId),
  });

  const roles: AdminUserRole[] = profileQuery.data?.role ? [{ role: profileQuery.data.role }] : [];

  return {
    profile: profileQuery.data,
    roles,
    badges: [],
    paymentHistory: paymentHistoryQuery.data || [],
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
  };
}
