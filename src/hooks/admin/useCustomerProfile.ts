import { useQuery } from "@tanstack/react-query";
import { fetchCustomerProfile } from "@/services/admin/customer-profile-service";

export function useCustomerProfile(userId: string) {
  return useQuery({
    queryKey: ["admin-customer-profile", userId],
    queryFn: () => fetchCustomerProfile(userId),
    enabled: Boolean(userId),
  });
}
