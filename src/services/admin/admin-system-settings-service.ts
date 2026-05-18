import { adminProductionGateway } from "@/services/admin/admin-production-gateway";

export interface AdminSystemSetting {
  key: string;
  value: string;
  description: string | null;
}

export async function fetchAdminSystemSettings(): Promise<AdminSystemSetting[]> {
  const { data, error } = await adminProductionGateway.from("system_settings").select("*").order("key");
  if (error) throw error;
  return (data || []) as AdminSystemSetting[];
}

export async function updateAdminSystemSettings(updates: Record<string, string>) {
  const updatePromises = Object.entries(updates).map(async ([key, value]) => {
    const { error } = await adminProductionGateway
      .from("system_settings")
      .upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "key",
          ignoreDuplicates: false,
        }
      );
    return { key, error };
  });

  const results = await Promise.all(updatePromises);
  const errors = results.filter((result) => result.error);
  if (errors.length > 0) {
    throw new Error(`Erro ao atualizar ${errors.length} configuraÃ§Ã£o(Ãµes)`);
  }

  return results;
}
