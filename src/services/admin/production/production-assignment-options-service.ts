import { supabase } from "@/integrations/supabase/client";
import { hasAnyAdminAccessRole } from "@/lib/permissions/adminRoles";
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
  const users = await fetchAdminUsers();

  const { data: workloadData, error: workloadError } = await supabase
    .from("production_queue")
    .select("assigned_to")
    .not("assigned_to", "is", null)
    .in("production_status", ["ready_for_production", "in_production"]);

  if (workloadError) {
    throw new Error(`Erro ao buscar carga de trabalho: ${workloadError.message}`);
  }

  const workloadByMember = new Map<string, number>();
  workloadData?.forEach((item) => {
    if (!item.assigned_to) {
      return;
    }

    workloadByMember.set(item.assigned_to, (workloadByMember.get(item.assigned_to) ?? 0) + 1);
  });

  return users
    .filter((user) => hasAnyAdminAccessRole(user.roles))
    .map((user) => ({
      id: user.id,
      name: user.profile?.full_name || user.email || "Sem nome",
      email: user.email || "",
      workload: workloadByMember.get(user.id) ?? 0,
    }));
}
