/**
 * Authorized TONART M5 D1 migration owner, used by the EXISTING Quality Gate.
 * Prepare/verify only: Wrangler itself applies migrations from a six-file
 * temporary view of the canonical main. Never create a second D1 or Worker.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inspectRetiredWorkersBuilds, isRetiredWorkersBuilds } from "./cutover-readiness.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MIGRATIONS = [
  "0028_telegram_showcase_listing_index.sql",
  "0029_canonical_characters_across_sources.sql",
  "0030_canonical_character_attributes.sql",
  "0031_seed_reviewed_canonical_model_tags.sql",
  "0032_seed_marvel_individual_catalog_tags.sql",
  "0033_seed_reviewed_dc_character_tags.sql",
];
const SOURCE_IDS = [371358484, 384544141, 385740730, 385342502, 385318875];
const NONTERMINAL = ["running", "queued", "requested", "waiting", "pending"];
const APPROVAL = "GO-M5-0028-0033-20261125";
const BASELINE = "0027_telegram_pending_franchise_taxonomy.sql";
const asJSON = (file) => JSON.parse(readFileSync(file, "utf8"));
function ensure(condition, message) {
  if (!condition) throw new Error("m5_d1_blocked:" + message);
}
export function requireExactAuth(env) {
  // Manual workflow dispatch or a separately verified one-use release receipt.
  // An ordinary push, even with a matching commit message, can never authorize D1.
  const manuallyApproved = env.GITHUB_EVENT_NAME === "workflow_dispatch";
  const receiptApproved = env.GITHUB_EVENT_NAME === "push" && env.M5_VERIFIED_RECEIPT === "true";
  ensure(env.GITHUB_ACTIONS === "true" && (manuallyApproved || receiptApproved), "verified_m5_release_event_required");
  ensure(env.GITHUB_REF === "refs/heads/main", "main_only");
  ensure(env.M5_OPERATION === "m5-schema" && env.M5_ACK === APPROVAL, "explicit_m5_ack_missing");
  ensure(env.GITHUB_REPOSITORY === "tonecosstudio/tonecosstudio", "repository_mismatch");
  ensure(typeof env.CLOUDFLARE_API_TOKEN === "string" && env.CLOUDFLARE_API_TOKEN.length > 10, "cloudflare_credential_missing");
  ensure(typeof env.GITHUB_TOKEN === "string" && env.GITHUB_TOKEN.length > 10, "github_token_missing");
}
export function planMigrationFiles({ applied, canonical = MIGRATIONS, additionalFiles = [] }) {
  ensure(Array.isArray(applied) && applied.every((s) => typeof s === "string"), "migration_ledger_invalid");
  ensure(new Set(applied).size === applied.length, "duplicate_migration_in_ledger");
  ensure(applied.includes(BASELINE), "baseline_0027_missing");
  ensure(canonical.length === 6 && canonical.every((x, i) => x === MIGRATIONS[i]), "scope_not_0028_to_0033");
  const future = applied.filter((n) => /^\d{4}_/.test(n) && Number(n.slice(0, 4)) > 33);
  ensure(future.length === 0, "future_migrations_already_applied");
  const numbers = canonical.map((n) => n.slice(0, 4));
  ensure(numbers.join(",") === "0028,0029,0030,0031,0032,0033", "migration_order_invalid");
  const prefixLength = canonical.findIndex((n) => !applied.includes(n));
  const done = prefixLength === -1 ? canonical.length : prefixLength;
  ensure(canonical.slice(done).every((name) => !applied.includes(name)), "noncontiguous_migration_ledger");
  ensure(additionalFiles.every((n) => !canonical.includes(n)), "duplicate_unexpected_migration_files");
  return { applied: canonical.slice(0, done), pending: canonical.slice(done), all: canonical };
}
function loadContract() {
  const manifest = asJSON(join(ROOT, "config/catalog-code-consolidation.json"));
  const wrangler = asJSON(join(ROOT, "services/catalogo/wrangler.jsonc"));
  const schema = asJSON(join(ROOT, "services/catalogo/config/catalog-schema-contract.json"));
  const db = wrangler.d1_databases?.find((x) => x.binding === "DB");
  ensure(manifest.target.repository === "tonecosstudio/tonecosstudio", "target_not_canonical");
  ensure(manifest.origin.repository === "washingtonmsdj/catalogo", "source_not_canonical");
  ensure(manifest.runtime.cloudflareAccountId === "8827c547d6def5ee5b9ca550fdd5680a", "account_not_canonical");
  ensure(wrangler.name === manifest.runtime.worker && db?.database_name === manifest.runtime.d1, "wrangler_binding_mismatch");
  ensure(db?.database_id === "87006366-60f3-4937-af73-2ef5a5f901fb", "d1_database_id_mismatch");
  ensure(schema.latestMigration === MIGRATIONS.at(-1), "schema_contract_scope_changed");
  ensure(schema.requiredMigrations.includes(MIGRATIONS.at(-1)), "schema_contract_missing_m5");
  const files = readdirSync(join(ROOT, "services/catalogo/migrations"));
  for (const name of MIGRATIONS) {
    ensure(files.includes(name), "approved_file_missing_" + name);
    ensure(existsSync(join(ROOT, "services/catalogo/migrations", name)), "approved_path_missing_" + name);
  }
  ensure(files.some((n) => n.startsWith("0034_")), "later_migrations_not_detected_fail_closed");
  // The reserved slot is intentionally SQL-free and cannot be silently replaced with new content.
  const reserved = readFileSync(join(ROOT, "services/catalogo/migrations", MIGRATIONS[4]), "utf8");
  ensure(!reserved.split("\n").some((line) => /^(?!\s*--)\s*(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE|PRAGMA)\b/i.test(line)), "reserved_0032_changed");
  return { manifest, wrangler, db, schema };
}
async function requestJSON(url, headers) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(18000) });
  ensure(response.ok, "http_" + response.status + "_" + new URL(url).pathname);
  return response.json();
}
async function verifyRetiredSource(token, manifest) {
  const repo = manifest.origin.repository;
  const headers = { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "User-Agent": "tonart-m5-d1-bounded" };
  const ids = [manifest.origin.apiDeployWorkflowId, ...manifest.origin.additionalWriterWorkflows.map((w) => w.id)];
  ensure(ids.length === 5 && ids.every((n) => SOURCE_IDS.includes(n)) && new Set(ids).size === 5, "source_writer_id_mismatch");
  const ref = await requestJSON("https://api.github.com/repos/" + repo + "/git/ref/heads/main", headers);
  ensure(ref.object?.sha === manifest.origin.observedMainSha, "source_main_drift");
  for (const id of ids) {
    const w = await requestJSON("https://api.github.com/repos/" + repo + "/actions/workflows/" + id, headers);
    ensure(w.id === id && w.state === "disabled_manually", "source_writer_active_" + id);
  }
  for (const status of NONTERMINAL) {
    // One request per status, not five per workflow. Saturated pages fail closed.
    const page = await requestJSON("https://api.github.com/repos/" + repo + "/actions/runs?status=" + status + "&per_page=100", headers);
    ensure(Array.isArray(page.workflow_runs) && page.workflow_runs.length < 100, "workflow_queue_unbounded_" + status);
    ensure(page.workflow_runs.every((run) => !ids.includes(run.workflow_id)), "source_writer_not_quiescent_" + status);
  }
}
async function d1Fetch(token, account, dbid, sql) {
  const response = await fetch("https://api.cloudflare.com/client/v4/accounts/" + account + "/d1/database/" + dbid + "/query", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
    signal: AbortSignal.timeout(18000),
  });
  ensure(response.ok, "d1_query_http_" + response.status);
  const data = await response.json();
  ensure(data.success === true && Array.isArray(data.result), "d1_query_not_successful");
  const errors = data.result.flatMap((r) => r.error ? [r.error] : []);
  ensure(errors.length === 0, "d1_query_result_error");
  return data.result.flatMap((r) => r.results ?? []);
}
async function remoteState(token, manifest, db, schema, { schemaObjects = false } = {}) {
  const account = manifest.runtime.cloudflareAccountId;
  const applied = (await d1Fetch(token, account, db.database_id, "SELECT name FROM d1_migrations ORDER BY id")).map((r) => r.name);
  const counts = (await d1Fetch(token, account, db.database_id, "SELECT (SELECT COUNT(*) FROM models) AS models, (SELECT COUNT(*) FROM catalog_folders) AS folders, (SELECT COUNT(*) FROM categories) AS categories"))[0];
  ensure(Number.isInteger(counts?.models) && counts.models > 0 && Number.isInteger(counts?.folders) && counts.folders > 0 && Number.isInteger(counts?.categories) && counts.categories > 0, "baseline_counts_missing");
  const state = { applied, counts };
  if (schemaObjects) {
    const required = schema.requiredObjects;
    const tables = [...new Set(Object.keys(required.columns ?? {}))];
    const colNames = [...new Set(Object.values(required.columns ?? {}).flat())];
    const objects = [...new Set(["tables", "indexes", "triggers"].flatMap((k) => required[k] ?? []))];
    const quote = (s) => "'" + s.replaceAll("'", "''") + "'";
    const sql = [
      "SELECT 'column' AS category, columns.name AS name, tables.name AS parent FROM sqlite_master AS tables JOIN pragma_table_info(tables.name) AS columns WHERE tables.type='table' AND tables.name IN (" + tables.map(quote).join(",") + ") AND columns.name IN (" + colNames.map(quote).join(",") + ")",
      "SELECT type AS category,name,NULL AS parent FROM sqlite_master WHERE type IN ('table','index','trigger') AND name IN (" + objects.map(quote).join(",") + ")",
    ].join(" UNION ALL ");
    const rows = await d1Fetch(token, account, db.database_id, sql);
    for (const [kind, category] of [["tables", "table"], ["indexes", "index"], ["triggers", "trigger"]]) {
      ensure(required[kind].every((name) => rows.some((r) => r.category === category && r.name === name)), "required_" + kind + "_incomplete");
    }
    for (const [table, names] of Object.entries(required.columns ?? {})) {
      ensure(names.every((name) => rows.some((r) => r.category === "column" && r.parent === table && r.name === name)), "required_columns_missing_" + table);
    }
  }
  return state;
}
export function approvedSeedReferences() {
  // Two reviewed data seeds; never infer identities from model titles.
  const sql = [MIGRATIONS[3], MIGRATIONS[5]]
    .map((file) => readFileSync(join(ROOT, "services/catalogo/migrations", file), "utf8"))
    .join("\n");
  const modelIds = [...new Set([...sql.matchAll(/'(?:tg|mdl)_[a-zA-Z0-9_-]+'/g)].map((x) => x[0].slice(1, -1)))];
  const franchiseSlugs = [...new Set([...sql.matchAll(/slug\s*=\s*'([a-z0-9-]+)'/g)].map((x) => x[1]))];
  ensure(modelIds.length === 163 && franchiseSlugs.length === 20, "reviewed_seed_reference_scope_changed");
  return { modelIds, franchiseSlugs };
}
async function verifySeedReferences(token, manifest, db) {
  const { modelIds, franchiseSlugs } = approvedSeedReferences();
  const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
  const account = manifest.runtime.cloudflareAccountId;
  const foundModels = await d1Fetch(token, account, db.database_id, "SELECT id FROM models WHERE id IN (" + modelIds.map(quote).join(",") + ")");
  const foundFranchises = await d1Fetch(token, account, db.database_id, "SELECT slug FROM franchises WHERE slug IN (" + franchiseSlugs.map(quote).join(",") + ")");
  ensure(new Set(foundModels.map((x) => x.id)).size === modelIds.length && modelIds.every((id) => foundModels.some((x) => x.id === id)), "reviewed_seed_models_missing");
  ensure(new Set(foundFranchises.map((x) => x.slug)).size === franchiseSlugs.length && franchiseSlugs.every((slug) => foundFranchises.some((x) => x.slug === slug)), "reviewed_seed_franchises_missing");
}

async function getBookmark(token, account, dbid) {
  const data = await requestJSON(
    "https://api.cloudflare.com/client/v4/accounts/" + account + "/d1/database/" + dbid + "/time_travel/bookmark",
    { Authorization: "Bearer " + token },
  );
  ensure(data.success === true && typeof data.result?.bookmark === "string" && data.result.bookmark.length > 10, "time_travel_bookmark_unavailable");
  return data.result.bookmark;
}
export function stageOnly(temporaryPath, pending, db, wrangler) {
  ensure(typeof temporaryPath === "string" && temporaryPath.length >= 10, "staging_path_missing");
  const folder = resolve(temporaryPath);
  ensure(!existsSync(folder), "staging_path_exists");
  mkdirSync(join(folder, "migrations"), { recursive: true });
  for (const name of pending) copyFileSync(join(ROOT, "services/catalogo/migrations", name), join(folder, "migrations", name));
  ensure(readdirSync(join(folder, "migrations")).sort().join(",") === [...pending].sort().join(","), "staged_files_mismatch");
  const scoped = {
    name: wrangler.name,
    compatibility_date: wrangler.compatibility_date,
    d1_databases: [{ binding: "DB", database_name: db.database_name, database_id: db.database_id, migrations_dir: "migrations" }],
  };
  const file = join(folder, "wrangler-d1.jsonc");
  writeFileSync(file, JSON.stringify(scoped, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return file;
}
export async function perform(mode, env, stagePath) {
  ensure(["prepare", "verify"].includes(mode), "unsupported_mode");
  requireExactAuth(env);
  const { manifest, wrangler, db, schema } = loadContract();
  const ledger = await remoteState(env.CLOUDFLARE_API_TOKEN, manifest, db, schema, { schemaObjects: mode === "verify" });
  const plan = planMigrationFiles({ applied: ledger.applied });
  const requiredPrior = schema.requiredMigrations.filter((name) => /^\d{4}_/.test(name) && Number(name.slice(0, 4)) <= 27);
  ensure(requiredPrior.length >= 27 && requiredPrior.every((name) => ledger.applied.includes(name)), "earlier_required_migrations_missing");
  // Both initial DDL and final verification must share the same single-writer
  // gate as Worker promotion. A surviving Workers Builds trigger can deploy
  // incompatible runtime code while an authorized D1 migration is in progress.
  await verifyRetiredSource(env.GITHUB_TOKEN, manifest);
  const builds = await inspectRetiredWorkersBuilds(manifest.runtime.cloudflareAccountId, env.CLOUDFLARE_API_TOKEN);
  ensure(isRetiredWorkersBuilds(builds, manifest.productionObservation.workersBuildsScriptTag),
    "cloudflare_workers_builds_parallel_publisher_active_or_unverified");
  if (mode === "prepare") {
    await verifySeedReferences(env.CLOUDFLARE_API_TOKEN, manifest, db);
    ensure(plan.pending.length > 0, "already_applied_noop_requires_verify");
    const bookmark = await getBookmark(env.CLOUDFLARE_API_TOKEN, manifest.runtime.cloudflareAccountId, db.database_id);
    const config = stageOnly(stagePath, plan.pending, db, wrangler);
    const baseline = { counts: ledger.counts, beforeBookmark: bookmark, pending: plan.pending, previous: plan.applied, sha: env.GITHUB_SHA };
    writeFileSync(join(resolve(stagePath), "preflight.json"), JSON.stringify(baseline) + "\n", { flag: "wx", mode: 0o600 });
    return { status: "PREPARED_ONLY", pending: plan.pending, previous: plan.applied, config, models: ledger.counts.models, bookmarkCaptured: true };
  }
  const baseline = asJSON(join(resolve(stagePath), "preflight.json"));
  ensure(baseline.sha === env.GITHUB_SHA, "head_changed_during_migration");
  ensure(baseline.beforeBookmark?.length > 10, "backup_bookmark_not_recorded");
  ensure(plan.pending.length === 0, "unapplied_migration_after_release");
  ensure(["models", "folders", "categories"].every((name) => baseline.counts[name] === ledger.counts[name]), "historical_catalog_counts_changed");
  return { status: "VERIFIED", applied: plan.all, counts: ledger.counts, bookmarkCaptured: true };
}
const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (entry === import.meta.url) {
  const [mode, out] = process.argv.slice(2);
  perform(mode, process.env, out).then((result) => {
    console.log(JSON.stringify(result));
  }).catch((error) => {
    console.error(String(error?.message ?? error));
    process.exitCode = 2;
  });
}
