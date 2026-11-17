import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as TonecosMvpDatabase } from "@/integrations/supabase/tonecos-mvp.types";
import { assertTonecosCommercialEnabled } from "@/config/tonecos-commercial-authority";
import { requireTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";

const tonecos = supabase as unknown as SupabaseClient<TonecosMvpDatabase>;
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type TonartAdminDirectoryProfile = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  profileCompletion: number;
  isAdmin: boolean;
  createdAt: string;
};

export type TonartAdminProfilesPage = {
  total: number;
  limit: number;
  offset: number;
  rows: TonartAdminDirectoryProfile[];
};

export async function listTonartAdminProfiles(options: {
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<TonartAdminProfilesPage> {
  assertTonecosCommercialEnabled();
  const search = (options.search ?? "").trim();
  const limit = options.limit ?? 25;
  const offset = options.offset ?? 0;

  if (
    search.length > 160 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 100000
  ) {
    throw new Error("tonart_admin_profiles_query_invalid");
  }

  await requireTonecosAdminAccess();
  const { data, error } = await tonecos.rpc("tonart_admin_profiles_directory", {
    p_search: search || undefined,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("tonart_admin_profiles_result_invalid");
  }

  const value = data as unknown as Record<string, unknown>;
  if (
    typeof value.total !== "number" ||
    !Number.isSafeInteger(value.total) ||
    value.total < 0 ||
    typeof value.limit !== "number" ||
    value.limit !== limit ||
    typeof value.offset !== "number" ||
    value.offset !== offset ||
    !Array.isArray(value.rows) ||
    value.rows.length > limit
  ) {
    throw new Error("tonart_admin_profiles_result_invalid");
  }

  const total = value.total;
  const rows: TonartAdminDirectoryProfile[] = value.rows.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("tonart_admin_profile_invalid");
    }
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      !uuid.test(row.id) ||
      typeof row.email !== "string" ||
      row.email.length < 3 ||
      row.email.length > 320 ||
      !(row.phone === null ||
        (typeof row.phone === "string" && row.phone.length <= 40)) ||
      !(row.whatsapp === null ||
        (typeof row.whatsapp === "string" && row.whatsapp.length <= 40)) ||
      !(row.cpf === null ||
        (typeof row.cpf === "string" && row.cpf.length <= 14)) ||
      typeof row.profileCompletion !== "number" ||
      !Number.isInteger(row.profileCompletion) ||
      row.profileCompletion < 0 ||
      row.profileCompletion > 100 ||
      typeof row.isAdmin !== "boolean" ||
      !(
        row.fullName === null ||
        (typeof row.fullName === "string" && row.fullName.length <= 160)
      ) ||
      typeof row.createdAt !== "string" ||
      Number.isNaN(Date.parse(row.createdAt))
    ) {
      throw new Error("tonart_admin_profile_invalid");
    }
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      phone: row.phone,
      whatsapp: row.whatsapp,
      cpf: row.cpf,
      profileCompletion: row.profileCompletion,
      isAdmin: row.isAdmin,
      createdAt: row.createdAt,
    };
  });

  if (rows.length > Math.max(0, total - offset)) {
    throw new Error("tonart_admin_profiles_result_invalid");
  }

  return {
    total,
    limit,
    offset,
    rows,
  };
}
