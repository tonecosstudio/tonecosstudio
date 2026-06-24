import { supabase } from "@/integrations/supabase/client";
import type { AdminAccessRole } from "@/lib/permissions/adminRoles";
import type { ProfileRow } from "@/lib/profile";
import { fetchCustomerRelationshipSummary } from "@/services/admin/customers/customer-relationship-service";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";

export const adminUsersSupabase = supabase;

export type AdminUserRow = {
  id: string;
  email: string | null;
  created_at: string;
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

type AdminProfileListRow = ProfileRow & {
  created_at?: string;
  role?: string | null;
};

function mapProfileToAdminUser(profile: AdminProfileListRow): AdminUserRow {
  return {
    id: profile.id,
    email: profile.email ?? null,
    created_at: profile.created_at ?? new Date(0).toISOString(),
    profile: {
      id: profile.id,
      full_name: profile.full_name ?? null,
      phone: profile.phone ?? null,
      whatsapp: profile.whatsapp ?? null,
      cpf: profile.cpf ?? null,
      profile_completion: profile.profile_completion ?? null,
    },
    roles: profile.role ? [profile.role] : [],
  };
}

async function fetchAdminUsersFromProfiles(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as AdminProfileListRow[]).map(mapProfileToAdminUser);
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  return fetchAdminUsersFromProfiles();
}

export async function fetchAdminUsersStats() {
  const { subscriberIds, buyerIds } = await fetchCustomerRelationshipSummary();

  return {
    subscriberIds,
    buyerIds,
    totalSubscribers: subscriberIds.size,
    totalBuyers: buyerIds.size,
  };
}

export async function promoteAdminByEmail(email: string): Promise<void> {
  const data = await callAuthenticatedEdgeFunction<{ ok?: boolean; error?: string }>(
    "admin-promote",
    { email: email.trim().toLowerCase(), role: "admin" },
    "Falha ao promover",
  );

  if (!data?.ok) throw new Error(data?.error ?? "Falha ao promover");
}

export async function removeUserRole(input: {
  userId: string;
  role: AdminAccessRole;
}): Promise<void> {
  const data = await callAuthenticatedEdgeFunction<{ ok?: boolean; error?: string }>(
    "admin-promote",
    { userId: input.userId, role: "customer", previousRole: input.role },
    "Falha ao remover role",
  );

  if (!data?.ok) throw new Error(data?.error ?? "Falha ao remover role");
}
