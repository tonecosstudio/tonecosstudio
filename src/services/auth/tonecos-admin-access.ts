import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as TonecosMvpDatabase } from "@/integrations/supabase/tonecos-mvp.types";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import { assertTonecosCommercialEnabled } from "@/config/tonecos-commercial-authority";

const tonecos = supabase as unknown as SupabaseClient<TonecosMvpDatabase>;

/** Single administrative authority: database-managed membership, never e-mail or user metadata. */
export async function hasTonecosAdminAccess(): Promise<boolean> {
  assertTonecosCommercialEnabled();
  const current = await getTonecosCurrentUser();
  if (!current) throw new Error("User not authenticated");
  const { data, error } = await tonecos.rpc("is_tonecos_admin");
  if (error) throw error;
  return data === true;
}

export async function requireTonecosAdminAccess(): Promise<void> {
  if (!(await hasTonecosAdminAccess()))
    throw new Error("Admin access required");
}
