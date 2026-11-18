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
  assert.equal(contract.activeWorkerPublisher,
    ['cutover-approved', 'cutover-complete'].includes(contract.migration.phase)
      ? contract.target.repository : contract.origin.repository);
});

test('source inventory has immutable blob identities and no missing migration sequence', () => {
  assert.equal(Object.keys(contract.origin.workerFiles).length, 13);
  assert.equal(Object.keys(contract.origin.migrationFiles).length, 22);
  for (const [path, blob] of Object.entries(contract.origin.workerFiles)) {
    assert.match(path, /^worker\/[a-zA-Z][a-zA-Z0-9]*\.ts$/);
    assert.match(blob, sha);
  }
  const migrationPaths = Object.keys(contract.origin.migrationFiles).sort();
  assert.deepEqual(migrationPaths.map(p => Number(p.match(/^migrations\/(\d{4})_[^/]+\.sql$/)?.[1])),
    Array.from({length:22}, (_, i) => i + 1));
  for (const blob of Object.values(contract.origin.migrationFiles)) assert.match(blob, sha);
  assert.equal(contract.origin.fileCounts.worker, 13);
  assert.equal(contract.origin.fileCounts.migrations, 22);
  assert.equal(contract.origin.fileCounts.totalTrackedBlobs, 656);
});

test('M1 import graph distinguishes public Worker from disconnected commercial modules', () => {
  const workerPaths = new Set(Object.keys(contract.origin.workerFiles));
  const graph = contract.origin.staticImportGraph;
  assert.equal(graph.entrypoint, 'worker/entry.ts');
  assert.equal(graph.observedAtSha, contract.origin.observedMainSha);
  assert.equal(graph.reachableWorkerPaths.length, 10);
  assert.equal(graph.notImportedByEntrypoint.length, 3);
  assert.deepEqual(graph.nonWorkerImportPaths, ['config/catalog-schema-contract.json']);
  const union = [...graph.reachableWorkerPaths, ...graph.notImportedByEntrypoint];
  assert.equal(new Set(union).size, 13);
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
  assert.deepEqual(
    origin.additionalWriterWorkflows.map(({ path, id }) => ({ path, id })),
    [
      { path: '.github/workflows/external-batch-release.yml', id: 384544141 },
      { path: '.github/workflows/exact-source-gallery-promotion.yml', id: 385740730 },
      { path: '.github/workflows/existing-gallery-promotion.yml', id: 385342502 },
      { path: '.github/workflows/external-media-staging.yml', id: 385318875 },
    ],
    'The D1/R2 publisher inventory must stay complete for M5',
  );
  assert.equal(contract.migration.targetWorkerReleaseEnabled, false);
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
  assert.ok(worker.vars.CORS_ORIGINS.split(',').includes('https://tonartstudio.com.br'));
  assert.equal(new Set(worker.vars.CORS_ORIGINS.split(',')).size, worker.vars.CORS_ORIGINS.split(',').length);
  assert.equal(worker.main, 'worker/entry.ts');
  assert.equal(worker.d1_databases?.length, 1);
  assert.equal(worker.d1_databases[0].binding, 'DB');
  assert.equal(worker.d1_databases[0].database_name, contract.runtime.d1);
  assert.equal(worker.d1_databases[0].database_id, '87006366-60f3-4937-af73-2ef5a5f901fb');
  assert.equal(worker.d1_databases[0].migrations_dir, 'migrations');
  assert.equal(worker.r2_buckets?.length, 1);
  assert.equal(worker.r2_buckets[0].binding, 'MEDIA');
  assert.equal(worker.r2_buckets[0].bucket_name, contract.runtime.r2);
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
    assert.equal(o.targetProductionCredentialsVerified, true)
    assert.equal(o.runtimeCutoverPerformed, m.phase === 'cutover-complete')
  }

  // Legacy sites and the historical source repo survive until M6 is verified.
  if (m.phase !== 'cutover-complete') {
    assert.equal(m.legacySiteRetired, false)
    assert.equal(m.sourceRepoArchived, false)
  }
})

test('staged files preserve immutable import pins and explicit local overlays, without commercial code', () => {
  assert.ok(['staged-offline', 'cutover-approved', 'cutover-complete'].includes(contract.migration.phase));
  assert.equal(contract.staging.sourceMain, contract.origin.observedMainSha);
  assert.equal(contract.staging.sourceFixPullRequest, 266);
  assert.match(contract.staging.sourceFixHead, sha);
  assert.equal(contract.staging.sourceFixStatusAtReconciliation, 'merged-in-main');
  assert.match(contract.staging.sourceFixMergeCommit, sha);
  assert.equal(contract.staging.reconciliation.sourceMainSha, contract.staging.sourceMain);
  const stage = contract.staging.fileBlobs;
  assert.equal(Object.keys(stage).length, 111);
  assert.equal(Object.keys(stage).filter(p => p.startsWith('worker/')).length, 10);
  assert.equal(Object.keys(stage).filter(p => p.startsWith('migrations/')).length, 22);
  // Verify the immutable source import and its reviewed local overlays.
  assert.equal(Object.keys(contract.origin.dataWriterToolchainBlobs ?? {}).length, 46,
    'Import one complete, source-pinned data-writer toolchain (no second pipeline)');
  assert.equal(contract.staging.dataWriterToolchain?.phase, 'staged-offline');
  assert.equal(contract.staging.dataWriterToolchain?.releaseAuthorized, false);
  assert.equal(contract.staging.dataWriterToolchain?.workflowWriterEnabled, false);
  for (const [path, blob] of Object.entries(contract.origin.dataWriterToolchainBlobs)) {
    assert.equal(stage[path], blob, 'Data writer source pin changed: ' + path);
    assert.ok(path.startsWith('tools/') || path.startsWith('config/') || path.startsWith('docs/evidence/'),
      'Imported D1/R2 toolchain may contain only executable code, contracts and reviewed evidence');
  }
  const overlays = contract.staging.localOverlays ?? {};
  assert.deepEqual(Object.keys(overlays).sort(), [
    'config/catalog-production-model-contract.json',
    'config/catalog-schema-contract.json',
    'config/migration-deploy-policy.json',
    'tools/check_migration_deploy_policy.py',
    'tools/test_worker_catalog_scale_sqlite.mjs',
    'tools/test_worker_folder_counts.mjs',
    'tools/test_worker_public_query_budget.mjs',
    'worker/index.ts',
    'worker/publicQueryBudget.ts',
    'wrangler.jsonc',
  ]);
  // The immutable import snapshot gates the INITIAL M5 release, not later
  // improvements published exclusively from TONART after M5 completes.
  if (contract.migration.phase === 'staged-offline') {
    assert.equal(contract.migration.releaseAuthorized, false);
  } else {
    assert.equal(contract.migration.releaseAuthorized, true);
  }
  for (const [path, local] of Object.entries(overlays)) {
    assert.equal(local.sourceBlob, stage[path], 'Original import pin changed: ' + path);
    assert.match(local.localBlob, sha, 'Invalid local Git blob: ' + path);
    assert.notEqual(local.localBlob, local.sourceBlob, 'Unnecessary overlay: ' + path);
    assert.ok(typeof local.reason === 'string' && local.reason.trim().length >= 20,
      'Missing reviewed rationale: ' + path);
  }
  for (const [path, sourceBlob] of Object.entries(stage)) {
    assert.match(sourceBlob, sha, path);
    const actualPath = join(root, contract.target.serviceRoot, path);
    assert.equal(existsSync(actualPath), true, 'Canonical catalog file missing: ' + path);
    if (contract.migration.phase !== 'cutover-complete') {
      const buf = readFileSync(actualPath);
      // Imported blobs may themselves use CRLF, while Git can expand LF blobs
      // to CRLF in a Windows checkout. Accept either exact bytes or only the
      // transport-level CRLF normalization; any content drift still fails.
      const canonical = Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'));
      const blobHash = bytes => createHash('sha1').update('blob ' + bytes.byteLength).update(Buffer.from([0])).update(bytes).digest('hex');
      const expected = overlays[path]?.localBlob ?? sourceBlob;
      assert.ok([blobHash(buf), blobHash(canonical)].includes(expected),
        'Unexpected candidate import drift in ' + path);
    }
  }
  const additions = contract.staging.postImportAdditions ?? [];
  assert.deepEqual(additions.map(item => item.path).sort(), [
    'migrations/0023_public_editorial_projection.sql',
    'worker/editorialProjection.ts',
  ].sort(), 'Only the approved D1 projection migration and its existing-Worker publisher may extend the imported snapshot');
  assert.equal(contract.migration.phase, 'staged-offline');
  assert.equal(contract.migration.targetD1MigrationEnabled, false);
  for (const addition of additions) {
    assert.equal(stage[addition.path], undefined, 'A local addition must not rewrite an imported pin');
    assert.match(addition.localBlob, sha, 'Invalid local addition Git blob: ' + addition.path);
    assert.ok(typeof addition.reason === 'string' && addition.reason.trim().length >= 20,
      'Missing reviewed rationale for local addition: ' + addition.path);
    const actualPath = join(root, contract.target.serviceRoot, addition.path);
    assert.equal(existsSync(actualPath), true, 'Local Worker addition missing: ' + addition.path);
    const bytes = readFileSync(actualPath);
    const canonical = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
    const blobHash = value => createHash('sha1').update('blob ' + value.byteLength)
      .update(Buffer.from([0])).update(value).digest('hex');
    assert.ok([blobHash(bytes), blobHash(canonical)].includes(addition.localBlob),
      'Unexpected local Worker addition content: ' + addition.path);
  }
  const deployPolicy = JSON.parse(source('services/catalogo/config/migration-deploy-policy.json'));
  assert.deepEqual(Object.keys(deployPolicy.approvedFtsIndexMaintenance ?? {}), [
    '0023_public_editorial_projection.sql',
  ], 'FTS delete exception must stay limited to the editorial projection migration');
  assert.deepEqual(deployPolicy.approvedFtsIndexMaintenance[
    '0023_public_editorial_projection.sql'
  ], {
    table: 'editorial_public_characters_fts',
    statements: 2,
    reason: 'Remove apenas a linha antiga do índice FTS5 derivado pelo ID estável do personagem antes da atualização, sem autorizar exclusões de dados de domínio.',
  }, 'Only the two exact FTS maintenance deletes may be excluded from destructive SQL scanning');
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

test('the model contract reconciles candidate and public catalog IDs without editorial identity claims', () => {
  const modelContract = JSON.parse(source('services/catalogo/config/catalog-production-model-contract.json'));
  const models = modelContract.models;
  const reconciliation = modelContract.reconciliation;
  assert.equal(modelContract.source.productionModels, 2609);
  assert.equal(modelContract.source.publishedModels, 2575);
  assert.equal(models.length, 2609);
  assert.equal(models.filter(model => Number(model.published) === 1).length, 2575);
  assert.equal(models.filter(model => Number(model.published) === 0).length, 34);
  assert.equal(new Set(models.map(model => model.id)).size, 2609);
  assert.equal(new Set(models.map(model => model.slug)).size, 2609);
  assert.equal(new Set(models.map(model => model.code)).size, 2609);
  assert.equal(reconciliation.setCounts.importedCandidateIds, 2596);
  assert.equal(reconciliation.setCounts.sharedCandidateAndPublicIds, 2562);
  assert.equal(reconciliation.setCounts.candidateOnlyIds, 34);
  assert.equal(reconciliation.setCounts.publicOnlyIds, 13);
  assert.match(reconciliation.evidenceInventoryCommit, sha);
  assert.equal(reconciliation.evidenceInventoryPath, 'docs/review/character-catalog-review-queue.csv');
  assert.match(reconciliation.editorialReview, /unverified|não verificad/i);
  assert.ok(models.every(model =>
    !Object.hasOwn(model, 'characterId') &&
    !Object.hasOwn(model, 'biography') &&
    !Object.hasOwn(model, 'identityVerified')),
  'Catalog metadata must not mark editorial character identities verified');
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
  assert.match(o.currentVersionSourceCommit, sha)
  assert.equal(o.observedSourceMainSha, contract.origin.observedMainSha)
  assert.equal(o.runtimeFileChangesBetweenProductionSourceAndObservedMain, 0)
  assert.equal(o.sourceDispatchCanApplyRemoteD1Migrations, true)
  for (const key of [
    'sourceWorkflowDisabledVerified', 'releaseGoApproved',
    'targetProductionCredentialsVerified', 'rollbackTestedAgainstProduction',
    'runtimeCutoverPerformed', 'observationIsApproval',
  ]) assert.equal(typeof o[key], 'boolean', key)
  assert.equal(o.observationIsApproval, false, 'A snapshot cannot be an authorization')
  assert.equal(contract.migration.targetD1MigrationEnabled, false)
});

test('an approved catalog edit is applied only in the existing serial release workflow', () => {
  const workflow = source('.github/workflows/quality.yml');
  const release = workflow.split('  catalog-editorial-apply:')[1];
  assert.ok(release, 'D1 editorial writer must use existing quality workflow');
  assert.match(release, /github.event.action == 'closed'/);
  assert.match(release, /github.event.pull_request.merged == true/);
  assert.match(release, /github.event.pull_request.head.ref == 'editorial\/tonart-admin-review'/);
  // One workflow-level production writer lock shared by both operations.
  assert.match(workflow, /tonart-catalog-production-writer/);
  assert.match(workflow, /cancel-in-progress:[\s\S]*github.event.action == 'closed'/);
  assert.match(release, /cutover-readiness\.mjs --live/);
  assert.match(release, /apply-approved-editorial\.mjs --pr/);
  assert.match(release, /environment: production/);
  assert.doesNotMatch(release, /wrangler d1 migrations/);
  assert.doesNotMatch(release, /wrangler r2 object put/);
});

test('both gallery promotion modes reuse the same M5-gated workflow and resources', () => {
  const workflow = source('.github/workflows/quality.yml');
  assert.match(workflow, /  catalog-gallery-preflight:/);
  assert.match(workflow, /  catalog-gallery-apply:/);
  assert.match(workflow, /inputs.operation == 'gallery-promotion'/);
  assert.match(workflow, /needs: catalog-gallery-preflight/);
  assert.match(workflow, /cutover-readiness\.mjs/);
  assert.match(workflow, /m\['migration'\]\['phase'\]=='cutover-complete'/);
  assert.match(workflow, /apply_exact_source_gallery_promotion\.py/);
  assert.match(workflow, /apply_existing_gallery_promotion\.py/);
  assert.match(workflow, /--production-bucket tonecos-catalogo-media/);
  assert.match(workflow, /environment: production/);
});

test('reviewed batch release reuses Quality Gate and can never bypass completed M5', () => {
  const workflow = source('.github/workflows/quality.yml');
  assert.match(workflow, /  catalog-batch-preflight:/);
  assert.match(workflow, /  catalog-batch-apply:/);
  assert.match(workflow, /inputs.operation == 'data-batch-release'/);
  assert.match(workflow, /needs: catalog-batch-preflight/);
  assert.match(workflow, /cutover-readiness\.mjs/);
  assert.match(workflow, /m\.migration\.phase!=='cutover-complete'/);
  assert.match(workflow, /working-directory: services\/catalogo/);
  assert.match(workflow, /python tools\/publish_d1_new_models\.py/);
  assert.match(workflow, /python tools\/publish_r2_wrangler\.py/);
  assert.match(workflow, /environment: production/);
});

test('target can release only from the existing manual gated workflow', () => {
  const workflow = source('.github/workflows/quality.yml');
  const release = workflow.split('  catalog-cutover-release:')[1];
  assert.ok(release, 'M5 must reuse the existing workflow, not add another publisher');
  assert.match(release, /github\.event_name == 'workflow_dispatch'/);
  assert.match(release, /github\.ref == 'refs\/heads\/main'/);
  assert.match(release, /cutover-readiness\.mjs --live/);
  assert.match(release, /STAGED_WORKER_VERSION_ID\}@0%/);
  assert.match(release, /STAGED_WORKER_VERSION_ID\}@100%/);
  assert.match(release, /wrangler rollback/);
  assert.doesNotMatch(release, /wrangler d1 (migrations|execute)/);
  assert.doesNotMatch(release, /wrangler r2 object put/);
});

test('the canonical plan is discoverable and supersedes the old transfer proposal', () => {
  for (const path of ['README.md', 'AGENTS.md', 'docs/README.md', 'URGENTE.md']) {
    assert.match(source(path), /MIGRACAO_CATALOGO_MONOREPO\.md/, `${path} must link the plan`);
  }
  assert.match(source('docs/MIGRACAO_CATALOGO_MONOREPO.md'), /M0.*M1.*M2.*M3.*M4.*M5.*M6/s);
  assert.doesNotMatch(source('docs/OPERACAO_CLOUDFLARE_PAGES.md'), /Destino desejado:\s*\*\*tonecosstudio\/catalogo/);
});
