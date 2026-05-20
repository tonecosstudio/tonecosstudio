import { supabase } from "@/integrations/supabase/client";

export interface ProductionCollectionFilterOption {
  id: string;
  name: string;
}

export interface ProductionTeamMemberFilterOption {
  id: string;
  name: string;
}

interface AdminListUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: string[] | null;
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
  const { data, error } = await supabase.rpc("admin_list_users");

  if (error) {
    throw new Error(`Erro ao buscar equipe para filtros de producao: ${error.message}`);
  }

  return ((data ?? []) as AdminListUserRow[])
    .filter((user) => Array.isArray(user.roles) && user.roles.includes("admin"))
    .map((user) => ({
      id: user.id,
      name: user.full_name || user.email || "Sem nome",
    }));
}
