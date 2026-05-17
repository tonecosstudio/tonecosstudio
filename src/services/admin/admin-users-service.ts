import { supabase } from "@/integrations/supabase/client";

export const adminUsersSupabase = supabase;

export type AdminUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed_at: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  profile: {
    id: string;
    full_name: string | null;
    phone: string | null;
    whatsapp: string | null;
    cpf: string | null;
    profile_completion: number | null;
  } | null;
  roles: string[];
};

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (profilesError) throw profilesError;

  const { data: rolesData, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id, role");

  if (rolesError) throw rolesError;

  const rolesMap = new Map<string, string[]>();
  (rolesData || []).forEach((r) => {
    const roles = rolesMap.get(r.user_id) || [];
    roles.push(r.role);
    rolesMap.set(r.user_id, roles);
  });

  return (profilesData || []).map((profile) => ({
    id: profile.id,
    email: profile.email,
    created_at: profile.created_at,
    last_sign_in_at: profile.updated_at,
    confirmed_at: null,
    email_confirmed_at: null,
    phone: profile.phone,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      cpf: profile.cpf,
      profile_completion: profile.profile_completion,
    },
    roles: rolesMap.get(profile.id) || [],
  }));
}

export async function fetchAdminUsersStats() {
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("user_id, status")
    .eq("status", "active");

  const { data: payments } = await supabase
    .from("manual_payments")
    .select("user_id")
    .eq("status", "approved");

  const subscriberIds = new Set((subscriptions || []).map((s) => s.user_id));
  const buyerIds = new Set((payments || []).map((p) => p.user_id));

  return {
    subscriberIds,
    buyerIds,
    totalSubscribers: subscriberIds.size,
    totalBuyers: buyerIds.size,
  };
}
