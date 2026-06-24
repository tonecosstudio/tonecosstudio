import { supabase } from "@/integrations/supabase/client";
import { hasAnyAdminAccessRole } from "@/lib/permissions/adminRoles";
import { fetchAdminUsers } from "@/services/admin/users/admin-users-service";

export interface ProductionCollectionFilterOption {
  id: string;
  name: string;
}

export interface ProductionTeamMemberFilterOption {
  id: string;
  name: string;
}

export async function fetchProductionCollectionFilterOptions(): Promise<
  ProductionCollectionFilterOption[]
> {
  const { data, error } = await supabase
    .from("collections")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new Error(`Erro ao buscar colecoes para filtros de producao: ${error.message}`);
  }

  return data ?? [];
}

export async function fetchProductionTeamMemberFilterOptions(): Promise<
  ProductionTeamMemberFilterOption[]
> {
  const users = await fetchAdminUsers();

  return users
    .filter((user) => hasAnyAdminAccessRole(user.roles))
    .map((user) => ({
      id: user.id,
      name: user.profile?.full_name || user.email || "Sem nome",
    }));
}
