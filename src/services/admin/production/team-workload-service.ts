import { supabase } from "@/integrations/supabase/client";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type TeamWorkloadItem = {
  id: string;
  customer_name: string | null;
  collection_name: string | null;
  current_stage: string | null;
  priority: string | number | null;
  assigned_to: string | null;
};

type CompletedWorkloadItem = {
  assigned_to: string | null;
  production_started_at: string | null;
  production_completed_at: string | null;
};

export type TeamMemberWorkload = {
  id: string;
  name: string;
  email: string;
  workload: number;
  items: TeamWorkloadItem[];
  averageCompletionTime: number;
  isOverloaded: boolean;
};

function calculateCompletionTimes(items: CompletedWorkloadItem[]) {
  const completionTimesByMember = new Map<string, number[]>();

  items.forEach((item) => {
    if (!item.assigned_to || !item.production_started_at || !item.production_completed_at) {
      return;
    }

    const start = new Date(item.production_started_at).getTime();
    const end = new Date(item.production_completed_at).getTime();
    const hours = (end - start) / (1000 * 60 * 60);

    if (!Number.isFinite(hours) || hours < 0) {
      return;
    }

    const times = completionTimesByMember.get(item.assigned_to) ?? [];
    times.push(hours);
    completionTimesByMember.set(item.assigned_to, times);
  });

  return completionTimesByMember;
}

function groupActiveItemsByMember(items: TeamWorkloadItem[]) {
  const itemsByMember = new Map<string, TeamWorkloadItem[]>();

  items.forEach((item) => {
    if (!item.assigned_to) {
      return;
    }

    const memberItems = itemsByMember.get(item.assigned_to) ?? [];
    memberItems.push(item);
    itemsByMember.set(item.assigned_to, memberItems);
  });

  return itemsByMember;
}

export function buildTeamWorkload(
  profiles: ProfileRow[],
  activeItems: TeamWorkloadItem[],
  completedItems: CompletedWorkloadItem[]
): TeamMemberWorkload[] {
  const completionTimesByMember = calculateCompletionTimes(completedItems);
  const itemsByMember = groupActiveItemsByMember(activeItems);
  const avgItemsPerMember = profiles.length > 0 ? activeItems.length / profiles.length : 0;
  const overloadThreshold = avgItemsPerMember * 1.5;

  return profiles
    .map((profile) => {
      const memberItems = itemsByMember.get(profile.id) ?? [];
      const completionTimes = completionTimesByMember.get(profile.id) ?? [];
      const averageCompletionTime =
        completionTimes.length > 0
          ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
          : 0;

      return {
        id: profile.id,
        name: profile.full_name || profile.email || "Sem nome",
        email: profile.email || "",
        workload: memberItems.length,
        items: memberItems,
        averageCompletionTime,
        isOverloaded: memberItems.length > overloadThreshold && overloadThreshold > 0,
      };
    })
    .filter((member) => member.workload > 0);
}

export async function fetchTeamWorkload(): Promise<TeamMemberWorkload[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name");

  if (profilesError) throw profilesError;

  const { data: activeItems, error: itemsError } = await supabase
    .from("production_queue")
    .select("id, customer_name, collection_name, current_stage, priority, assigned_to")
    .not("assigned_to", "is", null)
    .in("production_status", ["ready_for_production", "in_production"]);

  if (itemsError) throw itemsError;

  const { data: completedItems, error: completedError } = await supabase
    .from("production_queue")
    .select("assigned_to, production_started_at, production_completed_at")
    .not("assigned_to", "is", null)
    .not("production_started_at", "is", null)
    .not("production_completed_at", "is", null);

  if (completedError) throw completedError;

  return buildTeamWorkload(
    profiles ?? [],
    (activeItems ?? []) as TeamWorkloadItem[],
    completedItems ?? []
  );
}
