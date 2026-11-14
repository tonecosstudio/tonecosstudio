import { supabase } from "@/integrations/supabase/client";
import type { AdminAccessRole } from "@/lib/permissions/adminRoles";
import { fetchCustomerRelationshipSummary } from "@/services/admin/customers/customer-relationship-service";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";
import {
  listTonartAdminProfiles,
  type TonartAdminDirectoryProfile,
} from "@/services/admin/overview/tonart-admin-profiles-service";

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

function mapProfileToAdminUser(
  profile: TonartAdminDirectoryProfile,
): AdminUserRow {
  return {
    id: profile.id,
    email: profile.email,
    created_at: profile.createdAt,
    profile: {
      id: profile.id,
      full_name: profile.fullName,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      cpf: profile.cpf,
      profile_completion: profile.profileCompletion,
    },
    roles: profile.isAdmin ? ["admin"] : [],
  };
}

async function fetchAdminUsersFromProfiles(): Promise<AdminUserRow[]> {
  const users: AdminUserRow[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const page = await listTonartAdminProfiles({ limit: 100, offset });
    total = page.total;
    users.push(...page.rows.map(mapProfileToAdminUser));
    if (page.rows.length === 0) break;
    offset += page.rows.length;
  }

  return users;
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
