/** Fail-closed, zero-network contract for Tonecos' single-repository migration. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
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
  assert.equal(contract.activeWorkerPublisher, contract.origin.repository);
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
  assert.equal(graph.observedAtSha, contract.origin.observedMainSha);
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
  assert.equal(contract.migration.targetWorkerReleaseEnabled, false);
});

test('only the existing Cloudflare resources may serve requests', () => {
  assert.equal(contract.runtime.cloudflarePages, 'tonecosstudio');
  assert.equal(contract.runtime.worker, 'tonecos-catalogo-api');
  assert.equal(contract.runtime.pagesServiceBinding, 'CATALOG_WORKER');
  assert.equal(contract.runtime.d1, 'tonecos-catalogo');
  assert.equal(contract.runtime.r2, 'tonecos-catalogo-media');
  assert.match(source('functions/catalogo-api/[[path]].js'), /CATALOG_WORKER/);
  assert.ok(!existsSync(join(root,'wrangler.jsonc')), 'No active root Wrangler config for a second Worker');
  assert.ok(!existsSync(join(root,'worker')), 'Legacy Worker should not be copied into the site root');
  assert.ok(!existsSync(join(root,'migrations')), 'D1 must not overlap with root migrations');
});

test('an unapproved or incomplete migration cannot switch publishers or enable writes', () => {
  const m = contract.migration;
  assert.ok(['inventoried','staged-offline','cutover-approved','cutover-complete'].includes(m.phase));
  assert.equal(typeof m.releaseAuthorized, 'boolean');
  assert.equal(typeof m.sourceWriterDisabled, 'boolean');
  assert.equal(typeof m.targetWorkerReleaseEnabled, 'boolean');
  assert.equal(typeof m.targetD1MigrationEnabled, 'boolean');
  assert.equal(typeof m.legacySiteRetired, 'boolean');
  assert.equal(typeof m.sourceRepoArchived, 'boolean');
  const servicePresent = existsSync(join(root,contract.target.serviceRoot));
  if (m.phase === 'inventoried') {
    assert.equal(servicePresent, false, 'No speculative shadow copy before source PR reconciliation');
    assert.equal(m.releaseAuthorized, false);
    assert.equal(m.targetWorkerReleaseEnabled, false);
    assert.equal(m.targetD1MigrationEnabled, false);
  } else {
    assert.equal(servicePresent, true, 'Source must be physically migrated and verified first');
  }
  if (m.phase !== 'cutover-complete') {
    assert.equal(contract.activeWorkerPublisher, contract.origin.repository);
    assert.equal(m.targetWorkerReleaseEnabled, false);
    assert.equal(m.targetD1MigrationEnabled, false);
    assert.equal(m.sourceWriterDisabled, false);
    assert.equal(m.legacySiteRetired, false);
    assert.equal(m.sourceRepoArchived, false);
  } else {
    assert.equal(contract.activeWorkerPublisher, contract.target.repository);
    assert.equal(m.releaseAuthorized, true);
    assert.equal(m.sourceWriterDisabled, true);
    assert.equal(m.targetWorkerReleaseEnabled, true);
  }
});

test('the canonical plan is discoverable and supersedes the old transfer proposal', () => {
  for (const path of ['README.md', 'AGENTS.md', 'docs/README.md', 'URGENTE.md']) {
    assert.match(source(path), /MIGRACAO_CATALOGO_MONOREPO\.md/, `${path} must link the plan`);
  }
  assert.match(source('docs/MIGRACAO_CATALOGO_MONOREPO.md'), /M0.*M1.*M2.*M3.*M4.*M5.*M6/s);
  assert.doesNotMatch(source('docs/OPERACAO_CLOUDFLARE_PAGES.md'), /Destino desejado:\s*\*\*tonecosstudio\/catalogo/);
});
