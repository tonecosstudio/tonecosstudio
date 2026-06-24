import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

type MigrationMatch = {
  fileName: string;
  sql: string;
  normalizedSql: string;
};

function normalizeSql(sql: string): string {
  return sql.toLowerCase().replace(/\s+/g, " ").trim();
}

function loadCronJobLoggingMigration(): MigrationMatch {
  const migrationsDir = path.resolve(process.cwd(), "supabase", "migrations");
  const matches = readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .map((fileName) => {
      const sql = readFileSync(path.join(migrationsDir, fileName), "utf8");
      return {
        fileName,
        sql,
        normalizedSql: normalizeSql(sql),
      };
    })
    .filter(({ normalizedSql }) =>
      normalizedSql.includes("create table if not exists public.cron_job_logs")
    );

  expect(matches, "cron job logging must have one schema owner migration").toHaveLength(1);

  return matches[0];
}

describe("Cron Job Logging Infrastructure", () => {
  const migration = loadCronJobLoggingMigration();

  it("declares pg_cron and the canonical cron_job_logs table", () => {
    expect(migration.normalizedSql).toContain(
      "create extension if not exists pg_cron with schema extensions"
    );
    expect(migration.normalizedSql).toContain("id uuid primary key default gen_random_uuid()");
    expect(migration.normalizedSql).toContain("job_name text not null");
    expect(migration.normalizedSql).toContain("started_at timestamptz not null default now()");
    expect(migration.normalizedSql).toContain("completed_at timestamptz");
    expect(migration.normalizedSql).toContain("error_message text");
    expect(migration.normalizedSql).toContain("execution_details jsonb");
    expect(migration.normalizedSql).toContain("created_at timestamptz not null default now()");
    expect(migration.normalizedSql).toContain("status in ('running', 'success', 'failed')");
  });

  it("keeps logs queryable through required production indexes", () => {
    expect(migration.normalizedSql).toContain("idx_cron_job_logs_job_name");
    expect(migration.normalizedSql).toContain("idx_cron_job_logs_started_at");
    expect(migration.normalizedSql).toContain("idx_cron_job_logs_status");
  });

  it("protects cron logs with RLS and least-privilege grants", () => {
    expect(migration.normalizedSql).toContain(
      "alter table public.cron_job_logs enable row level security"
    );
    expect(migration.normalizedSql).toContain(
      "revoke all on public.cron_job_logs from public, anon, authenticated"
    );
    expect(migration.normalizedSql).toContain(
      "grant select on public.cron_job_logs to authenticated"
    );
    expect(migration.normalizedSql).toContain(
      "grant all on public.cron_job_logs to service_role"
    );
    expect(migration.normalizedSql).toContain("cron_job_logs_admin_select");
    expect(migration.normalizedSql).toContain("public.has_role(auth.uid(), 'admin')");
    expect(migration.normalizedSql).toContain("public.has_role(auth.uid(), 'super_admin')");
    expect(migration.normalizedSql).toContain("cron_job_logs_service_role_all");
  });

  it("provides service-role-only RPCs for lifecycle logging", () => {
    const requiredFunctions = [
      "start_cron_job_log",
      "complete_cron_job_log",
      "fail_cron_job_log",
      "cleanup_old_cron_logs",
    ];

    for (const functionName of requiredFunctions) {
      expect(migration.normalizedSql).toContain(
        `create or replace function public.${functionName}`
      );
      expect(migration.normalizedSql).toContain("security definer");
      expect(migration.normalizedSql).toContain("set search_path = public, pg_temp");
      expect(migration.normalizedSql).toContain(
        `grant execute on function public.${functionName}`
      );
      expect(migration.normalizedSql).toContain("to service_role");
    }
  });

  it("validates input and preserves the cron status state machine", () => {
    expect(migration.normalizedSql).toContain("job_name is required");
    expect(migration.normalizedSql).toContain("log_id is required");
    expect(migration.normalizedSql).toContain("error_message is required");
    expect(migration.normalizedSql).toContain("retention_days must be greater than zero");
    expect(migration.normalizedSql).toContain("set status = 'success'");
    expect(migration.normalizedSql).toContain("set status = 'failed'");
    expect(migration.normalizedSql).toContain("where created_at < now() - make_interval");
  });

  it("documents the schema owner for maintainability", () => {
    expect(migration.fileName).toMatch(/cron_job_logging_infrastructure\.sql$/);
    expect(migration.normalizedSql).toContain("comment on table public.cron_job_logs");
    expect(migration.normalizedSql).toContain(
      "comment on function public.cleanup_old_cron_logs(integer)"
    );
  });
});
