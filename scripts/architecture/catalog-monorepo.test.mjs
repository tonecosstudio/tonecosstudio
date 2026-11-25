/** Fail-closed, zero-network contract for Tonecos' single-repository migration. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = (path) => readFileSync(join(root, path), 'utf8');
const contract = JSON.parse(source('config/catalog-code-consolidation.json'));
const sha = /^[a-f0-9]{40}$/;

test('a single GitHub code owner is specified; current external publisher is explicit', () => {
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.target.repository, 'tonecosstudio/tonecosstudio');
  assert.equal(contract.target.repositoryId, 1163825583);
  assert.equal(contract.target.serviceRoot, 'services/catalogo');
  assert.equal(contract.origin.repository, 'washingtonmsdj/catalogo');
  assert.equal(contract.origin.repositoryId, 1398242143);
  assert.match(contract.origin.observedMainSha, sha);
  assert.deepEqual(contract.origin.openPullRequestsAtAudit, [266, 264, 263]);
  const beforeCutover = ['inventoried','staged-offline'].includes(contract.migration.phase);
  assert.equal(contract.activeWorkerPublisher, beforeCutover ? contract.origin.repository : contract.target.repository,
    'Exactly one phase-appropriate publisher may own Worker releases');
});

test('source inventory has immutable blob identities and no missing migration sequence', () => {
  assert.equal(Object.keys(contract.origin.workerFiles).length, 12);
  assert.equal(Object.keys(contract.origin.migrationFiles).length, 22);
  for (const [path, blob] of Object.entries(contract.origin.workerFiles)) {
    assert.match(path, /^worker\/[a-zA-Z][a-zA-Z0-9]*\.ts$/);
    assert.match(blob, sha);
  }
  const migrationPaths = Object.keys(contract.origin.migrationFiles).sort();
  assert.deepEqual(migrationPaths.map(p => Number(p.match(/^migrations\/(\d{4})_[^/]+\.sql$/)?.[1])),
    Array.from({length:22}, (_, i) => i + 1));
  for (const blob of Object.values(contract.origin.migrationFiles)) assert.match(blob, sha);
  assert.equal(contract.origin.fileCounts.worker, 12);
  assert.equal(contract.origin.fileCounts.migrations, 22);
  assert.equal(contract.origin.fileCounts.totalTrackedBlobs, 652);
});

test('M1 import graph distinguishes public Worker from disconnected commercial modules', () => {
  const workerPaths = new Set(Object.keys(contract.origin.workerFiles));
  const graph = contract.origin.staticImportGraph;
  assert.equal(graph.entrypoint, 'worker/entry.ts');
  assert.equal(graph.observedAtSha, contract.origin.inventoryAuditedAtSha);
  assert.equal(contract.staging.originalImportSourceSha, contract.origin.inventoryAuditedAtSha);
  assert.notEqual(contract.origin.observedMainSha, contract.origin.inventoryAuditedAtSha,
    'New source HEAD must not overwrite the immutable import inventory checkpoint');
  assert.equal(graph.reachableWorkerPaths.length, 9);
  assert.equal(graph.notImportedByEntrypoint.length, 3);
  assert.deepEqual(graph.nonWorkerImportPaths, ['config/catalog-schema-contract.json']);
  const union = [...graph.reachableWorkerPaths, ...graph.notImportedByEntrypoint];
  assert.equal(new Set(union).size, 12);
  assert.deepEqual([...union].sort(), [...workerPaths].sort());
  for (const path of graph.notImportedByEntrypoint) assert.match(path, /quote(Admin|Workflow)/);
});

test('M1 deploy tooling inventory is pinned without authorizing a second pipeline', () => {
  const origin = contract.origin;
  const shaValues = Object.values(origin.workflowApiToolCandidates);
  assert.equal(shaValues.length, 18);
  for (const [path, blob] of Object.entries(origin.workflowApiToolCandidates)) {
    assert.match(path, /^tools\/[a-zA-Z0-9_.-]+\.(mjs|py)$/);
    assert.match(blob, sha);
  }
  assert.deepEqual(Object.keys(origin.transitiveApiToolCandidates), ['tools/check_worker_gallery_contract.mjs']);
  assert.ok(Object.values(origin.transitiveApiToolCandidates).every(v => sha.test(v)));
  assert.deepEqual(Object.keys(origin.apiBuildConfigBlobs).sort(),
    ['config/catalog-schema-contract.json','tsconfig.worker.json','wrangler.jsonc']);
  assert.ok(Object.values(origin.apiBuildConfigBlobs).every(v => sha.test(v)));
  assert.equal(origin.apiDeployPipeline, '.github/workflows/cloudflare.yml');
  assert.equal(origin.apiDeployWorkflowId, 371358484, 'Source publisher workflow identity is pinned');
  assert.equal(contract.migration.targetWorkerReleaseEnabled,
    ['cutover-approved','cutover-complete'].includes(contract.migration.phase),
    'Only approved cutover phases may enable the target publisher');
});

test('only the existing Cloudflare resources may serve requests', () => {
  assert.equal(contract.runtime.cloudflarePages, 'tonecosstudio');
  assert.equal(contract.runtime.cloudflareAccountId, '8827c547d6def5ee5b9ca550fdd5680a');
  assert.equal(contract.runtime.worker, 'tonecos-catalogo-api');
  assert.equal(contract.runtime.pagesServiceBinding, 'CATALOG_WORKER');
  assert.equal(contract.runtime.d1, 'tonecos-catalogo');
  assert.equal(contract.runtime.r2, 'tonecos-catalogo-media');
  const worker = JSON.parse(source('services/catalogo/wrangler.jsonc'));
  assert.equal(worker.name, contract.runtime.worker);
  assert.equal(worker.main, 'worker/entry.ts');
  assert.equal(worker.d1_databases?.length, 1);
  assert.equal(worker.d1_databases[0].binding, 'DB');
  assert.equal(worker.d1_databases[0].database_name, contract.runtime.d1);
  assert.equal(worker.d1_databases[0].database_id, '87006366-60f3-4937-af73-2ef5a5f901fb');
  assert.equal(worker.d1_databases[0].migrations_dir, 'migrations');
  assert.equal(worker.r2_buckets?.length, 2);
  assert.equal(worker.r2_buckets[0].binding, 'MEDIA');
  assert.equal(worker.r2_buckets[0].bucket_name, contract.runtime.r2);
  assert.deepEqual(worker.r2_buckets[1], { binding: 'PRIVATE_TELEGRAM', bucket_name: 'tonecos-catalogo-staging' });
  assert.ok(worker.secrets?.required?.includes('ADMIN_SUPABASE_ANON_KEY'));
  assert.ok(worker.secrets?.required?.includes('ADMIN_SUPABASE_URL'));
  assert.ok(worker.secrets?.required?.includes('TURNSTILE_SECRET_KEY'));
  assert.match(source('functions/catalogo-api/[[path]].js'), /CATALOG_WORKER/);
  assert.ok(!existsSync(join(root,'wrangler.jsonc')), 'No active root Wrangler config for a second Worker');
  assert.ok(!existsSync(join(root,'worker')), 'Legacy Worker should not be copied into the site root');
  assert.ok(!existsSync(join(root,'migrations')), 'D1 must not overlap with root migrations');
});

test('M5 ownership transition is possible only after source disablement and explicit GO', () => {
  const m = contract.migration
  const o = contract.productionObservation
  assert.ok(['inventoried', 'staged-offline', 'cutover-approved', 'cutover-complete'].includes(m.phase))
  for (const key of [
    'releaseAuthorized', 'sourceWriterDisabled', 'targetWorkerReleaseEnabled',
    'targetD1MigrationEnabled', 'legacySiteRetired', 'sourceRepoArchived',
  ]) assert.equal(typeof m[key], 'boolean', key)
  assert.equal(m.targetD1MigrationEnabled, false, 'A runtime-only cutover must not apply D1 migrations')

  const servicePresent = existsSync(join(root, contract.target.serviceRoot))
  if (m.phase === 'inventoried') {
    assert.equal(servicePresent, false)
  } else {
    assert.equal(servicePresent, true, 'Worker code must be staged before ownership changes')
  }

  if (['inventoried', 'staged-offline'].includes(m.phase)) {
    assert.equal(contract.activeWorkerPublisher, contract.origin.repository)
    assert.equal(m.releaseAuthorized, false)
    assert.equal(m.sourceWriterDisabled, false)
    assert.equal(m.targetWorkerReleaseEnabled, false)
    assert.equal(o.releaseGoApproved, false)
    assert.equal(o.sourceWorkflowDisabledVerified, false)
    assert.equal(o.targetProductionCredentialsVerified, false)
    assert.equal(o.runtimeCutoverPerformed, false)
  } else {
    // This state is intentionally unreachable until the live, read-only
    // release gate also confirms the source workflow disabled with zero runs.
    assert.equal(contract.activeWorkerPublisher, contract.target.repository)
    assert.equal(m.releaseAuthorized, true)
    assert.equal(m.sourceWriterDisabled, true)
    assert.equal(m.targetWorkerReleaseEnabled, true)
    assert.equal(o.releaseGoApproved, true)
    assert.equal(o.sourceWorkflowDisabledVerified, true)
    // Approval and publisher ownership do not constitute a credential audit.
    // Only a completed live cutover can require credentials as proven.
    if (m.phase === 'cutover-complete') assert.equal(o.targetProductionCredentialsVerified, true)
    assert.equal(o.runtimeCutoverPerformed, m.phase === 'cutover-complete')
  }

  // Legacy sites and the historical source repo survive until M6 is verified.
  if (m.phase !== 'cutover-complete') {
    assert.equal(m.legacySiteRetired, false)
    assert.equal(m.sourceRepoArchived, false)
  }
})

test('staged files preserve immutable import pins and reviewed Telegram draft overlays', () => {
  assert.ok(['staged-offline', 'cutover-approved', 'cutover-complete'].includes(contract.migration.phase));
  assert.equal(contract.staging.sourceMain, contract.origin.observedMainSha);
  assert.equal(contract.staging.sourceFixPullRequest, 266);
  assert.match(contract.staging.sourceFixHead, sha);
  const stage = contract.staging.fileBlobs;
  assert.equal(Object.keys(stage).length, 46);
  assert.equal(Object.keys(stage).filter(p => p.startsWith('worker/')).length, 9);
  assert.equal(Object.keys(stage).filter(p => p.startsWith('migrations/')).length, 22);
  // Preserve the 46 immutable source Git pins; allow reviewed separately
  // pinned Tonecos-local changes while cutover remains blocked.
  const overlays = contract.staging.localOverlays ?? {};
  assert.deepEqual(Object.keys(overlays).sort(), [
    'config/catalog-schema-contract.json',
    'tools/test_schema_contract.mjs',
    'tools/test_worker_catalog_facets.mjs',
    'tools/test_worker_catalog_scale_sqlite.mjs',
    'tools/test_worker_folder_counts.mjs',
    'tools/test_worker_media_contract.mjs',
    'worker/entry.ts',
    'worker/index.ts',
    'worker/publicQueryBudget.ts',
    'worker/schemaContract.ts',
    'wrangler.jsonc',
  ]);
  assert.ok(['staged-offline','cutover-approved','cutover-complete'].includes(contract.migration.phase),
    'Immutable source import pins survive the approved M5 transition');
  assert.equal(contract.migration.releaseAuthorized, contract.migration.phase !== 'staged-offline');
  for (const [path, local] of Object.entries(overlays)) {
    assert.equal(local.sourceBlob, stage[path] ?? contract.staging.sourceReconciledAdditions?.[path],
      'Original import pin changed: ' + path);
    assert.match(local.localBlob, sha, 'Invalid local Git blob: ' + path);
    assert.notEqual(local.localBlob, local.sourceBlob, 'Unnecessary overlay: ' + path);
    assert.ok(typeof local.reason === 'string' && local.reason.trim().length >= 20,
      'Missing reviewed rationale: ' + path);
  }
  for (const [path, sourceBlob] of Object.entries(stage)) {
    assert.match(sourceBlob, sha, path);
    const buf = readFileSync(join(root, contract.target.serviceRoot, path));
    // Git's core.autocrlf can expand pinned LF blobs to CRLF in a Windows
    // checkout. Normalize only that transport-level difference before hashing.
    const canonical = Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'));
    const actual = createHash('sha1').update('blob ' + canonical.byteLength).update(Buffer.from([0])).update(canonical).digest('hex');
    assert.equal(actual, overlays[path]?.localBlob ?? sourceBlob,
      'Unexpected content drift in ' + path);
  }
  for (const excluded of contract.staging.excludedModules) {
    assert.equal(existsSync(join(root, contract.target.serviceRoot, excluded)), false, excluded);
  }
  assert.equal(existsSync(join(root, contract.target.serviceRoot, 'src')), false);
  assert.equal(existsSync(join(root, contract.target.serviceRoot, 'package.json')), false);
  assert.equal(contract.staging.tests.fail, 0);
  assert.equal(contract.staging.tests.pass, 58);
  assert.equal(contract.staging.tests.search.pass, 4);
  assert.equal(contract.staging.tests.typecheck.status, 'pass');
  assert.equal(contract.staging.tests.entryBundle.pass, 3);
  assert.equal(contract.staging.tests.totalPassed, 85);
  assert.ok(existsSync(join(root, contract.target.serviceRoot, 'tools/test_worker_entry_integration.mjs')));
  assert.equal(contract.migration.targetD1MigrationEnabled, false);
  // Publisher ownership is phase-dependent and validated in the M5 gate above.
});


test('upstream public query budget is reconciled by Git blob without replacing Worker authority', () => {
  const files = contract.staging.sourceReconciledAdditions ?? {};
  assert.deepEqual(Object.keys(files).sort(), [
    'tools/test_worker_public_query_budget.mjs',
    'worker/publicQueryBudget.ts',
  ]);
  for (const [path, expected] of Object.entries(files)) {
    assert.match(expected, sha);
    const bytes = readFileSync(join(root, contract.target.serviceRoot, path));
    const canonical = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
    const actual = createHash('sha1')
      .update('blob ' + canonical.byteLength)
      .update(Buffer.from([0]))
      .update(canonical)
      .digest('hex');
    assert.equal(actual, contract.staging.localOverlays?.[path]?.localBlob ?? expected,
      'Reconciled source content drift: ' + path);
  }
  assert.match(source('services/catalogo/worker/index.ts'), /validatePublicCatalogQuery/);
  assert.match(source('services/catalogo/worker/entry.ts'), /validatePublicCatalogQuery/);
  assert.equal(contract.migration.targetD1MigrationEnabled, false,
    'Only the bounded owner-approved migration job may apply D1 migrations');
});

test('M5 snapshot is a pinned observation, not production approval', () => {
  const o = contract.productionObservation
  const uuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/
  assert.equal(o.worker, contract.runtime.worker)
  assert.equal(o.cloudflareAccountId, contract.runtime.cloudflareAccountId)
  for (const key of ['currentVersionId', 'currentDeploymentId', 'previousVersionId']) {
    assert.match(o[key], uuid)
  }
  assert.equal(o.currentTrafficPercent, 100)
  assert.ok(Number.isInteger(o.currentVersionNumber) && o.currentVersionNumber >= 1)
  assert.ok(Number.isInteger(o.previousVersionNumber) && o.previousVersionNumber >= 1)
  if (o.currentVersionSourceCommit !== null) assert.match(o.currentVersionSourceCommit, sha)
  assert.equal(o.observedSourceMainSha, contract.origin.observedMainSha)
  if (o.currentVersionSourceCommit === null) {
    assert.equal(o.runtimeFileChangesBetweenProductionSourceAndObservedMain, null,
      'Do not claim zero runtime drift without source provenance for the Worker rollback');
    assert.equal(o.previousVersionMayBeRollbackCandidate, false,
      'The intervening Worker v41 caused HTTP 503 and cannot be trusted as rollback');
  }
  assert.equal(o.sourceDispatchCanApplyRemoteD1Migrations, !o.sourceWorkflowDisabledVerified,
    'Disabled source workflows cannot still act as a migration authority')
  for (const key of [
    'sourceWorkflowDisabledVerified', 'releaseGoApproved',
    'targetProductionCredentialsVerified', 'rollbackTestedAgainstProduction',
    'runtimeCutoverPerformed', 'observationIsApproval',
  ]) assert.equal(typeof o[key], 'boolean', key)
  assert.equal(o.observationIsApproval, false, 'A snapshot cannot be an authorization')
  assert.equal(contract.migration.targetD1MigrationEnabled, false)
});

test('the canonical plan is discoverable and supersedes the old transfer proposal', () => {
  for (const path of ['README.md', 'AGENTS.md', 'docs/README.md', 'URGENTE.md']) {
    assert.match(source(path), /MIGRACAO_CATALOGO_MONOREPO\.md/, `${path} must link the plan`);
  }
  assert.match(source('docs/MIGRACAO_CATALOGO_MONOREPO.md'), /M0.*M1.*M2.*M3.*M4.*M5.*M6/s);
  assert.doesNotMatch(source('docs/OPERACAO_CLOUDFLARE_PAGES.md'), /Destino desejado:\s*\*\*tonecosstudio\/catalogo/);
});

test('M5 ownership is manual-only, isolated from builds and Cloudflare', () => {
  const workflow = source('.github/workflows/quality.yml');
  assert.ok(workflow.includes('- m5-ownership'));
  assert.ok(workflow.includes('- verify'));
  assert.ok(workflow.includes('cancel-in-progress: >-'));

  const verifyGuard = "    if: github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && inputs.operation == 'verify')";
  assert.equal(workflow.split(verifyGuard).length - 1, 4, 'four heavy jobs must skip M5 ownership-only runs');

  const manualJob = workflow.split('  catalog-m5-ownership:')[1]
    ?.split('  catalog-controlled-worker-release:')[0];
  assert.ok(manualJob, 'M5 ownership inspection must reuse the existing quality workflow');
  assert.ok(manualJob.includes('refs/heads/main'));
  assert.ok(manualJob.includes('--ownership-only'));
  assert.ok(manualJob.includes('GITHUB_TOKEN'));
  assert.doesNotMatch(manualJob, /CLOUDFLARE_API_TOKEN|wrangler|deploy|migration|npm ci/i);
});
