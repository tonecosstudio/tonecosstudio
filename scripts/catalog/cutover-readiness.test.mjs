import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { assessCutoverReadiness, inspectLiveReadOnly } from './cutover-readiness.mjs'

const original = JSON.parse(readFileSync(new URL('../../config/catalog-code-consolidation.json', import.meta.url), 'utf8'))
const schema = JSON.parse(readFileSync(new URL('../../services/catalogo/config/catalog-schema-contract.json', import.meta.url), 'utf8'))
const showcaseTriggers = schema.requiredObjects.triggers.filter(name => name.startsWith('trg_telegram_showcase_'))
const retiringWriters = original.origin.additionalWriterWorkflows
const writerFromApiUrl = url => retiringWriters.find(
  w => String(url).endsWith('/actions/workflows/' + w.path.split('/').at(-1)))

const workflow = { id: 371358484, path: '.github/workflows/cloudflare.yml', state: 'disabled_manually' }
const deployment = { versions: [{ version_id: original.productionObservation.currentVersionId, percentage: 100 }] }
const bindings = [
  { name: 'DB', type: 'd1', id: '87006366-60f3-4937-af73-2ef5a5f901fb' },
  { name: 'MEDIA', type: 'r2_bucket', bucket_name: 'tonecos-catalogo-media' },
  { name: 'TURNSTILE_SECRET_KEY', type: 'secret_text' },
]

function approvedContract() {
  const v = structuredClone(original)
  v.migration.phase = 'cutover-approved'
  v.migration.releaseAuthorized = true
  v.migration.sourceWriterDisabled = true
  v.migration.targetWorkerReleaseEnabled = true
  v.migration.targetD1MigrationEnabled = false
  v.activeWorkerPublisher = v.target.repository
  v.productionObservation.releaseGoApproved = true
  v.productionObservation.sourceWorkflowDisabledVerified = true
  v.productionObservation.targetProductionCredentialsVerified = true
  v.productionObservation.rollbackTestedAgainstProduction = true
  return v
}
const fullState = () => ({
  workflow: { ...workflow }, running: 0, queued: 0, requested: 0, waiting: 0, pending: 0,
  additionalWriters: retiringWriters.map(w => ({
    id: w.id, path: w.path, state: 'disabled_manually',
    running: 0, queued: 0, requested: 0, waiting: 0, pending: 0,
  })),
  sourceRepositoryId: original.origin.repositoryId,
  sourceRepositoryName: original.origin.repository,
  targetRepositoryId: original.target.repositoryId,
  targetRepositoryName: original.target.repository,
  targetDefaultBranch: 'main',
  sourceMainRef: 'refs/heads/main',
  sourceMainSha: original.origin.observedMainSha,
  sourceFix: {
    number: original.staging.sourceFixPullRequest,
    state: 'closed', draft: false, merged: true,
    headSha: original.staging.sourceFixMergedHead,
    mergeCommitSha: original.staging.sourceFixMergeCommit,
    baseSha: original.staging.sourceFixBaseShaAtMerge,
    headRepo: original.origin.repository,
  },
  sourceMediaBlobSha: original.staging.fileBlobs['worker/media.ts'],
  cloudflareAccountId: original.runtime.cloudflareAccountId,
  deployment: structuredClone(deployment), bindings: structuredClone(bindings),
  showcaseSchema: {
    column: 'telegram_showcase_visible',
    migration: schema.latestMigration,
    triggers: [...showcaseTriggers],
  },
})

test('current M5 state stays BLOCKED, even with a disabled source workflow', () => {
  const result = assessCutoverReadiness(original, fullState())
  assert.equal(result.ready, false)
  assert.ok(result.blockers.includes('cutover_not_approved'))
  assert.ok(result.blockers.includes('explicit_release_go_missing'))
  assert.ok(result.blockers.includes('target_credentials_unverified'))
})

test('an approved flag cannot override an active source workflow', () => {
  const state = fullState()
  state.workflow.state = 'active'
  const result = assessCutoverReadiness(approvedContract(), state)
  assert.equal(result.ready, false)
  assert.ok(result.blockers.includes('source_github_workflow_still_enabled'))
})

test('all retiring D1/R2 writers must be disabled administratively with empty queues', () => {
  assert.equal(retiringWriters.length, 4)
  for (const w of retiringWriters) {
    const active = fullState()
    active.additionalWriters.find(x => x.id === w.id).state = 'active'
    const result = assessCutoverReadiness(approvedContract(), active)
    assert.equal(result.ready, false)
    assert.ok(result.blockers.includes('source_additional_writers_active_or_unverified'))
    for (const status of ['running', 'queued', 'requested', 'waiting', 'pending']) {
      const busy = fullState()
      busy.additionalWriters.find(x => x.id === w.id)[status] = 1
      const blocked = assessCutoverReadiness(approvedContract(), busy)
      assert.ok(blocked.blockers.includes('source_additional_writers_active_or_unverified'))
    }
  }
  const missing = fullState()
  missing.additionalWriters.pop()
  assert.ok(assessCutoverReadiness(approvedContract(), missing).blockers.includes('source_additional_writers_active_or_unverified'))
  const invalidContract = approvedContract()
  invalidContract.origin.additionalWriterWorkflows.pop()
  assert.ok(assessCutoverReadiness(invalidContract, fullState()).blockers.includes('source_additional_writers_active_or_unverified'))
})

test('the live Telegram showcase schema must precede any Worker promotion', () => {
  const fixture = fullState()
  for (const mutation of [
    state => { delete state.showcaseSchema },
    state => { state.showcaseSchema.column = null },
    state => { state.showcaseSchema.migration = null },
    state => { state.showcaseSchema.triggers.pop() },
  ]) {
    const altered = structuredClone(fixture)
    mutation(altered)
    const verdict = assessCutoverReadiness(approvedContract(), altered)
    assert.equal(verdict.ready, false)
    assert.ok(verdict.blockers.includes('telegram_showcase_migration_0025_unverified'))
  }
})

test('Cloudflare schema inspection is metadata-only and never runs DDL or model scans', async () => {
  const previous = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, init) => {
    const u = String(url)
    calls.push({ url: u, method: init.method, body: init.body })
    if (u.endsWith('/repos/' + original.origin.repository)) {
      return Response.json({ id: original.origin.repositoryId, full_name: original.origin.repository })
    }
    if (u.endsWith('/repos/' + original.target.repository)) {
      return Response.json({ id: original.target.repositoryId,
        full_name: original.target.repository, default_branch: 'main' })
    }
    if (u.endsWith('/git/ref/heads/main')) {
      return Response.json({ ref: 'refs/heads/main', object: { sha: original.origin.observedMainSha } })
    }
    if (u.endsWith('/pulls/' + original.staging.sourceFixPullRequest)) {
      return Response.json({ number: original.staging.sourceFixPullRequest,
        state: 'closed', draft: false, merged: true,
        merge_commit_sha: original.staging.sourceFixMergeCommit,
        head: { sha: original.staging.sourceFixMergedHead, repo: { full_name: original.origin.repository } },
        base: { sha: original.staging.sourceFixBaseShaAtMerge } })
    }
    if (u.includes('/contents/worker/media.ts?ref=main')) {
      return Response.json({ sha: original.staging.fileBlobs['worker/media.ts'] })
    }
    if (u.includes('/runs?status=')) return Response.json({ total_count: 0 })
    if (u.startsWith('https://api.github.com/')) {
      const writer = writerFromApiUrl(u)
      return Response.json(writer ? { id: writer.id, path: writer.path, state: 'disabled_manually' } : workflow)
    }
    if (u.endsWith('/deployments')) {
      return Response.json({ success: true, result: { deployments: [structuredClone(deployment)] } })
    }
    if (u.endsWith('/settings')) {
      return Response.json({ success: true, result: { bindings: structuredClone(bindings) } })
    }
    if (u.endsWith('/query')) {
      assert.equal(init.method, 'POST')
      assert.equal(init.headers.Authorization, 'Bearer test-cloudflare-key')
      const { sql } = JSON.parse(init.body)
      assert.match(sql, /^SELECT 'column' AS category,name FROM pragma_table_info\('models'\)/)
      assert.match(sql, /FROM d1_migrations WHERE name=/)
      assert.match(sql, /FROM sqlite_master WHERE type='trigger'/)
      assert.ok(!/\b(UPDATE|DELETE|INSERT|ALTER|DROP|REPLACE)\s+(?:TABLE|INTO|models|FROM)\b/i.test(sql))
      assert.ok(!/FROM\s+models\b/i.test(sql))
      return Response.json({ success: true, result: [{ results: [
        { category: 'column', name: 'telegram_showcase_visible' },
        { category: 'migration', name: schema.latestMigration },
        ...showcaseTriggers.map(name => ({ category: 'trigger', name })),
      ] }] })
    }
    throw Error('Unexpected preflight URL ' + u)
  }
  try {
    const state = await inspectLiveReadOnly({
      GITHUB_TOKEN: 'test-github-key', CLOUDFLARE_API_TOKEN: 'test-cloudflare-key',
      CLOUDFLARE_ACCOUNT_ID: original.runtime.cloudflareAccountId,
    })
    assert.equal(state.showcaseSchema.migration, schema.latestMigration)
    assert.equal(state.showcaseSchema.column, 'telegram_showcase_visible')
    assert.deepEqual(state.showcaseSchema.triggers, showcaseTriggers)
    assert.equal(calls.filter(x => x.method === 'POST').length, 1)
    assert.equal(calls.filter(x => x.url.endsWith('/query')).length, 1)
  } finally {
    globalThis.fetch = previous
  }
})

test('source activity, drift or missing live bindings block the cutover', () => {
  const state = fullState()
  state.running = 1
  state.deployment.versions[0].version_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
  state.bindings = state.bindings.filter(x => x.name !== 'TURNSTILE_SECRET_KEY')
  const result = assessCutoverReadiness(approvedContract(), state)
  assert.equal(result.ready, false)
  assert.ok(result.blockers.includes('source_workflow_runs_in_progress_or_unverified'))
  assert.ok(result.blockers.includes('cloudflare_active_version_unverified_or_changed'))
  assert.ok(result.blockers.includes('turnstile_secret_presence_unverified'))
})

test('a fully verified offline fixture can pass without performing any release', () => {
  const result = assessCutoverReadiness(approvedContract(), fullState())
  assert.deepEqual(result, { ready: true, blockers: [] })
})

test('D1 migration enabling remains a blocker even with all other checks passing', () => {
  const c = approvedContract()
  c.migration.targetD1MigrationEnabled = true
  const result = assessCutoverReadiness(c, fullState())
  assert.equal(result.ready, false)
  assert.ok(result.blockers.includes('remote_d1_migrations_must_remain_disabled'))
})


test('all non-terminal GitHub workflow states fail closed', () => {
  for (const status of ['requested', 'waiting', 'pending']) {
    const state = fullState()
    state[status] = 1
    const result = assessCutoverReadiness(approvedContract(), state)
    assert.equal(result.ready, false, 'unexpected READY for ' + status)
    assert.ok(result.blockers.includes('source_workflow_runs_' + status + '_or_unverified'))
    delete state[status]
    const unknown = assessCutoverReadiness(approvedContract(), state)
    assert.equal(unknown.ready, false, 'missing status must fail closed: ' + status)
  }
})

test('mismatched authority or rollback without proof blocks promotion', () => {
  const c = approvedContract()
  c.target.repository = 'unexpected/other-repository'
  c.productionObservation.rollbackTestedAgainstProduction = false
  const state = fullState()
  state.cloudflareAccountId = 'another-account'
  const result = assessCutoverReadiness(c, state)
  assert.equal(result.ready, false)
  assert.ok(result.blockers.includes('target_repository_mismatch'))
  assert.ok(result.blockers.includes('rollback_not_verified'))
  assert.ok(result.blockers.includes('cloudflare_account_unverified'))
})

test('read-only inspection queries every non-terminal GitHub status without Cloudflare credentials', async () => {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, options) => {
    assert.equal(options.method, 'GET')
    requests.push(String(url))
    if (String(url).includes('/runs?status=')) {
      return Response.json({ total_count: 0 })
    }
    if (String(url).includes('/contents/worker/media.ts?ref=main')) {
      return Response.json({ sha: original.staging.fileBlobs['worker/media.ts'] })
    }
    if (String(url).endsWith('/git/ref/heads/main')) {
      return Response.json({ ref: 'refs/heads/main', object: { sha: original.origin.observedMainSha } })
    }
    if (String(url).endsWith('/pulls/' + original.staging.sourceFixPullRequest)) {
      return Response.json({
        number: original.staging.sourceFixPullRequest,
        state: 'closed', draft: false, merged: true,
        merge_commit_sha: original.staging.sourceFixMergeCommit,
        head: { sha: original.staging.sourceFixMergedHead, repo: { full_name: original.origin.repository } },
        base: { sha: original.staging.sourceFixBaseShaAtMerge },
      })
    }
    if (String(url).endsWith('/repos/' + original.origin.repository)) {
      return Response.json({ id: original.origin.repositoryId, full_name: original.origin.repository })
    }
    if (String(url).endsWith('/repos/' + original.target.repository)) {
      return Response.json({
        id: original.target.repositoryId,
        full_name: original.target.repository,
        default_branch: 'main',
      })
    }
    const writer = writerFromApiUrl(url)
    return Response.json(writer ? { id: writer.id, path: writer.path, state: 'disabled_manually' } : workflow)
  }
  try {
    const state = await inspectLiveReadOnly({})
    assert.equal(state.running, 0)
    assert.equal(state.queued, 0)
    assert.equal(state.requested, 0)
    assert.equal(state.waiting, 0)
    assert.equal(state.pending, 0)
    assert.equal(state.additionalWriters.length, retiringWriters.length)
    assert.ok(state.additionalWriters.every(x => x.state === 'disabled_manually' && x.pending === 0))
    assert.equal(state.deployment, undefined)
    assert.equal(state.cloudflareAccountId, undefined)
    assert.equal(requests.length, 11 + 6 * retiringWriters.length)
    assert.equal(state.targetRepositoryId, original.target.repositoryId)
    assert.equal(state.targetDefaultBranch, 'main')
    assert.ok(requests.some(url => url.endsWith('/repos/' + original.target.repository)))
    assert.equal(state.sourceFix.headSha, original.staging.sourceFixMergedHead)
    assert.equal(state.sourceFix.mergeCommitSha, original.staging.sourceFixMergeCommit)
    assert.equal(state.sourceMediaBlobSha, original.staging.fileBlobs['worker/media.ts'])
    assert.ok(requests.some(url => url.endsWith('/pulls/' + original.staging.sourceFixPullRequest)))
    assert.equal(state.sourceMainSha, original.origin.observedMainSha)
    assert.equal(state.sourceRepositoryId, original.origin.repositoryId)
    assert.ok(requests.some(url => url.endsWith('/git/ref/heads/main')))
    for (const status of ['in_progress', 'queued', 'requested', 'waiting', 'pending']) {
      assert.ok(requests.some(url => url.includes('/runs?status=' + status + '&')))
    }
    assert.ok(requests.every(url => url.startsWith('https://api.github.com/')))
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('staged Wrangler and runtime manifest must name the same D1, R2 and Worker', () => {
  const changed = approvedContract()
  changed.runtime.d1 = 'unexpected-database'
  changed.runtime.r2 = 'unexpected-bucket'
  const result = assessCutoverReadiness(changed, fullState())
  assert.equal(result.ready, false)
  assert.ok(result.blockers.includes('staged_worker_config_mismatch'))
})

test('the source workflow ID must match the single canonical manifest', () => {
  const changed = approvedContract()
  changed.origin.apiDeployWorkflowId = 0
  const result = assessCutoverReadiness(changed, fullState())
  assert.equal(result.ready, false)
  assert.ok(result.blockers.includes('github_workflow_identity_unverified'))
})

test('source main drift and missing or inconsistent pinned SHAs fail closed', () => {
  const state = fullState()
  state.sourceMainSha = '0000000000000000000000000000000000000000'
  const drift = assessCutoverReadiness(approvedContract(), state)
  assert.equal(drift.ready, false)
  assert.ok(drift.blockers.includes('source_main_drift_or_unverified'))

  const contract = approvedContract()
  contract.staging.sourceMain = '0000000000000000000000000000000000000000'
  const staleManifest = assessCutoverReadiness(contract, fullState())
  assert.equal(staleManifest.ready, false)
  assert.ok(staleManifest.blockers.includes('source_main_drift_or_unverified'))

  const withoutObservation = fullState()
  delete withoutObservation.sourceMainSha
  assert.ok(assessCutoverReadiness(approvedContract(), withoutObservation).blockers.includes('source_main_drift_or_unverified'))
})

test('source repository ID and canonical name must match GitHub metadata', () => {
  const state = fullState()
  state.sourceRepositoryId += 1
  assert.ok(assessCutoverReadiness(approvedContract(), state).blockers.includes('source_repository_identity_unverified'))
  const renamed = fullState()
  renamed.sourceRepositoryName = 'unverified/catalogo'
  assert.ok(assessCutoverReadiness(approvedContract(), renamed).blockers.includes('source_repository_identity_unverified'))
})

test('merged source media fix must match canonical merged head, original base and source blob', () => {
  const changed = fullState()
  changed.sourceFix.headSha = '0000000000000000000000000000000000000000'
  assert.ok(assessCutoverReadiness(approvedContract(), changed).blockers.includes('source_media_patch_drift_or_unverified'))

  const retargeted = fullState()
  retargeted.sourceFix.baseSha = '1111111111111111111111111111111111111111'
  assert.ok(assessCutoverReadiness(approvedContract(), retargeted).blockers.includes('source_media_patch_drift_or_unverified'))

  const changedMerge = fullState()
  changedMerge.sourceFix.mergeCommitSha = 'ffffffffffffffffffffffffffffffffffffffff'
  assert.ok(assessCutoverReadiness(approvedContract(), changedMerge).blockers.includes('source_media_patch_drift_or_unverified'))

  const changedBlob = fullState()
  changedBlob.sourceMediaBlobSha = '0000000000000000000000000000000000000000'
  assert.ok(assessCutoverReadiness(approvedContract(), changedBlob).blockers.includes('source_media_patch_drift_or_unverified'))

  const missing = fullState()
  delete missing.sourceFix
  assert.ok(assessCutoverReadiness(approvedContract(), missing).blockers.includes('source_media_patch_drift_or_unverified'))
})

test('unmerged, open, or draft source patch cannot pass reconciliation', () => {
  for (const mutation of [
    { state: 'open' }, { merged: false }, { draft: true },
    { headRepo: 'someone-else/catalogo' },
  ]) {
    const observed = fullState()
    Object.assign(observed.sourceFix, mutation)
    assert.ok(
      assessCutoverReadiness(approvedContract(), observed).blockers.includes('source_media_patch_drift_or_unverified'),
      JSON.stringify(mutation),
    )
  }
})

test('the private target repository identity is confirmed from GitHub, not only local pins', () => {
  for (const change of [
    { targetRepositoryId: original.target.repositoryId + 1 },
    { targetRepositoryName: 'unexpected/other' },
    { targetDefaultBranch: 'development' },
  ]) {
    const state = { ...fullState(), ...change }
    const result = assessCutoverReadiness(approvedContract(), state)
    assert.equal(result.ready, false)
    assert.ok(result.blockers.includes('target_repository_mismatch'))
  }
  const absent = fullState()
  delete absent.targetRepositoryId
  assert.ok(assessCutoverReadiness(approvedContract(), absent).blockers.includes('target_repository_mismatch'))
})

test('a read-only GitHub token is used only for metadata GET requests', async () => {
  const savedFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), method: init.method, token: init.headers.Authorization })
    if (String(url).endsWith('/repos/' + original.target.repository)) {
      return Response.json({ id: original.target.repositoryId, full_name: original.target.repository, default_branch: 'main' })
    }
    if (String(url).endsWith('/repos/' + original.origin.repository)) {
      return Response.json({ id: original.origin.repositoryId, full_name: original.origin.repository })
    }
    if (String(url).includes('/contents/worker/media.ts?ref=main')) {
      return Response.json({ sha: original.staging.fileBlobs['worker/media.ts'] })
    }
    if (String(url).endsWith('/git/ref/heads/main')) {
      return Response.json({ ref: 'refs/heads/main', object: { sha: original.origin.observedMainSha } })
    }
    if (String(url).endsWith('/pulls/' + original.staging.sourceFixPullRequest)) {
      return Response.json({
        number: original.staging.sourceFixPullRequest, state: 'closed', draft: false, merged: true,
        merge_commit_sha: original.staging.sourceFixMergeCommit,
        head: { sha: original.staging.sourceFixMergedHead, repo: { full_name: original.origin.repository } },
        base: { sha: original.staging.sourceFixBaseShaAtMerge },
      })
    }
    if (String(url).includes('/runs?status=')) return Response.json({ total_count: 0 })
    const writer = writerFromApiUrl(url)
    return Response.json(writer ? { id: writer.id, path: writer.path, state: 'disabled_manually' } : workflow)
  }
  try {
    const state = await inspectLiveReadOnly({ GITHUB_TOKEN: 'test-github-token' })
    assert.equal(state.targetRepositoryId, original.target.repositoryId)
    assert.equal(requests.length, 11 + 6 * retiringWriters.length)
    assert.ok(requests.every(r => r.method === 'GET' && r.token === 'Bearer test-github-token'))
    assert.ok(requests.every(r => r.url.startsWith('https://api.github.com/')))
  } finally {
    globalThis.fetch = savedFetch
  }
})
