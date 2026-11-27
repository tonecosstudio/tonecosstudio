import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  assessCutoverReadiness,
  assessWorkerZeroTrafficStageReadiness,
  assessRoutineWorkerUpdateReadiness,
  inspectLiveReadOnly,
} from "./cutover-readiness.mjs";

const original = JSON.parse(
  readFileSync(
    new URL("../../config/catalog-code-consolidation.json", import.meta.url),
    "utf8",
  ),
);
const schema = JSON.parse(
  readFileSync(
    new URL(
      "../../services/catalogo/config/catalog-schema-contract.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const workerConfig = JSON.parse(
  readFileSync(
    new URL("../../services/catalogo/wrangler.jsonc", import.meta.url),
    "utf8",
  ),
);
const workerSettings = {
  compatibility_date: workerConfig.compatibility_date,
  compatibility_flags: [...workerConfig.compatibility_flags],
  observability: { enabled: workerConfig.observability.enabled },
};

const showcaseTriggers = schema.requiredObjects.triggers.filter((name) =>
  name.startsWith("trg_telegram_showcase_"),
);
const showcaseMigration = schema.requiredMigrations.find((name) =>
  name.startsWith("0025_telegram_showcase_"),
);
assert.equal(
  showcaseMigration,
  "0025_telegram_showcase_private_visibility.sql",
);
const showcaseIndex = "idx_models_telegram_showcase_name";
const indexSql = readFileSync(
  new URL(
    "../../services/catalogo/migrations/0028_telegram_showcase_listing_index.sql",
    import.meta.url,
  ),
  "utf8",
);
const indexDefinition = indexSql
  .match(/\bCREATE INDEX IF NOT EXISTS[\s\S]*?;/i)?.[0]
  .replace(/\bIF NOT EXISTS\s+/i, "")
  .replace(/;\s*$/, "")
  .replace(/\s+/g, " ")
  .trim();
const retiringWriters = original.origin.additionalWriterWorkflows;
const writerFromApiUrl = (url) =>
  retiringWriters.find((w) =>
    String(url).endsWith("/actions/workflows/" + w.path.split("/").at(-1)),
  );

const workflow = {
  id: 371358484,
  path: ".github/workflows/cloudflare.yml",
  state: "disabled_manually",
};
const deployment = {
  versions: [
    {
      version_id: original.productionObservation.currentVersionId,
      percentage: 100,
    },
  ],
};
const bindings = [
  { name: "DB", type: "d1", id: "87006366-60f3-4937-af73-2ef5a5f901fb" },
  { name: "MEDIA", type: "r2_bucket", bucket_name: "tonecos-catalogo-media" },
  {
    name: "PRIVATE_TELEGRAM",
    type: "r2_bucket",
    bucket_name: "tonecos-catalogo-staging",
  },
  ...Object.entries(workerConfig.vars).map(([name, text]) => ({
    name, type: "plain_text", text,
  })),
  { name: "ADMIN_SUPABASE_URL", type: "secret_text" },
  { name: "ADMIN_SUPABASE_ANON_KEY", type: "secret_text" },
  { name: "TURNSTILE_SECRET_KEY", type: "secret_text" },
];

function approvedContract() {
  const v = structuredClone(original);
  v.migration.phase = "cutover-approved";
  v.migration.releaseAuthorized = true;
  v.migration.sourceWriterDisabled = true;
  v.migration.targetWorkerReleaseEnabled = true;
  v.migration.targetD1MigrationEnabled = false;
  v.activeWorkerPublisher = v.target.repository;
  v.productionObservation.releaseGoApproved = true;
  v.productionObservation.sourceWorkflowDisabledVerified = true;
  v.productionObservation.targetProductionCredentialsVerified = true;
  v.productionObservation.rollbackTestedAgainstProduction = true;
  return v;
}
const fullState = () => ({
  workflow: { ...workflow },
  running: 0,
  queued: 0,
  requested: 0,
  waiting: 0,
  pending: 0,
  additionalWriters: retiringWriters.map((w) => ({
    id: w.id,
    path: w.path,
    state: "disabled_manually",
    running: 0,
    queued: 0,
    requested: 0,
    waiting: 0,
    pending: 0,
  })),
  sourceRepositoryId: original.origin.repositoryId,
  sourceRepositoryName: original.origin.repository,
  targetRepositoryId: original.target.repositoryId,
  targetRepositoryName: original.target.repository,
  targetDefaultBranch: "main",
  sourceMainRef: "refs/heads/main",
  sourceMainSha: original.origin.observedMainSha,
  sourceFix: {
    number: original.staging.sourceFixPullRequest,
    state: "closed",
    draft: false,
    merged: true,
    headSha: original.staging.sourceFixMergedHead,
    mergeCommitSha: original.staging.sourceFixMergeCommit,
    baseSha: original.staging.sourceFixBaseShaAtMerge,
    headRepo: original.origin.repository,
  },
  sourceMediaBlobSha: original.staging.fileBlobs["worker/media.ts"],
  cloudflareAccountId: original.runtime.cloudflareAccountId,
  deployment: structuredClone(deployment),
  bindings: structuredClone(bindings),
  workerSettings: structuredClone(workerSettings),
  workersBuilds: {
    scriptTag: original.productionObservation.workersBuildsScriptTag,
    activeScriptTag: original.productionObservation.workersBuildsScriptTag,
    configAbsent: true,
    triggerCount: 0,
  },
  showcaseSchema: {
    column: "telegram_showcase_visible",
    migration: showcaseMigration,
    appliedMigrations: [...schema.requiredMigrations],
    triggers: [...showcaseTriggers],
    indexes: [showcaseIndex],
    indexDefinition,
    schemaObjects: structuredClone(schema.requiredObjects),
  },
});

test("completed M5 cannot replay a one-use Worker release authorization", () => {
  const result = assessCutoverReadiness(original, fullState());
  assert.equal(original.migration.phase, "cutover-complete");
  assert.equal(original.productionObservation.runtimeCutoverPerformed, true);
  assert.equal(original.productionObservation.targetProductionCredentialsVerified, true);
  assert.equal(original.productionObservation.rollbackTestedAgainstProduction, true);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("cutover_not_approved"));
  assert.ok(!result.blockers.includes("target_credentials_unverified"));
  assert.ok(!result.blockers.includes("rollback_not_verified"));
  assert.ok(!result.blockers.includes("explicit_release_go_missing"));
});

test("routine update requires completed M5 and a freshly observed single-version baseline", () => {
  const contract = structuredClone(original);
  const state = fullState();
  contract.productionObservation.releaseGoApproved = false;
  state.deployment.versions[0].version_id = "dddddddd-1111-2222-3333-aaaaaaaaaaaa";
  assert.equal(assessRoutineWorkerUpdateReadiness(contract, state).ready, true);
  assert.equal(assessWorkerZeroTrafficStageReadiness(contract, state).ready, false);
  assert.equal(assessRoutineWorkerUpdateReadiness(approvedContract(), state).ready, false);
  for (const corrupt of [
    s => { s.workflow.state = "active"; },
    s => { s.workersBuilds.triggerCount = 1; },
    s => { s.deployment.versions[0].percentage = 90; },
    s => { s.showcaseSchema.appliedMigrations.pop(); },
  ]) {
    const invalid = structuredClone(state);
    corrupt(invalid);
    assert.equal(assessRoutineWorkerUpdateReadiness(contract, invalid).ready, false);
  }
});

test("routine update requires exact declared import Access binding values and types", () => {
  for (const name of ["TELEGRAM_IMPORT_ACCESS_AUD", "TELEGRAM_IMPORT_ACCESS_CLIENT_ID"]) {
    assert.equal(typeof workerConfig.vars[name], "string");
    for (const mutate of [
      state => { state.bindings = state.bindings.filter(b => b.name !== name); },
      state => { state.bindings.find(b => b.name === name).text = "wrong"; },
      state => { state.bindings.find(b => b.name === name).type = "secret_text"; },
    ]) {
      const state = fullState();
      mutate(state);
      const verdict = assessRoutineWorkerUpdateReadiness(original, state);
      assert.equal(verdict.ready, false);
      assert.ok(verdict.blockers.includes("worker_plain_text_bindings_mismatch"));
    }
  }
  assert.equal(assessRoutineWorkerUpdateReadiness(original, fullState()).ready, true);
});

test("zero-percent staging defers only pending proof in the historical approved phase", () => {
  const beforePhysicalProof = approvedContract();
  beforePhysicalProof.productionObservation.targetProductionCredentialsVerified = false;
  beforePhysicalProof.productionObservation.rollbackTestedAgainstProduction = false;
  beforePhysicalProof.productionObservation.runtimeCutoverPerformed = false;
  const full = assessCutoverReadiness(beforePhysicalProof, fullState());
  assert.deepEqual([...full.blockers].sort(), [
    "target_credentials_unverified",
    "rollback_not_verified",
  ].sort());
  const preflight = assessWorkerZeroTrafficStageReadiness(beforePhysicalProof, fullState());
  assert.equal(preflight.ready, true, JSON.stringify(preflight.blockers));
  assert.equal(preflight.stageOnly, true);
  assert.deepEqual([...preflight.deferredProof].sort(), [...full.blockers].sort());

  const corruptions = [
    (s) => { s.workflow.state = "active"; },
    (s) => { s.workersBuilds.triggerCount = 1; },
    (s) => { s.showcaseSchema.appliedMigrations.pop(); },
    (s) => { s.deployment.versions[0].version_id = "f".repeat(36); },
    (s) => { delete s.showcaseSchema; },
    (s) => { delete s.bindings; },
    (s) => { delete s.cloudflareAccountId; },
  ];
  for (const corrupt of corruptions) {
    const state = fullState();
    corrupt(state);
    const denied = assessWorkerZeroTrafficStageReadiness(beforePhysicalProof, state);
    assert.equal(denied.ready, false, JSON.stringify(denied));
  }
  const deniedOwner = structuredClone(beforePhysicalProof);
  deniedOwner.migration.releaseAuthorized = false;
  assert.equal(
    assessWorkerZeroTrafficStageReadiness(deniedOwner, fullState()).ready,
    false,
  );
});

test("an approved flag cannot override an active source workflow", () => {
  const state = fullState();
  state.workflow.state = "active";
  const result = assessCutoverReadiness(approvedContract(), state);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("source_github_workflow_still_enabled"));
});

test("all retiring D1/R2 writers must be disabled administratively with empty queues", () => {
  assert.equal(retiringWriters.length, 4);
  for (const w of retiringWriters) {
    const active = fullState();
    active.additionalWriters.find((x) => x.id === w.id).state = "active";
    const result = assessCutoverReadiness(approvedContract(), active);
    assert.equal(result.ready, false);
    assert.ok(
      result.blockers.includes(
        "source_additional_writers_active_or_unverified",
      ),
    );
    for (const status of [
      "running",
      "queued",
      "requested",
      "waiting",
      "pending",
    ]) {
      const busy = fullState();
      busy.additionalWriters.find((x) => x.id === w.id)[status] = 1;
      const blocked = assessCutoverReadiness(approvedContract(), busy);
      assert.ok(
        blocked.blockers.includes(
          "source_additional_writers_active_or_unverified",
        ),
      );
    }
  }
  const missing = fullState();
  missing.additionalWriters.pop();
  assert.ok(
    assessCutoverReadiness(approvedContract(), missing).blockers.includes(
      "source_additional_writers_active_or_unverified",
    ),
  );
  const invalidContract = approvedContract();
  invalidContract.origin.additionalWriterWorkflows.pop();
  assert.ok(
    assessCutoverReadiness(invalidContract, fullState()).blockers.includes(
      "source_additional_writers_active_or_unverified",
    ),
  );
});

test("Workers Builds source must be retired before any canonical Worker release", () => {
  const good = assessCutoverReadiness(approvedContract(), fullState());
  assert.equal(good.ready, true, JSON.stringify(good.blockers));
  const mutations = [
    (s) => { s.workersBuilds.configAbsent = false; },
    (s) => { s.workersBuilds.triggerCount = 1; },
    (s) => { s.workersBuilds.activeScriptTag = "f".repeat(32); },
    (s) => { delete s.workersBuilds; },
  ];
  for (const mutate of mutations) {
    const state = fullState();
    mutate(state);
    const verdict = assessCutoverReadiness(approvedContract(), state);
    assert.equal(verdict.ready, false);
    assert.ok(
      verdict.blockers.includes("cloudflare_workers_builds_parallel_publisher_active_or_unverified"),
      JSON.stringify(verdict.blockers),
    );
  }
  const forged = approvedContract();
  forged.productionObservation.workersBuildsScriptTag = "a".repeat(32);
  assert.ok(
    assessCutoverReadiness(forged, fullState()).blockers.includes(
      "cloudflare_workers_builds_parallel_publisher_active_or_unverified",
    ),
  );
});

test("the live Telegram showcase schema must precede any Worker promotion", () => {
  const fixture = fullState();
  for (const mutation of [
    (state) => {
      delete state.showcaseSchema;
    },
    (state) => {
      state.showcaseSchema.column = null;
    },
    (state) => {
      state.showcaseSchema.migration = null;
    },
    (state) => {
      state.showcaseSchema.triggers.pop();
    },
  ]) {
    const altered = structuredClone(fixture);
    mutation(altered);
    const verdict = assessCutoverReadiness(approvedContract(), altered);
    assert.equal(verdict.ready, false);
    assert.ok(
      verdict.blockers.includes("telegram_showcase_migration_0025_unverified"),
    );
  }
});

test("M5 requires D1 index 0028 and every canonical Worker migration", () => {
  const fixture = fullState();
  const withoutIndex = structuredClone(fixture);
  delete withoutIndex.showcaseSchema.indexes;
  const missing = assessCutoverReadiness(approvedContract(), withoutIndex);
  assert.equal(missing.ready, false);
  assert.ok(
    missing.blockers.includes(
      "telegram_showcase_listing_index_0028_unverified",
    ),
  );
  const noMatches = structuredClone(fixture);
  noMatches.showcaseSchema.indexes = [];
  const blocked = assessCutoverReadiness(approvedContract(), noMatches);
  assert.equal(blocked.ready, false);
  assert.ok(
    blocked.blockers.includes(
      "telegram_showcase_listing_index_0028_unverified",
    ),
  );
  const wrongDefinition = structuredClone(fixture);
  wrongDefinition.showcaseSchema.indexDefinition =
    wrongDefinition.showcaseSchema.indexDefinition.replace(
      "name COLLATE NOCASE",
      "name COLLATE BINARY",
    );
  assert.ok(
    assessCutoverReadiness(
      approvedContract(),
      wrongDefinition,
    ).blockers.includes("telegram_showcase_listing_index_0028_unverified"),
  );
  const wrongPredicate = structuredClone(fixture);
  wrongPredicate.showcaseSchema.indexDefinition =
    wrongPredicate.showcaseSchema.indexDefinition.replace(
      "telegram_rights_status <> 'rejected'",
      "telegram_rights_status = 'rejected'",
    );
  assert.ok(
    assessCutoverReadiness(
      approvedContract(),
      wrongPredicate,
    ).blockers.includes("telegram_showcase_listing_index_0028_unverified"),
  );
  assert.deepEqual(assessCutoverReadiness(approvedContract(), fixture), {
    ready: true,
    blockers: [],
  });
});

test("later canonical taxonomy migrations are mandatory even when Telegram 0025 and index 0028 exist", () => {
  const state = fullState();
  state.showcaseSchema.appliedMigrations.pop();
  const verdict = assessCutoverReadiness(approvedContract(), state);
  assert.equal(verdict.ready, false);
  assert.ok(
    verdict.blockers.includes("target_worker_required_migrations_unverified"),
  );
  assert.ok(
    !verdict.blockers.includes("telegram_showcase_migration_0025_unverified"),
  );
  state.showcaseSchema.appliedMigrations = [...schema.requiredMigrations];
  assert.deepEqual(assessCutoverReadiness(approvedContract(), state), {
    ready: true,
    blockers: [],
  });
});

test("every required v13 schema object is mandatory independently of migration history", () => {
  const edits = [
    (s) => s.showcaseSchema.schemaObjects.tables.pop(),
    (s) => s.showcaseSchema.schemaObjects.indexes.shift(),
    (s) => s.showcaseSchema.schemaObjects.triggers.pop(),
    (s) => s.showcaseSchema.schemaObjects.columns.models.pop(),
    (s) => {
      delete s.showcaseSchema.schemaObjects.columns.catalog_folders;
    },
    (s) =>
      s.showcaseSchema.schemaObjects.indexes.push(
        s.showcaseSchema.schemaObjects.indexes[0],
      ),
    (s) => {
      delete s.showcaseSchema.schemaObjects;
    },
  ];
  for (const change of edits) {
    const state = fullState();
    change(state);
    const verdict = assessCutoverReadiness(approvedContract(), state);
    assert.equal(verdict.ready, false);
    assert.ok(
      verdict.blockers.includes(
        "target_worker_required_schema_objects_unverified",
      ),
      JSON.stringify(verdict.blockers),
    );
  }
  assert.deepEqual(assessCutoverReadiness(approvedContract(), fullState()), {
    ready: true,
    blockers: [],
  });
});

test("Cloudflare schema inspection is metadata-only and never runs DDL or model scans", async () => {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    calls.push({ url: u, method: init.method, body: init.body });
    if (u.endsWith("/repos/" + original.origin.repository)) {
      return Response.json({
        id: original.origin.repositoryId,
        full_name: original.origin.repository,
      });
    }
    if (u.endsWith("/repos/" + original.target.repository)) {
      return Response.json({
        id: original.target.repositoryId,
        full_name: original.target.repository,
        default_branch: "main",
      });
    }
    if (u.endsWith("/git/ref/heads/main")) {
      return Response.json({
        ref: "refs/heads/main",
        object: { sha: original.origin.observedMainSha },
      });
    }
    if (u.endsWith("/pulls/" + original.staging.sourceFixPullRequest)) {
      return Response.json({
        number: original.staging.sourceFixPullRequest,
        state: "closed",
        draft: false,
        merged: true,
        merge_commit_sha: original.staging.sourceFixMergeCommit,
        head: {
          sha: original.staging.sourceFixMergedHead,
          repo: { full_name: original.origin.repository },
        },
        base: { sha: original.staging.sourceFixBaseShaAtMerge },
      });
    }
    if (u.includes("/contents/worker/media.ts?ref=main")) {
      return Response.json({
        sha: original.staging.fileBlobs["worker/media.ts"],
      });
    }
    if (u.includes("/runs?status=")) return Response.json({ total_count: 0 });
    if (u.startsWith("https://api.github.com/")) {
      const writer = writerFromApiUrl(u);
      return Response.json(
        writer
          ? { id: writer.id, path: writer.path, state: "disabled_manually" }
          : workflow,
      );
    }
    const tag = original.productionObservation.workersBuildsScriptTag;
    if (u.endsWith("/workers/scripts")) {
      return Response.json({ success: true, result: [{ id: original.runtime.worker, tag }] });
    }
    if (u.endsWith("/builds/workers/" + tag)) {
      return Response.json({ success: false, errors: [{ code: 12040, message: "No build configuration" }] }, { status: 404 });
    }
    if (u.endsWith("/builds/workers/" + tag + "/triggers")) {
      return Response.json({ success: true, result: [] });
    }
    if (u.endsWith("/deployments")) {
      return Response.json({
        success: true,
        result: { deployments: [structuredClone(deployment)] },
      });
    }
    if (u.endsWith("/settings")) {
      return Response.json({
        success: true,
        result: {
          ...structuredClone(workerSettings),
          bindings: structuredClone(bindings),
        },
      });
    }
    if (u.endsWith("/query")) {
      assert.equal(init.method, "POST");
      assert.equal(init.headers.Authorization, "Bearer test-cloudflare-key");
      const { sql } = JSON.parse(init.body);
      assert.match(sql, /JOIN pragma_table_info\(tables.name\)/);
      assert.match(sql, /tables.name IN \(/);
      assert.ok(sql.includes("'catalog_folders'"));
      assert.match(sql, /columns.name IN \(/);
      assert.match(sql, /FROM d1_migrations WHERE name IN \(/);
      assert.ok(sql.includes("'" + schema.latestMigration + "'"));
      assert.match(
        sql,
        /SELECT type AS category,name,sql AS definition,NULL AS parent FROM sqlite_master/,
      );
      assert.match(sql, /type IN \('table','index','trigger'\)/);
      assert.match(sql, /idx_models_telegram_showcase_name/);
      assert.equal((sql.match(/\bUNION ALL\b/g) ?? []).length, 2);
      assert.ok(
        !/\b(UPDATE|DELETE|INSERT|ALTER|DROP|REPLACE)\s+(?:TABLE|INTO|models|FROM)\b/i.test(
          sql,
        ),
      );
      assert.ok(!/FROM\s+models\b/i.test(sql));
      return Response.json({
        success: true,
        result: [
          {
            results: [
              ...Object.entries(schema.requiredObjects.columns).flatMap(
                ([parent, names]) =>
                  names.map((name) => ({ category: "column", parent, name })),
              ),
              ...schema.requiredMigrations.map((name) => ({
                category: "migration",
                name,
              })),
              ...schema.requiredObjects.tables.map((name) => ({
                category: "table",
                name,
              })),
              ...schema.requiredObjects.triggers.map((name) => ({
                category: "trigger",
                name,
              })),
              ...schema.requiredObjects.indexes.map((name) => ({
                category: "index",
                name,
                definition: name === showcaseIndex ? indexDefinition : null,
              })),
            ],
          },
        ],
      });
    }
    throw Error("Unexpected preflight URL " + u);
  };
  try {
    const state = await inspectLiveReadOnly({
      GITHUB_TOKEN: "test-github-key",
      CLOUDFLARE_API_TOKEN: "test-cloudflare-key",
      CLOUDFLARE_ACCOUNT_ID: original.runtime.cloudflareAccountId,
    });
    assert.equal(state.showcaseSchema.migration, showcaseMigration);
    assert.deepEqual(
      state.showcaseSchema.appliedMigrations,
      schema.requiredMigrations,
    );
    assert.equal(state.showcaseSchema.column, "telegram_showcase_visible");
    assert.deepEqual(state.showcaseSchema.triggers, showcaseTriggers);
    assert.deepEqual(state.showcaseSchema.indexes, [showcaseIndex]);
    assert.equal(state.showcaseSchema.indexDefinition, indexDefinition);
    assert.deepEqual(
      state.showcaseSchema.schemaObjects,
      schema.requiredObjects,
    );
    assert.equal(calls.filter((x) => x.method === "POST").length, 1);
    assert.equal(calls.filter((x) => x.url.endsWith("/query")).length, 1);
  } finally {
    globalThis.fetch = previous;
  }
});

test("M5 requires existing private Telegram R2, admin secrets and exact Worker bindings", () => {
  const contract = approvedContract();
  const cases = [
    {
      name: "private bucket removed",
      mutate: (s) => {
        s.bindings = s.bindings.filter((b) => b.name !== "PRIVATE_TELEGRAM");
      },
      blocker: "private_telegram_r2_binding_unverified",
    },
    {
      name: "private bucket retargeted",
      mutate: (s) => {
        s.bindings.find((b) => b.name === "PRIVATE_TELEGRAM").bucket_name =
          "unexpected-bucket";
      },
      blocker: "private_telegram_r2_binding_unverified",
    },
    {
      name: "admin URL missing",
      mutate: (s) => {
        s.bindings = s.bindings.filter((b) => b.name !== "ADMIN_SUPABASE_URL");
      },
      blocker: "administrative_secret_bindings_unverified",
    },
    {
      name: "admin key wrong type",
      mutate: (s) => {
        s.bindings.find((b) => b.name === "ADMIN_SUPABASE_ANON_KEY").type =
          "plain_text";
      },
      blocker: "administrative_secret_bindings_unverified",
    },
    {
      name: "CORS missing",
      mutate: (s) => {
        s.bindings = s.bindings.filter((b) => b.name !== "CORS_ORIGINS");
      },
      blocker: "cors_binding_unverified",
    },
    {
      name: "unexpected legacy binding",
      mutate: (s) => {
        s.bindings.push({ name: "LEGACY_DB", type: "d1" });
      },
      blocker: "worker_binding_inventory_mismatch",
    },
    {
      name: "duplicate Worker binding",
      mutate: (s) => {
        s.bindings.push({ ...s.bindings[0] });
      },
      blocker: "worker_binding_inventory_mismatch",
    },
  ];
  for (const { name, mutate, blocker } of cases) {
    const state = fullState();
    mutate(state);
    const result = assessCutoverReadiness(contract, state);
    assert.equal(result.ready, false, name);
    assert.ok(
      result.blockers.includes(blocker),
      name + ": " + JSON.stringify(result.blockers),
    );
  }
  const valid = assessCutoverReadiness(contract, fullState());
  assert.equal(valid.ready, true, JSON.stringify(valid.blockers));
});

test("M5 runtime settings and exact CORS must match the Worker SSOT", () => {
  const cases = [
    {
      reason: "wrong compatibility date",
      mutate: (state) => {
        state.workerSettings.compatibility_date = "2020-01-01";
      },
      blocker: "worker_runtime_settings_mismatch",
    },
    {
      reason: "missing compatibility flag",
      mutate: (state) => {
        state.workerSettings.compatibility_flags = [];
      },
      blocker: "worker_runtime_settings_mismatch",
    },
    {
      reason: "observability changed",
      mutate: (state) => {
        state.workerSettings.observability.enabled =
          !workerSettings.observability.enabled;
      },
      blocker: "worker_runtime_settings_mismatch",
    },
    {
      reason: "missing Cloudflare settings",
      mutate: (state) => {
        delete state.workerSettings;
      },
      blocker: "worker_runtime_settings_mismatch",
    },
    {
      reason: "different CORS origins",
      mutate: (state) => {
        state.bindings.find((x) => x.name === "CORS_ORIGINS").text =
          "https://unexpected.example";
      },
      blocker: "cors_binding_unverified",
    },
    {
      reason: "blank CORS origins",
      mutate: (state) => {
        state.bindings.find((x) => x.name === "CORS_ORIGINS").text = "";
      },
      blocker: "cors_binding_unverified",
    },
  ];
  for (const { reason, mutate, blocker } of cases) {
    const state = fullState();
    mutate(state);
    const result = assessCutoverReadiness(approvedContract(), state);
    assert.equal(result.ready, false, reason);
    assert.ok(result.blockers.includes(blocker), reason);
  }
  assert.deepEqual(assessCutoverReadiness(approvedContract(), fullState()), {
    ready: true,
    blockers: [],
  });
});

test("source activity, drift or missing live bindings block the cutover", () => {
  const state = fullState();
  state.running = 1;
  state.deployment.versions[0].version_id =
    "ffffffff-ffff-ffff-ffff-ffffffffffff";
  state.bindings = state.bindings.filter(
    (x) => x.name !== "TURNSTILE_SECRET_KEY",
  );
  const result = assessCutoverReadiness(approvedContract(), state);
  assert.equal(result.ready, false);
  assert.ok(
    result.blockers.includes("source_workflow_runs_in_progress_or_unverified"),
  );
  assert.ok(
    result.blockers.includes("cloudflare_active_version_unverified_or_changed"),
  );
  assert.ok(result.blockers.includes("turnstile_secret_presence_unverified"));
});

test("a fully verified offline fixture can pass without performing any release", () => {
  const result = assessCutoverReadiness(approvedContract(), fullState());
  assert.deepEqual(result, { ready: true, blockers: [] });
});

test("D1 migration enabling remains a blocker even with all other checks passing", () => {
  const c = approvedContract();
  c.migration.targetD1MigrationEnabled = true;
  const result = assessCutoverReadiness(c, fullState());
  assert.equal(result.ready, false);
  assert.ok(
    result.blockers.includes("remote_d1_migrations_must_remain_disabled"),
  );
});

test("all non-terminal GitHub workflow states fail closed", () => {
  for (const status of ["requested", "waiting", "pending"]) {
    const state = fullState();
    state[status] = 1;
    const result = assessCutoverReadiness(approvedContract(), state);
    assert.equal(result.ready, false, "unexpected READY for " + status);
    assert.ok(
      result.blockers.includes(
        "source_workflow_runs_" + status + "_or_unverified",
      ),
    );
    delete state[status];
    const unknown = assessCutoverReadiness(approvedContract(), state);
    assert.equal(
      unknown.ready,
      false,
      "missing status must fail closed: " + status,
    );
  }
});

test("mismatched authority or rollback without proof blocks promotion", () => {
  const c = approvedContract();
  c.target.repository = "unexpected/other-repository";
  c.productionObservation.rollbackTestedAgainstProduction = false;
  const state = fullState();
  state.cloudflareAccountId = "another-account";
  const result = assessCutoverReadiness(c, state);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("target_repository_mismatch"));
  assert.ok(result.blockers.includes("rollback_not_verified"));
  assert.ok(result.blockers.includes("cloudflare_account_unverified"));
});

test("active source workflows skip queue polling but remain blocked", async () => {
  const previous = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url, init) => {
    const address = String(url);
    assert.equal(init.method, "GET");
    assert.ok(!address.includes("/runs?status="), "do not poll active writers");
    urls.push(address);
    if (address.endsWith("/repos/" + original.origin.repository)) {
      return Response.json({
        id: original.origin.repositoryId,
        full_name: original.origin.repository,
      });
    }
    if (address.endsWith("/repos/" + original.target.repository)) {
      return Response.json({
        id: original.target.repositoryId,
        full_name: original.target.repository,
        default_branch: "main",
      });
    }
    if (address.endsWith("/git/ref/heads/main")) {
      return Response.json({
        ref: "refs/heads/main",
        object: { sha: original.origin.observedMainSha },
      });
    }
    if (address.endsWith("/pulls/" + original.staging.sourceFixPullRequest)) {
      return Response.json({
        number: original.staging.sourceFixPullRequest,
        state: "closed",
        draft: false,
        merged: true,
        merge_commit_sha: original.staging.sourceFixMergeCommit,
        head: {
          sha: original.staging.sourceFixMergedHead,
          repo: { full_name: original.origin.repository },
        },
        base: { sha: original.staging.sourceFixBaseShaAtMerge },
      });
    }
    if (address.includes("/contents/worker/media.ts?ref=main")) {
      return Response.json({
        sha: original.staging.fileBlobs["worker/media.ts"],
      });
    }
    const writer = writerFromApiUrl(address);
    return Response.json(
      writer
        ? { id: writer.id, path: writer.path, state: "active" }
        : { ...workflow, state: "active" },
    );
  };
  try {
    const observed = await inspectLiveReadOnly({});
    assert.equal(urls.length, 6 + retiringWriters.length);
    assert.equal(observed.running, null);
    assert.ok(
      observed.additionalWriters.every(
        (w) => w.state === "active" && w.pending === null,
      ),
    );
    const verdict = assessCutoverReadiness(approvedContract(), observed);
    assert.equal(verdict.ready, false);
    assert.ok(
      verdict.blockers.includes("source_github_workflow_still_enabled"),
    );
    assert.ok(
      verdict.blockers.includes(
        "source_additional_writers_active_or_unverified",
      ),
    );
    assert.ok(
      verdict.blockers.includes("source_workflow_runs_pending_or_unverified"),
    );
  } finally {
    globalThis.fetch = previous;
  }
});
test("read-only inspection queries every non-terminal GitHub status without Cloudflare credentials", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(options.method, "GET");
    requests.push(String(url));
    if (String(url).includes("/runs?status=")) {
      return Response.json({ total_count: 0 });
    }
    if (String(url).includes("/contents/worker/media.ts?ref=main")) {
      return Response.json({
        sha: original.staging.fileBlobs["worker/media.ts"],
      });
    }
    if (String(url).endsWith("/git/ref/heads/main")) {
      return Response.json({
        ref: "refs/heads/main",
        object: { sha: original.origin.observedMainSha },
      });
    }
    if (
      String(url).endsWith("/pulls/" + original.staging.sourceFixPullRequest)
    ) {
      return Response.json({
        number: original.staging.sourceFixPullRequest,
        state: "closed",
        draft: false,
        merged: true,
        merge_commit_sha: original.staging.sourceFixMergeCommit,
        head: {
          sha: original.staging.sourceFixMergedHead,
          repo: { full_name: original.origin.repository },
        },
        base: { sha: original.staging.sourceFixBaseShaAtMerge },
      });
    }
    if (String(url).endsWith("/repos/" + original.origin.repository)) {
      return Response.json({
        id: original.origin.repositoryId,
        full_name: original.origin.repository,
      });
    }
    if (String(url).endsWith("/repos/" + original.target.repository)) {
      return Response.json({
        id: original.target.repositoryId,
        full_name: original.target.repository,
        default_branch: "main",
      });
    }
    const writer = writerFromApiUrl(url);
    return Response.json(
      writer
        ? { id: writer.id, path: writer.path, state: "disabled_manually" }
        : workflow,
    );
  };
  try {
    const state = await inspectLiveReadOnly({});
    assert.equal(state.running, 0);
    assert.equal(state.queued, 0);
    assert.equal(state.requested, 0);
    assert.equal(state.waiting, 0);
    assert.equal(state.pending, 0);
    assert.equal(state.additionalWriters.length, retiringWriters.length);
    assert.ok(
      state.additionalWriters.every(
        (x) => x.state === "disabled_manually" && x.pending === 0,
      ),
    );
    assert.equal(state.deployment, undefined);
    assert.equal(state.cloudflareAccountId, undefined);
    assert.equal(requests.length, 11 + 6 * retiringWriters.length);
    assert.equal(state.targetRepositoryId, original.target.repositoryId);
    assert.equal(state.targetDefaultBranch, "main");
    assert.ok(
      requests.some((url) =>
        url.endsWith("/repos/" + original.target.repository),
      ),
    );
    assert.equal(state.sourceFix.headSha, original.staging.sourceFixMergedHead);
    assert.equal(
      state.sourceFix.mergeCommitSha,
      original.staging.sourceFixMergeCommit,
    );
    assert.equal(
      state.sourceMediaBlobSha,
      original.staging.fileBlobs["worker/media.ts"],
    );
    assert.ok(
      requests.some((url) =>
        url.endsWith("/pulls/" + original.staging.sourceFixPullRequest),
      ),
    );
    assert.equal(state.sourceMainSha, original.origin.observedMainSha);
    assert.equal(state.sourceRepositoryId, original.origin.repositoryId);
    assert.ok(requests.some((url) => url.endsWith("/git/ref/heads/main")));
    for (const status of [
      "in_progress",
      "queued",
      "requested",
      "waiting",
      "pending",
    ]) {
      assert.ok(
        requests.some((url) => url.includes("/runs?status=" + status + "&")),
      );
    }
    assert.ok(
      requests.every((url) => url.startsWith("https://api.github.com/")),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("staged Wrangler and runtime manifest must name the same D1, R2 and Worker", () => {
  const changed = approvedContract();
  changed.runtime.d1 = "unexpected-database";
  changed.runtime.r2 = "unexpected-bucket";
  const result = assessCutoverReadiness(changed, fullState());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("staged_worker_config_mismatch"));
});

test("the source workflow ID must match the single canonical manifest", () => {
  const changed = approvedContract();
  changed.origin.apiDeployWorkflowId = 0;
  const result = assessCutoverReadiness(changed, fullState());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("github_workflow_identity_unverified"));
});

test("source main drift and missing or inconsistent pinned SHAs fail closed", () => {
  const state = fullState();
  state.sourceMainSha = "0000000000000000000000000000000000000000";
  const drift = assessCutoverReadiness(approvedContract(), state);
  assert.equal(drift.ready, false);
  assert.ok(drift.blockers.includes("source_main_drift_or_unverified"));

  const contract = approvedContract();
  contract.staging.sourceMain = "0000000000000000000000000000000000000000";
  const staleManifest = assessCutoverReadiness(contract, fullState());
  assert.equal(staleManifest.ready, false);
  assert.ok(staleManifest.blockers.includes("source_main_drift_or_unverified"));

  const withoutObservation = fullState();
  delete withoutObservation.sourceMainSha;
  assert.ok(
    assessCutoverReadiness(
      approvedContract(),
      withoutObservation,
    ).blockers.includes("source_main_drift_or_unverified"),
  );
});

test("source repository ID and canonical name must match GitHub metadata", () => {
  const state = fullState();
  state.sourceRepositoryId += 1;
  assert.ok(
    assessCutoverReadiness(approvedContract(), state).blockers.includes(
      "source_repository_identity_unverified",
    ),
  );
  const renamed = fullState();
  renamed.sourceRepositoryName = "unverified/catalogo";
  assert.ok(
    assessCutoverReadiness(approvedContract(), renamed).blockers.includes(
      "source_repository_identity_unverified",
    ),
  );
});

test("merged source media fix must match canonical merged head, original base and source blob", () => {
  const changed = fullState();
  changed.sourceFix.headSha = "0000000000000000000000000000000000000000";
  assert.ok(
    assessCutoverReadiness(approvedContract(), changed).blockers.includes(
      "source_media_patch_drift_or_unverified",
    ),
  );

  const retargeted = fullState();
  retargeted.sourceFix.baseSha = "1111111111111111111111111111111111111111";
  assert.ok(
    assessCutoverReadiness(approvedContract(), retargeted).blockers.includes(
      "source_media_patch_drift_or_unverified",
    ),
  );

  const changedMerge = fullState();
  changedMerge.sourceFix.mergeCommitSha =
    "ffffffffffffffffffffffffffffffffffffffff";
  assert.ok(
    assessCutoverReadiness(approvedContract(), changedMerge).blockers.includes(
      "source_media_patch_drift_or_unverified",
    ),
  );

  const changedBlob = fullState();
  changedBlob.sourceMediaBlobSha = "0000000000000000000000000000000000000000";
  assert.ok(
    assessCutoverReadiness(approvedContract(), changedBlob).blockers.includes(
      "source_media_patch_drift_or_unverified",
    ),
  );

  const missing = fullState();
  delete missing.sourceFix;
  assert.ok(
    assessCutoverReadiness(approvedContract(), missing).blockers.includes(
      "source_media_patch_drift_or_unverified",
    ),
  );
});

test("unmerged, open, or draft source patch cannot pass reconciliation", () => {
  for (const mutation of [
    { state: "open" },
    { merged: false },
    { draft: true },
    { headRepo: "someone-else/catalogo" },
  ]) {
    const observed = fullState();
    Object.assign(observed.sourceFix, mutation);
    assert.ok(
      assessCutoverReadiness(approvedContract(), observed).blockers.includes(
        "source_media_patch_drift_or_unverified",
      ),
      JSON.stringify(mutation),
    );
  }
});

test("the private target repository identity is confirmed from GitHub, not only local pins", () => {
  for (const change of [
    { targetRepositoryId: original.target.repositoryId + 1 },
    { targetRepositoryName: "unexpected/other" },
    { targetDefaultBranch: "development" },
  ]) {
    const state = { ...fullState(), ...change };
    const result = assessCutoverReadiness(approvedContract(), state);
    assert.equal(result.ready, false);
    assert.ok(result.blockers.includes("target_repository_mismatch"));
  }
  const absent = fullState();
  delete absent.targetRepositoryId;
  assert.ok(
    assessCutoverReadiness(approvedContract(), absent).blockers.includes(
      "target_repository_mismatch",
    ),
  );
});

test("ownership-only checks live GitHub and Cloudflare metadata without a D1 request", async () => {
  const prior = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const address = String(url);
    calls.push({ address, method: init.method });
    assert.equal(init.method, "GET");
    assert.ok(
      !address.includes("/d1/database/"),
      "must not query D1 under quota pressure",
    );
    const buildTag = original.productionObservation.workersBuildsScriptTag;
    if (address.endsWith("/builds/workers/" + buildTag)) {
      return Response.json({ success: false, errors: [{ code: 12040, message: "No build configuration" }] }, { status: 404 });
    }
    if (address.endsWith("/builds/workers/" + buildTag + "/triggers")) {
      return Response.json({ success: true, result: [] });
    }
    if (address.endsWith("/workers/scripts")) {
      return Response.json({ success: true, result: [{ id: original.runtime.worker, tag: buildTag }] });
    }
    if (address.endsWith("/deployments")) {
      return Response.json({
        success: true,
        result: {
          deployments: [
            {
              versions: [
                {
                  version_id: original.productionObservation.currentVersionId,
                  percentage: 100,
                },
              ],
            },
          ],
        },
      });
    }
    if (address.endsWith("/settings"))
      return Response.json({ success: true, result: { bindings: [] } });
    return Response.json({ id: 1, total_count: 0, result: [] });
  };
  try {
    const state = await inspectLiveReadOnly(
      {
        GITHUB_TOKEN: "github-readonly-test",
        CLOUDFLARE_API_TOKEN: "cloudflare-readonly-test",
        CLOUDFLARE_ACCOUNT_ID: original.runtime.cloudflareAccountId,
      },
      { verifyShowcaseSchema: false },
    );
    assert.equal(state.showcaseSchema, undefined);
    assert.equal(
      state.cloudflareAccountId,
      original.runtime.cloudflareAccountId,
    );
    assert.equal(
      calls.filter((x) => x.address.includes("api.cloudflare.com")).length,
      5,
    );
    assert.equal(calls.length, 11 + retiringWriters.length);
    assert.deepEqual(state.workersBuilds, {
      scriptTag: original.productionObservation.workersBuildsScriptTag,
      activeScriptTag: original.productionObservation.workersBuildsScriptTag,
      configAbsent: true,
      triggerCount: 0,
    });
    assert.equal(
      assessCutoverReadiness(approvedContract(), state).ready,
      false,
    );
    assert.ok(
      assessCutoverReadiness(approvedContract(), state).blockers.includes(
        "telegram_showcase_migration_0025_unverified",
      ),
    );
  } finally {
    globalThis.fetch = prior;
  }
});

test("a read-only GitHub token is used only for metadata GET requests", async () => {
  const savedFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({
      url: String(url),
      method: init.method,
      token: init.headers.Authorization,
    });
    if (String(url).endsWith("/repos/" + original.target.repository)) {
      return Response.json({
        id: original.target.repositoryId,
        full_name: original.target.repository,
        default_branch: "main",
      });
    }
    if (String(url).endsWith("/repos/" + original.origin.repository)) {
      return Response.json({
        id: original.origin.repositoryId,
        full_name: original.origin.repository,
      });
    }
    if (String(url).includes("/contents/worker/media.ts?ref=main")) {
      return Response.json({
        sha: original.staging.fileBlobs["worker/media.ts"],
      });
    }
    if (String(url).endsWith("/git/ref/heads/main")) {
      return Response.json({
        ref: "refs/heads/main",
        object: { sha: original.origin.observedMainSha },
      });
    }
    if (
      String(url).endsWith("/pulls/" + original.staging.sourceFixPullRequest)
    ) {
      return Response.json({
        number: original.staging.sourceFixPullRequest,
        state: "closed",
        draft: false,
        merged: true,
        merge_commit_sha: original.staging.sourceFixMergeCommit,
        head: {
          sha: original.staging.sourceFixMergedHead,
          repo: { full_name: original.origin.repository },
        },
        base: { sha: original.staging.sourceFixBaseShaAtMerge },
      });
    }
    if (String(url).includes("/runs?status="))
      return Response.json({ total_count: 0 });
    const writer = writerFromApiUrl(url);
    return Response.json(
      writer
        ? { id: writer.id, path: writer.path, state: "disabled_manually" }
        : workflow,
    );
  };
  try {
    const state = await inspectLiveReadOnly({
      GITHUB_TOKEN: "test-github-token",
    });
    assert.equal(state.targetRepositoryId, original.target.repositoryId);
    assert.equal(requests.length, 11 + 6 * retiringWriters.length);
    assert.ok(
      requests.every(
        (r) => r.method === "GET" && r.token === "Bearer test-github-token",
      ),
    );
    assert.ok(
      requests.every((r) => r.url.startsWith("https://api.github.com/")),
    );
  } finally {
    globalThis.fetch = savedFetch;
  }
});
