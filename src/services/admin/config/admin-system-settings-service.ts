import { supabase } from "@/integrations/supabase/client";
import { upsertAdminSystemSettings } from "@/services/admin/config/admin-config-mutations-service";

export interface AdminSystemSetting {
  key: string;
  value: string;
  description: string | null;
}
export async function fetchAdminSystemSettings(): Promise<AdminSystemSetting[]> {
  const { data, error } = await supabase.from("system_settings").select("*").order("key");
  if (error) throw error;
  return (data || []) as AdminSystemSetting[];
}

export async function updateAdminSystemSettings(updates: Record<string, string>) {
  await upsertAdminSystemSettings(updates);
  const results = Object.keys(updates).map((key) => ({ key, error: null }));
  const errors: Array<{ error: unknown }> = [];
  if (errors.length > 0) {
    throw new Error(`Erro ao atualizar ${errors.length} configuracao(oes)`);
  }

  return results;
}
