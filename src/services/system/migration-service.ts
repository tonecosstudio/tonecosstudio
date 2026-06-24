import { supabase } from "@/integrations/supabase/client";
import { migrateToTiersSchema } from "@/lib/validations/pricing-tiers";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";
import type {
  MigrateToTiersInput,
  MigrationAudit,
  MigrationResult,
  MigrationSuggestion,
} from "@/types/pricing-tiers";

type MigrationAuditProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type MigrationAuditWithProfile = MigrationAudit & {
  profiles: MigrationAuditProfile | null;
};

type MigrationAuditQueryError = {
  message: string;
};

interface MigrationAuditSelectQuery {
  order(column: "started_at", options: { ascending: boolean }): {
    limit(count: number): PromiseLike<{
      data: MigrationAuditWithProfile[] | null;
      error: MigrationAuditQueryError | null;
    }>;
  };
  eq(column: "id", value: string): {
    single(): PromiseLike<{
      data: MigrationAuditWithProfile | null;
      error: MigrationAuditQueryError | null;
    }>;
  };
}

interface MigrationAuditTableClient {
  from(table: "migration_audit"): {
    select(columns: string): MigrationAuditSelectQuery;
  };
}

const migrationAuditSupabase = supabase as unknown as MigrationAuditTableClient;

async function callMigrateToTiers(
  input: MigrateToTiersInput,
): Promise<MigrationResult & { suggestions?: MigrationSuggestion[] }> {
  return callAuthenticatedEdgeFunction<MigrationResult & { suggestions?: MigrationSuggestion[] }>(
    "migrate-to-tiers",
    {
      dryRun: input.dryRun,
      autoCreateTiers: input.autoCreateTiers,
    },
    "Erro ao executar migracao",
  );
}

export async function listMigrationAudits(): Promise<MigrationAuditWithProfile[]> {
  const { data, error } = await migrationAuditSupabase
    .from("migration_audit")
    .select(`
      *,
      profiles:executed_by (
        id,
        full_name,
        email
      )
    `)
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`Erro ao buscar historico de migracoes: ${error.message}`);
  }

  return data ?? [];
}

export async function getMigrationAudit(
  auditId: string,
): Promise<MigrationAuditWithProfile | null> {
  const { data, error } = await migrationAuditSupabase
    .from("migration_audit")
    .select(`
      *,
      profiles:executed_by (
        id,
        full_name,
        email
      )
    `)
    .eq("id", auditId)
    .single();

  if (error) {
    throw new Error(`Erro ao buscar auditoria: ${error.message}`);
  }

  return data;
}

export async function analyzeTierMigration(): Promise<MigrationSuggestion[]> {
  const result = await callMigrateToTiers({
    dryRun: true,
    autoCreateTiers: true,
  });

  return result.suggestions ?? [];
}

export async function executeTierMigration(
  input: MigrateToTiersInput,
  onProgress?: (progress: number) => void,
): Promise<MigrationResult> {
  const validated = migrateToTiersSchema.parse(input);

  onProgress?.(10);
  const result = await callMigrateToTiers(validated);
  onProgress?.(100);

  return result as MigrationResult;
}
