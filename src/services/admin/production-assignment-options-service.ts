import { supabase } from "@/integrations/supabase/client";

export interface ProductionAssignmentTeamMember {
  id: string;
  name: string;
  email: string;
  workload: number;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

export async function fetchProductionAssignmentTeamMembers(): Promise<
  ProductionAssignmentTeamMember[]
> {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name");

  if (profilesError) {
    throw new Error(`Erro ao buscar membros da equipe: ${profilesError.message}`);
  }

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

  return ((profiles ?? []) as ProfileRow[]).map((profile) => ({
    id: profile.id,
    name: profile.full_name || profile.email || "Sem nome",
    email: profile.email || "",
    workload: workloadByMember.get(profile.id) ?? 0,
  }));
}
