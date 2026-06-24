import { useQuery } from "@tanstack/react-query";
import { fetchAdminUsers, fetchAdminUsersStats } from "@/services/admin/users/admin-users-service";

export function useAdminUsersData() {
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
  });

  const statsQuery = useQuery({
    queryKey: ["admin-users-stats"],
    queryFn: fetchAdminUsersStats,
  });

  return {
    usersQuery,
    statsQuery,
    allUsers: usersQuery.data ?? [],
    stats: statsQuery.data,
  };
}
