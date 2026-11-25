/**
 * Read-only M5 release gate. Never deploys, changes workflows or writes D1/R2.
 * Checks only Cloudflare D1 schema metadata needed for Worker compatibility.
 * An approval flag alone is insufficient: inspect the source writer and live Worker state.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
// The manifest owns source/target identities; staged Wrangler owns Worker resources.
// The offline monorepo guard pins these identities to the approved repository.
const CANONICAL = JSON.parse(
  readFileSync(join(ROOT, "config/catalog-code-consolidation.json"), "utf8"),
);
const WORKER_CONFIG = JSON.parse(
  readFileSync(join(ROOT, "services/catalogo/wrangler.jsonc"), "utf8"),
);
const SCHEMA_CONTRACT = JSON.parse(
  readFileSync(
    join(ROOT, "services/catalogo/config/catalog-schema-contract.json"),
    "utf8",
  ),
);
const SOURCE_WORKFLOW_ID = CANONICAL.origin.apiDeployWorkflowId;
const SOURCE_WORKFLOW_PATH = CANONICAL.origin.apiDeployPipeline;
const SOURCE_WRITERS = CANONICAL.origin.additionalWriterWorkflows;
const SOURCE_REPO = CANONICAL.origin.repository;
const SOURCE_REPO_ID = CANONICAL.origin.repositoryId;
const SOURCE_MAIN_SHA = CANONICAL.origin.observedMainSha;
const SOURCE_FIX_PR = CANONICAL.staging.sourceFixPullRequest;
const SOURCE_FIX_HEAD = CANONICAL.staging.sourceFixMergedHead;
const SOURCE_FIX_MERGE_SHA = CANONICAL.staging.sourceFixMergeCommit;
const SOURCE_FIX_BASE_SHA = CANONICAL.staging.sourceFixBaseShaAtMerge;
const TARGET_REPO = CANONICAL.target.repository;
const TARGET_REPO_ID = CANONICAL.target.repositoryId;
const CLOUDFLARE_ACCOUNT_ID = CANONICAL.runtime.cloudflareAccountId;
const WORKER_NAME = CANONICAL.runtime.worker;
const WORKERS_BUILDS_SCRIPT_TAG = CANONICAL.productionObservation.workersBuildsScriptTag;
const WORKER_D1 = WORKER_CONFIG.d1_databases?.find(
  (binding) => binding.binding === "DB",
);
const WORKER_MEDIA = WORKER_CONFIG.r2_buckets?.find(
  (binding) => binding.binding === "MEDIA",
);
const WORKER_PRIVATE_TELEGRAM = WORKER_CONFIG.r2_buckets?.find(
  (binding) => binding.binding === "PRIVATE_TELEGRAM",
);
const REQUIRED_ADMIN_SECRETS = [
  "ADMIN_SUPABASE_ANON_KEY",
  "ADMIN_SUPABASE_URL",
];
const REQUIRED_WORKER_SECRETS = [
  ...REQUIRED_ADMIN_SECRETS,
  "TURNSTILE_SECRET_KEY",
];
// The additive D1 migration is the authority for its index name. The
// expanded target Worker schema must be verified independently of 0025/0028.
const SHOWCASE_INDEX_MIGRATION_SQL = readFileSync(
  join(
    ROOT,
    "services/catalogo/migrations/0028_telegram_showcase_listing_index.sql",
  ),
  "utf8",
);
const SHOWCASE_INDEX_STATEMENT = SHOWCASE_INDEX_MIGRATION_SQL.match(
  /\bCREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+([a-z][a-z0-9_]*)\s+[\s\S]*?;/i,
);
const REQUIRED_SHOWCASE_LISTING_INDEX = SHOWCASE_INDEX_STATEMENT?.[1] ?? null;
// sqlite_master removes IF NOT EXISTS from its stored CREATE INDEX statement.
const REQUIRED_SHOWCASE_INDEX_DEFINITION =
  SHOWCASE_INDEX_STATEMENT?.[0]
    .replace(/\bIF\s+NOT\s+EXISTS\s+/i, "")
    .replace(/;\s*$/, "")
    .replace(/\s+/g, " ")
    .trim() ?? null;
const normalizeIndexDefinition = (value) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : null;
const REQUIRED_SHOWCASE_COLUMN = "telegram_showcase_visible";
const REQUIRED_WORKER_MIGRATIONS = SCHEMA_CONTRACT.requiredMigrations ?? [];
const REQUIRED_SHOWCASE_MIGRATION = REQUIRED_WORKER_MIGRATIONS.find((x) =>
  x.startsWith("0025_telegram_showcase_"),
);
const REQUIRED_SHOWCASE_TRIGGERS =
  SCHEMA_CONTRACT.requiredObjects?.triggers?.filter((x) =>
    x.startsWith("trg_telegram_showcase_"),
  ) ?? [];

const REQUIRED_SCHEMA_OBJECTS = SCHEMA_CONTRACT.requiredObjects;
const REQUIRED_SCHEMA_COLUMNS = Object.entries(
  REQUIRED_SCHEMA_OBJECTS?.columns ?? {},
);
const identifierList = (names) =>
  Array.isArray(names) &&
  names.length > 0 &&
  names.every(
    (name) => typeof name === "string" && /^[a-z][a-z0-9_]*$/.test(name),
  ) &&
  new Set(names).size === names.length;
const sameNames = (expected, actual) =>
  identifierList(expected) &&
  Array.isArray(actual) &&
  actual.length === expected.length &&
  new Set(actual).size === actual.length &&
  expected.every((name) => actual.includes(name));

export function assessCutoverReadiness(contract, state) {
  const blockers = [];
  const m = contract?.migration ?? {};
  const o = contract?.productionObservation ?? {};
  const observed = state ?? {};
  const workflow = observed.workflow;
  const add = (condition, reason) => {
    if (!condition) blockers.push(reason);
  };

  add(
    contract?.origin?.repository === SOURCE_REPO,
    "origin_repository_mismatch",
  );
  // GitHub repository identity and exact source HEAD must be observed, not inferred
  // from a stale import manifest. No D1/R2 request is made by these checks.
  add(
    contract?.origin?.repositoryId === SOURCE_REPO_ID &&
      observed.sourceRepositoryId === SOURCE_REPO_ID &&
      observed.sourceRepositoryName === SOURCE_REPO,
    "source_repository_identity_unverified",
  );
  add(
    typeof SOURCE_MAIN_SHA === "string" &&
      /^[0-9a-f]{40}$/.test(SOURCE_MAIN_SHA) &&
      contract?.origin?.observedMainSha === SOURCE_MAIN_SHA &&
      contract?.staging?.sourceMain === SOURCE_MAIN_SHA &&
      o.observedSourceMainSha === SOURCE_MAIN_SHA &&
      observed.sourceMainRef === "refs/heads/main" &&
      observed.sourceMainSha === SOURCE_MAIN_SHA,
    "source_main_drift_or_unverified",
  );
  // PR #266 has been merged into source main. The historical draft head
  // remains provenance, but only a verified merged head, merge commit,
  // original base and exact media blob can prove current source ownership.
  const patch = observed.sourceFix;
  add(
    Number.isInteger(SOURCE_FIX_PR) &&
      SOURCE_FIX_PR > 0 &&
      typeof SOURCE_FIX_HEAD === "string" &&
      /^[0-9a-f]{40}$/.test(SOURCE_FIX_HEAD) &&
      typeof SOURCE_FIX_MERGE_SHA === "string" &&
      /^[0-9a-f]{40}$/.test(SOURCE_FIX_MERGE_SHA) &&
      typeof SOURCE_FIX_BASE_SHA === "string" &&
      /^[0-9a-f]{40}$/.test(SOURCE_FIX_BASE_SHA) &&
      contract?.staging?.sourceFixPullRequest === SOURCE_FIX_PR &&
      contract?.staging?.sourceFixStatusAtImport === "open-draft-not-merged" &&
      contract?.staging?.sourceFixStatusAtReconciliation === "merged-in-main" &&
      contract?.staging?.sourceFixMergedHead === SOURCE_FIX_HEAD &&
      contract?.staging?.sourceFixMergeCommit === SOURCE_FIX_MERGE_SHA &&
      contract?.staging?.sourceFixBaseShaAtMerge === SOURCE_FIX_BASE_SHA &&
      patch?.number === SOURCE_FIX_PR &&
      patch?.state === "closed" &&
      patch?.draft === false &&
      patch?.merged === true &&
      patch?.headSha === SOURCE_FIX_HEAD &&
      patch?.mergeCommitSha === SOURCE_FIX_MERGE_SHA &&
      patch?.baseSha === SOURCE_FIX_BASE_SHA &&
      patch?.headRepo === SOURCE_REPO &&
      observed.sourceMediaBlobSha ===
        contract?.staging?.fileBlobs?.["worker/media.ts"],
    "source_media_patch_drift_or_unverified",
  );
  add(
    contract?.origin?.apiDeployWorkflowId === SOURCE_WORKFLOW_ID &&
      contract?.origin?.apiDeployPipeline === SOURCE_WORKFLOW_PATH,
    "github_workflow_identity_unverified",
  );
  add(
    contract?.target?.repository === TARGET_REPO &&
      contract?.target?.repositoryId === TARGET_REPO_ID &&
      observed.targetRepositoryName === TARGET_REPO &&
      observed.targetRepositoryId === TARGET_REPO_ID &&
      observed.targetDefaultBranch === "main",
    "target_repository_mismatch",
  );
  add(
    contract?.runtime?.worker === WORKER_NAME &&
      contract?.runtime?.cloudflareAccountId === CLOUDFLARE_ACCOUNT_ID &&
      o.worker === WORKER_NAME &&
      o.cloudflareAccountId === CLOUDFLARE_ACCOUNT_ID,
    "worker_authority_mismatch",
  );
  add(
    WORKER_CONFIG.name === WORKER_NAME &&
      WORKER_D1?.database_name === contract?.runtime?.d1 &&
      WORKER_MEDIA?.bucket_name === contract?.runtime?.r2 &&
      WORKER_PRIVATE_TELEGRAM?.bucket_name === "tonecos-catalogo-staging" &&
      Array.isArray(WORKER_CONFIG.r2_buckets) &&
      WORKER_CONFIG.r2_buckets.length === 2 &&
      Array.isArray(WORKER_CONFIG.secrets?.required) &&
      WORKER_CONFIG.secrets.required.length ===
        REQUIRED_WORKER_SECRETS.length &&
      REQUIRED_WORKER_SECRETS.every((name) =>
        WORKER_CONFIG.secrets.required.includes(name),
      ) &&
      WORKER_CONFIG.main === "worker/entry.ts",
    "staged_worker_config_mismatch",
  );
  add(m.phase === "cutover-approved", "cutover_not_approved");
  add(
    m.releaseAuthorized === true && o.releaseGoApproved === true,
    "explicit_release_go_missing",
  );
  add(
    m.sourceWriterDisabled === true &&
      o.sourceWorkflowDisabledVerified === true,
    "source_writer_not_confirmed_disabled",
  );
  add(
    m.targetWorkerReleaseEnabled === true &&
      contract.activeWorkerPublisher === contract.target?.repository,
    "target_not_unique_publisher",
  );
  add(
    m.targetD1MigrationEnabled === false,
    "remote_d1_migrations_must_remain_disabled",
  );
  add(
    o.targetProductionCredentialsVerified === true,
    "target_credentials_unverified",
  );
  add(o.rollbackTestedAgainstProduction === true, "rollback_not_verified");
  add(
    workflow?.id === SOURCE_WORKFLOW_ID &&
      workflow?.path === SOURCE_WORKFLOW_PATH,
    "github_workflow_identity_unverified",
  );
  add(
    workflow?.state === "disabled_manually",
    "source_github_workflow_still_enabled",
  );
  add(
    Number.isInteger(observed.running) && observed.running === 0,
    "source_workflow_runs_in_progress_or_unverified",
  );
  add(
    Number.isInteger(observed.queued) && observed.queued === 0,
    "source_workflow_runs_queued_or_unverified",
  );
  add(
    Number.isInteger(observed.requested) && observed.requested === 0,
    "source_workflow_runs_requested_or_unverified",
  );
  add(
    Number.isInteger(observed.waiting) && observed.waiting === 0,
    "source_workflow_runs_waiting_or_unverified",
  );
  add(
    Number.isInteger(observed.pending) && observed.pending === 0,
    "source_workflow_runs_pending_or_unverified",
  );
  // The retiring repository had additional independent production D1/R2 writers.
  // Disabling only cloudflare.yml does not prove a unique publishing authority.
  const registeredWriters = contract?.origin?.additionalWriterWorkflows;
  const observedWriters = observed.additionalWriters;
  add(
    Array.isArray(SOURCE_WRITERS) &&
      SOURCE_WRITERS.length === 4 &&
      Array.isArray(registeredWriters) &&
      registeredWriters.length === SOURCE_WRITERS.length &&
      new Set(registeredWriters.map((x) => x.path)).size === 4 &&
      SOURCE_WRITERS.every((writer) =>
        registeredWriters.some(
          (x) => x.id === writer.id && x.path === writer.path,
        ),
      ) &&
      Array.isArray(observedWriters) &&
      observedWriters.length === SOURCE_WRITERS.length &&
      SOURCE_WRITERS.every((writer) => {
        const live = observedWriters.find((x) => x?.path === writer.path);
        return (
          live?.id === writer.id &&
          live?.state === "disabled_manually" &&
          ["running", "queued", "requested", "waiting", "pending"].every(
            (key) => Number.isInteger(live[key]) && live[key] === 0,
          )
        );
      }),
    "source_additional_writers_active_or_unverified",
  );
  add(
    observed.cloudflareAccountId === CLOUDFLARE_ACCOUNT_ID,
    "cloudflare_account_unverified",
  );

  // A retired GitHub source is not enough: Workers Builds used to deploy
  // this same Worker directly from main without the canonical Quality Gate.
  const builds = observed.workersBuilds;
  add(
    o.workersBuildsScriptTag === WORKERS_BUILDS_SCRIPT_TAG &&
      isRetiredWorkersBuilds(builds),
    "cloudflare_workers_builds_parallel_publisher_active_or_unverified",
  );

  const deployment = observed.deployment;
  const traffic = deployment?.versions;
  add(
    Array.isArray(traffic) &&
      traffic.length === 1 &&
      traffic[0]?.percentage === 100 &&
      traffic[0]?.version_id === o.currentVersionId,
    "cloudflare_active_version_unverified_or_changed",
  );

  // Reuse the Cloudflare settings GET already performed for binding checks.
  // A matching set of binding names alone does not prove runtime compatibility.
  const remote = observed.workerSettings;
  const flags = remote?.compatibility_flags;
  add(
    remote?.compatibility_date === WORKER_CONFIG.compatibility_date &&
      Array.isArray(flags) &&
      JSON.stringify([...flags].sort()) ===
        JSON.stringify([...(WORKER_CONFIG.compatibility_flags ?? [])].sort()) &&
      typeof remote?.observability?.enabled === "boolean" &&
      remote.observability.enabled === WORKER_CONFIG.observability?.enabled,
    "worker_runtime_settings_mismatch",
  );

  const bindings = observed.bindings;
  const findBinding = (name) =>
    Array.isArray(bindings) ? bindings.find((x) => x.name === name) : undefined;
  const expectedNames = [
    "CORS_ORIGINS",
    "DB",
    ...(WORKER_CONFIG.r2_buckets ?? []).map((binding) => binding.binding),
    ...(WORKER_CONFIG.secrets?.required ?? []),
  ].sort();
  const actualNames = Array.isArray(bindings)
    ? bindings.map((binding) => binding?.name).sort()
    : [];
  add(
    Array.isArray(bindings) &&
      JSON.stringify(actualNames) === JSON.stringify(expectedNames),
    "worker_binding_inventory_mismatch",
  );
  const db = findBinding("DB");
  const media = findBinding("MEDIA");
  const privateTelegram = findBinding("PRIVATE_TELEGRAM");
  const cors = findBinding("CORS_ORIGINS");
  const turnstile = findBinding("TURNSTILE_SECRET_KEY");
  add(
    db?.type === "d1" &&
      WORKER_D1?.database_id &&
      db.id === WORKER_D1.database_id,
    "existing_d1_binding_unverified",
  );
  add(
    media?.type === "r2_bucket" &&
      WORKER_MEDIA?.bucket_name &&
      media.bucket_name === WORKER_MEDIA.bucket_name,
    "existing_r2_binding_unverified",
  );
  add(
    turnstile?.type === "secret_text",
    "turnstile_secret_presence_unverified",
  );
  add(
    privateTelegram?.type === "r2_bucket" &&
      privateTelegram.bucket_name === WORKER_PRIVATE_TELEGRAM?.bucket_name,
    "private_telegram_r2_binding_unverified",
  );
  add(
    cors?.type === "plain_text" &&
      typeof WORKER_CONFIG.vars?.CORS_ORIGINS === "string" &&
      cors.text === WORKER_CONFIG.vars.CORS_ORIGINS,
    "cors_binding_unverified",
  );
  add(
    REQUIRED_ADMIN_SECRETS.every(
      (name) => findBinding(name)?.type === "secret_text",
    ),
    "administrative_secret_bindings_unverified",
  );
  // A Worker that selects telegram_showcase_visible returns HTTP 503 on the old
  // D1 schema. Verify the actual applied migration and all relevant triggers
  // before authorizing a new version, never rely only on a tracked SQL file.
  const visibility = observed.showcaseSchema;
  add(
    REQUIRED_SHOWCASE_MIGRATION ===
      "0025_telegram_showcase_private_visibility.sql" &&
      REQUIRED_SHOWCASE_TRIGGERS.length === 3 &&
      visibility?.column === REQUIRED_SHOWCASE_COLUMN &&
      visibility?.migration === REQUIRED_SHOWCASE_MIGRATION &&
      REQUIRED_SHOWCASE_TRIGGERS.every((name) =>
        visibility?.triggers?.includes(name),
      ),
    "telegram_showcase_migration_0025_unverified",
  );
  // The existing Worker now requires the complete canonical v13 migration
  // ledger, not just the earlier Telegram visibility/index migrations. An
  // observed 0025 and 0028 alone cannot authorize a Worker cutover.
  // One metadata-only query checks all required names; no DDL or model scan.
  const appliedMigrations = visibility?.appliedMigrations;
  add(
    REQUIRED_WORKER_MIGRATIONS.length >= 25 &&
      REQUIRED_WORKER_MIGRATIONS.at(-1) === SCHEMA_CONTRACT.latestMigration &&
      Array.isArray(appliedMigrations) &&
      new Set(appliedMigrations).size === REQUIRED_WORKER_MIGRATIONS.length &&
      REQUIRED_WORKER_MIGRATIONS.every((name) =>
        appliedMigrations.includes(name),
      ),
    "target_worker_required_migrations_unverified",
  );
  // The migration ledger does not prove the actual schema objects survived.
  // Check all contract tables, indexes, triggers and columns in one metadata scan.
  const actualObjects = visibility?.schemaObjects;
  const expectedObjects = REQUIRED_SCHEMA_OBJECTS;
  add(
    ["tables", "indexes", "triggers"].every((kind) =>
      sameNames(expectedObjects?.[kind], actualObjects?.[kind]),
    ) &&
      REQUIRED_SCHEMA_COLUMNS.length > 0 &&
      REQUIRED_SCHEMA_COLUMNS.every(
        ([table, names]) =>
          /^[a-z][a-z0-9_]*$/.test(table) &&
          sameNames(names, actualObjects?.columns?.[table]),
      ) &&
      actualObjects?.columns &&
      Object.keys(actualObjects.columns).length ===
        REQUIRED_SCHEMA_COLUMNS.length,
    "target_worker_required_schema_objects_unverified",
  );
  // M5 must not promote a new Worker while its public listing requires
  // a temporary sorting tree. The index is installed separately by the D1 owner.
  add(
    typeof REQUIRED_SHOWCASE_LISTING_INDEX === "string" &&
      typeof REQUIRED_SHOWCASE_INDEX_DEFINITION === "string" &&
      visibility?.indexes?.includes(REQUIRED_SHOWCASE_LISTING_INDEX) === true &&
      normalizeIndexDefinition(visibility?.indexDefinition) ===
        REQUIRED_SHOWCASE_INDEX_DEFINITION,
    "telegram_showcase_listing_index_0028_unverified",
  );

  return { ready: blockers.length === 0, blockers };
}

async function getJSON(url, headers = {}) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("readonly_api_http_" + response.status);
  return response.json();
}

// Treat a missing build configuration as retired ONLY for Cloudflare's
// specific 12040 not-found error; permission failures, generic 404, 200,
// or an unverified script identity all fail closed.
export function isRetiredWorkersBuilds(state, expectedTag = WORKERS_BUILDS_SCRIPT_TAG) {
  return /^[a-f0-9]{32}$/.test(expectedTag ?? "") &&
    state?.scriptTag === expectedTag &&
    state?.activeScriptTag === expectedTag &&
    state?.configAbsent === true &&
    state?.triggerCount === 0;
}

export async function inspectRetiredWorkersBuilds(account, token) {
  const tag = WORKERS_BUILDS_SCRIPT_TAG;
  if (typeof tag !== "string" || !/^[a-f0-9]{32}$/.test(tag))
    throw new Error("workers_builds_tag_missing");
  const base = "https://api.cloudflare.com/client/v4/accounts/" + encodeURIComponent(account);
  const headers = { Accept: "application/json", Authorization: "Bearer " + token };
  const getBuildConfig = async () => {
    const response = await fetch(base + "/builds/workers/" + tag, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10000),
    });
    const body = await response.json();
    if (response.status === 404 &&
      body?.success === false &&
      Array.isArray(body.errors) &&
      body.errors.some((e) => e.code === 12040)) return true;
    if (!response.ok) throw new Error("workers_builds_read_http_" + response.status);
    if (body?.success === true) return false;
    throw new Error("workers_builds_response_invalid");
  };
  const [scripts, triggers, configAbsent] = await Promise.all([
    getJSON(base + "/workers/scripts", headers),
    getJSON(base + "/builds/workers/" + tag + "/triggers", headers),
    getBuildConfig(),
  ]);
  if (scripts?.success !== true || !Array.isArray(scripts.result) ||
    triggers?.success !== true || !Array.isArray(triggers.result))
    throw new Error("workers_builds_inventory_unverified");
  const matching = scripts.result.filter((x) => x.id === WORKER_NAME);
  if (matching.length !== 1 || matching[0].tag !== tag)
    throw new Error("workers_builds_current_script_tag_mismatch");
  return {
    scriptTag: tag,
    activeScriptTag: matching[0].tag,
    configAbsent,
    triggerCount: triggers.result.length,
  };
}

async function getVerifiedShowcaseSchema(account, token) {
  // D1 HTTP transport uses POST for SELECT. This statement reads metadata only:
  // no scan of models, UPDATE, DDL, migration application or R2 operation.
  if (
    !WORKER_D1?.database_id ||
    !REQUIRED_SHOWCASE_MIGRATION ||
    !REQUIRED_SHOWCASE_LISTING_INDEX ||
    REQUIRED_SHOWCASE_TRIGGERS.length !== 3 ||
    REQUIRED_WORKER_MIGRATIONS.length < 25 ||
    REQUIRED_WORKER_MIGRATIONS.at(-1) !== SCHEMA_CONTRACT.latestMigration ||
    !["tables", "indexes", "triggers"].every((kind) =>
      identifierList(REQUIRED_SCHEMA_OBJECTS?.[kind]),
    ) ||
    REQUIRED_SCHEMA_COLUMNS.length === 0 ||
    !REQUIRED_SCHEMA_COLUMNS.every(
      ([table, names]) =>
        /^[a-z][a-z0-9_]*$/.test(table) && identifierList(names),
    )
  ) {
    throw new Error("required_showcase_schema_contract_missing");
  }
  const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
  // One bounded metadata-only query with three SELECT terms. The correlated
  // table-valued PRAGMA avoids SQLite's compound SELECT term limit and never
  // reads any row from models, galleries or R2.
  const columnTables = REQUIRED_SCHEMA_COLUMNS.map(([table]) => table);
  const columnNames = [
    ...new Set(REQUIRED_SCHEMA_COLUMNS.flatMap(([, names]) => names)),
  ];
  const objectNames = [
    ...new Set(
      ["tables", "indexes", "triggers"].flatMap(
        (kind) => REQUIRED_SCHEMA_OBJECTS[kind],
      ),
    ),
  ];
  const sql = [
    "SELECT 'column' AS category, columns.name AS name, NULL AS definition, tables.name AS parent FROM sqlite_master AS tables JOIN pragma_table_info(tables.name) AS columns WHERE tables.type='table' AND tables.name IN (" +
      columnTables.map(quote).join(",") +
      ") AND columns.name IN (" +
      columnNames.map(quote).join(",") +
      ")",
    "SELECT 'migration' AS category,name,NULL AS definition,NULL AS parent FROM d1_migrations WHERE name IN (" +
      REQUIRED_WORKER_MIGRATIONS.map(quote).join(",") +
      ")",
    "SELECT type AS category,name,sql AS definition,NULL AS parent FROM sqlite_master WHERE type IN ('table','index','trigger') AND name IN (" +
      objectNames.map(quote).join(",") +
      ")",
  ].join(" UNION ALL ");
  const url =
    "https://api.cloudflare.com/client/v4/accounts/" +
    encodeURIComponent(account) +
    "/d1/database/" +
    encodeURIComponent(WORKER_D1.database_id) +
    "/query";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "content-type": "application/json",
    },
    body: JSON.stringify({ sql }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error("read_only_d1_schema_http_" + response.status);
  const data = await response.json();
  if (data.success !== true || !Array.isArray(data.result)) {
    throw new Error("read_only_d1_schema_response_invalid");
  }
  const records = data.result.flatMap((x) => x.results ?? []);
  const has = (category, name) =>
    records.some((x) => x.category === category && x.name === name);
  return {
    column: records.some(
      (x) =>
        x.category === "column" &&
        x.parent === "models" &&
        x.name === REQUIRED_SHOWCASE_COLUMN,
    )
      ? REQUIRED_SHOWCASE_COLUMN
      : null,
    migration: has("migration", REQUIRED_SHOWCASE_MIGRATION)
      ? REQUIRED_SHOWCASE_MIGRATION
      : null,
    appliedMigrations: REQUIRED_WORKER_MIGRATIONS.filter((name) =>
      has("migration", name),
    ),
    schemaObjects: {
      tables: REQUIRED_SCHEMA_OBJECTS.tables.filter((name) =>
        has("table", name),
      ),
      indexes: REQUIRED_SCHEMA_OBJECTS.indexes.filter((name) =>
        has("index", name),
      ),
      triggers: REQUIRED_SCHEMA_OBJECTS.triggers.filter((name) =>
        has("trigger", name),
      ),
      columns: Object.fromEntries(
        REQUIRED_SCHEMA_COLUMNS.map(([table, names]) => [
          table,
          names.filter((name) =>
            records.some(
              (x) =>
                x.category === "column" &&
                x.parent === table &&
                x.name === name,
            ),
          ),
        ]),
      ),
    },
    triggers: REQUIRED_SHOWCASE_TRIGGERS.filter((name) => has("trigger", name)),
    indexes: has("index", REQUIRED_SHOWCASE_LISTING_INDEX)
      ? [REQUIRED_SHOWCASE_LISTING_INDEX]
      : [],
    indexDefinition:
      records.find(
        (x) =>
          x.category === "index" && x.name === REQUIRED_SHOWCASE_LISTING_INDEX,
      )?.definition ?? null,
  };
}

export async function inspectLiveReadOnly(env = process.env, options = {}) {
  // Ownership audits never query D1, even when the operator has a Cloudflare token.
  // A schema result absent from this mode cannot satisfy the release gate.
  const workflowName = SOURCE_WORKFLOW_PATH.split("/").at(-1);
  const sourceUrl = "https://api.github.com/repos/" + SOURCE_REPO;
  const prefix = sourceUrl + "/actions/workflows/" + workflowName;
  const ghHeaders = { "User-Agent": "tonecos-readonly-cutover-check" };
  // The target repository is private: read-only GitHub credentials are required
  // for the live release preflight. Never use a Cloudflare token for GitHub.
  const githubToken = env.GITHUB_TOKEN || env.GH_TOKEN;
  if (githubToken) ghHeaders.Authorization = "Bearer " + githubToken;
  // Active workflows already block M5. Query each queue state only after
  // administrative disablement; unknown counts must fail closed.
  const NON_TERMINAL = [
    "in_progress",
    "queued",
    "requested",
    "waiting",
    "pending",
  ];
  const unknownActivity = () => ({
    running: null,
    queued: null,
    requested: null,
    waiting: null,
    pending: null,
  });
  const readActivity = async (endpoint) => {
    const results = await Promise.all(
      NON_TERMINAL.map((status) =>
        getJSON(endpoint + "/runs?status=" + status + "&per_page=1", ghHeaders),
      ),
    );
    return Object.fromEntries(
      NON_TERMINAL.map((status, i) => [
        status === "in_progress" ? "running" : status,
        results[i]?.total_count ?? null,
      ]),
    );
  };

  const [sourceRepo, targetRepo, sourceMain, mediaPatch, mediaFile, workflow] =
    await Promise.all([
      getJSON(sourceUrl, ghHeaders),
      getJSON("https://api.github.com/repos/" + TARGET_REPO, ghHeaders),
      getJSON(sourceUrl + "/git/ref/heads/main", ghHeaders),
      getJSON(sourceUrl + "/pulls/" + SOURCE_FIX_PR, ghHeaders),
      getJSON(sourceUrl + "/contents/worker/media.ts?ref=main", ghHeaders),
      getJSON(prefix, ghHeaders),
    ]);
  const sourceActivity =
    workflow?.state === "disabled_manually"
      ? await readActivity(prefix)
      : unknownActivity();
  const state = {
    sourceRepositoryId: sourceRepo.id,
    sourceRepositoryName: sourceRepo.full_name,
    targetRepositoryId: targetRepo.id,
    targetRepositoryName: targetRepo.full_name,
    targetDefaultBranch: targetRepo.default_branch,
    sourceMainRef: sourceMain.ref,
    sourceMainSha: sourceMain.object?.sha,
    sourceFix: {
      number: mediaPatch.number,
      state: mediaPatch.state,
      draft: mediaPatch.draft,
      merged: mediaPatch.merged,
      headSha: mediaPatch.head?.sha,
      mergeCommitSha: mediaPatch.merge_commit_sha,
      baseSha: mediaPatch.base?.sha,
      headRepo: mediaPatch.head?.repo?.full_name,
    },
    sourceMediaBlobSha: mediaFile.sha,
    workflow,
    ...sourceActivity,
  };
  if (
    !Array.isArray(SOURCE_WRITERS) ||
    SOURCE_WRITERS.length !== 4 ||
    new Set(SOURCE_WRITERS.map((x) => x.path)).size !== 4
  ) {
    throw new Error("retiring_source_writer_inventory_unverified");
  }
  state.additionalWriters = await Promise.all(
    SOURCE_WRITERS.map(async (writer) => {
      const endpoint =
        sourceUrl +
        "/actions/workflows/" +
        encodeURIComponent(writer.path.split("/").at(-1));
      const metadata = await getJSON(endpoint, ghHeaders);
      const activity =
        metadata?.state === "disabled_manually"
          ? await readActivity(endpoint)
          : unknownActivity();
      return {
        id: metadata.id,
        path: metadata.path,
        state: metadata.state,
        ...activity,
      };
    }),
  );
  // No token: still report actual GitHub state, but never infer Cloudflare readiness.
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) return state;
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  if (account !== CLOUDFLARE_ACCOUNT_ID)
    throw new Error("cloudflare_account_mismatch");
  const host =
    "https://api.cloudflare.com/client/v4/accounts/" +
    encodeURIComponent(account) +
    "/workers/scripts/" +
    WORKER_NAME;
  const headers = { Authorization: "Bearer " + env.CLOUDFLARE_API_TOKEN };
  const [deploy, settings, showcaseSchema, workersBuilds] = await Promise.all([
    getJSON(host + "/deployments", headers),
    getJSON(host + "/settings", headers),
    options.verifyShowcaseSchema === false
      ? Promise.resolve(null)
      : getVerifiedShowcaseSchema(account, env.CLOUDFLARE_API_TOKEN),
    inspectRetiredWorkersBuilds(account, env.CLOUDFLARE_API_TOKEN),
  ]);
  if (deploy.success !== true || settings.success !== true) {
    throw new Error("cloudflare_metadata_not_verified");
  }
  state.cloudflareAccountId = account;
  state.deployment = (deploy.result?.deployments ?? [])[0];
  state.workerSettings = settings.result;
  state.bindings = settings.result?.bindings;
  state.workersBuilds = workersBuilds;
  if (showcaseSchema !== null) state.showcaseSchema = showcaseSchema;
  return state;
}

async function main() {
  if (
    process.argv.length !== 3 ||
    !["--live", "--ownership-only"].includes(process.argv[2])
  ) {
    console.error(
      "Read-only gate: use --ownership-only (no D1) or --live (full schema). No deployment option exists.",
    );
    process.exitCode = 2;
    return;
  }
  const contract = CANONICAL;
  const ownershipOnly = process.argv[2] === "--ownership-only";
  try {
    const state = await inspectLiveReadOnly(process.env, {
      verifyShowcaseSchema: !ownershipOnly,
    });
    const verdict = assessCutoverReadiness(contract, state);
    const blockers = ownershipOnly
      ? [
          ...new Set([
            ...verdict.blockers,
            "d1_schema_not_checked_in_ownership_only_mode",
          ]),
        ]
      : verdict.blockers;
    console.log(
      JSON.stringify(
        {
          status:
            verdict.ready && !ownershipOnly
              ? "READY_FOR_SEPARATELY_AUTHORIZED_CUTOVER"
              : "BLOCKED",
          mode: ownershipOnly ? "ownership-only" : "full-live",
          d1SchemaCheck: ownershipOnly ? "skipped_by_design" : "required",
          sourceWorkflow: state.workflow?.state ?? "unverified",
          sourceMainSha: state.sourceMainSha ?? null,
          targetRepositoryId: state.targetRepositoryId ?? null,
          sourceMediaPatchSha: state.sourceFix?.headSha ?? null,
          sourceMediaBlobSha: state.sourceMediaBlobSha ?? null,
          sourceInProgress: state.running ?? null,
          sourceQueued: state.queued ?? null,
          sourceRequested: state.requested ?? null,
          sourceWaiting: state.waiting ?? null,
          sourcePending: state.pending ?? null,
          sourceAdditionalWriters:
            state.additionalWriters?.map((x) => ({
              path: x.path,
              state: x.state,
            })) ?? null,
          liveWorkerVersionId:
            state.deployment?.versions?.[0]?.version_id ?? null,
          workerBuildsRetired: state.workersBuilds?.configAbsent === true &&
            state.workersBuilds?.triggerCount === 0 &&
            state.workersBuilds?.activeScriptTag === WORKERS_BUILDS_SCRIPT_TAG,
          verifiedShowcaseMigration: state.showcaseSchema?.migration ?? null,
          blockers,
        },
        null,
        2,
      ),
    );
    if (!verdict.ready || ownershipOnly) process.exitCode = 2;
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          status: "BLOCKED",
          blockers: [
            "live_preflight_unavailable_" + (error?.message ?? "unknown"),
          ],
        },
        null,
        2,
      ),
    );
    process.exitCode = 2;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  await main();
}
