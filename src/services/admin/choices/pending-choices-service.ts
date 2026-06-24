import { supabase } from "@/integrations/supabase/client";

export interface PendingChoice {
  delivery_id: string;
  delivery_number: number;
  user_id: string;
  user_name: string;
  user_email: string;
  subscription_id: string;
}

interface DeliveryPendingRow {
  id: string;
  delivery_number: number | null;
  subscriptions: {
    id: string;
    user_id: string;
  } | null;
}

interface PendingChoiceProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
}

export async function fetchPendingChoices(cycleIds: string[]): Promise<PendingChoice[]> {
  if (!cycleIds || cycleIds.length === 0) return [];

  const { data, error } = await supabase
    .from("subscription_deliveries")
    .select(`
      id,
      delivery_number,
      subscription_id,
      subscriptions!inner (
        id,
        user_id
      )
    `)
    .in("cycle_id", cycleIds)
    .eq("status", "pending_choice")
    .order("delivery_number", { ascending: true });

  if (error) throw error;

  const deliveries = (data ?? []) as unknown as DeliveryPendingRow[];
  const userIds = [
    ...new Set(
      deliveries
        .map((delivery) => delivery.subscriptions?.user_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, full_name, display_name")
        .in("id", userIds)
    : { data: [], error: null };

  if (profilesError) throw profilesError;

  const profilesById = new Map(
    ((profiles ?? []) as PendingChoiceProfileRow[]).map((profile) => [profile.id, profile])
  );

  return deliveries.map((delivery) => {
    if (delivery.delivery_number === null) {
      throw new Error(`Entrega pendente sem delivery_number: ${delivery.id}`);
    }

    const userId = delivery.subscriptions?.user_id ?? "";
    const profile = profilesById.get(userId);

    return {
      delivery_id: delivery.id,
      delivery_number: delivery.delivery_number,
      subscription_id: delivery.subscriptions?.id || "",
      user_id: userId,
      user_name: profile?.full_name || profile?.display_name || profile?.email || "",
      user_email: profile?.email || "",
    };
  });
}
