import { hasAnyAdminAccessRole } from "@/lib/permissions/adminRoles";
import {
  fetchProductionQueue,
} from "@/services/admin/production/production-service";
import { fetchAdminUsers } from "@/services/admin/users/admin-users-service";

export interface ProductionAssignmentTeamMember {
  id: string;
  name: string;
  email: string;
  workload: number;
}

export async function fetchProductionAssignmentTeamMembers(): Promise<
  ProductionAssignmentTeamMember[]
> {
  const [users, queue] = await Promise.all([
    fetchAdminUsers(),
    fetchProductionQueue(
      { statuses: ["ready_for_production", "in_production"] },
      { page: 1, pageSize: Number.MAX_SAFE_INTEGER },
    ),
  ]);

  const workloadByMember = new Map<string, number>();
  for (const item of queue.data) {
    if (!item.assignedTo) continue;
    workloadByMember.set(item.assignedTo, (workloadByMember.get(item.assignedTo) ?? 0) + 1);
  }

  return users
    .filter((user) => hasAnyAdminAccessRole(user.roles))
    .map((user) => ({
      id: user.id,
      name: user.profile?.full_name || user.email || "Sem nome",
      email: user.email || "",
      workload: workloadByMember.get(user.id) ?? 0,
    }));
}
