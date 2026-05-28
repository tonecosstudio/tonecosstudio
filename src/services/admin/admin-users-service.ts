import { supabase } from "@/integrations/supabase/client";
import type { AdminAccessRole } from "@/lib/permissions/adminRoles";

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

interface AdminListUsersResponse {
  users?: AdminUserRow[];
  error?: string;
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.functions.invoke<AdminListUsersResponse>(
    "admin-list-users",
    { body: {} },
  );

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data?.users ?? [];
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

export async function promoteAdminByEmail(email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("admin-promote", {
    body: { email: email.trim().toLowerCase(), role: "admin" },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? "Falha ao promover");
}

export async function removeUserRole(input: {
  userId: string;
  role: AdminAccessRole;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("admin-promote", {
    body: { userId: input.userId, role: "customer", previousRole: input.role },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? "Falha ao remover role");
}
