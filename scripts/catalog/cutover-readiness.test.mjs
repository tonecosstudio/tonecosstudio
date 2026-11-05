import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { assessCutoverReadiness, inspectLiveReadOnly } from './cutover-readiness.mjs'

const original = JSON.parse(readFileSync(new URL('../../config/catalog-code-consolidation.json', import.meta.url), 'utf8'))
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
  cloudflareAccountId: original.runtime.cloudflareAccountId,
  deployment: structuredClone(deployment), bindings: structuredClone(bindings),
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
    return Response.json(workflow)
  }
  try {
    const state = await inspectLiveReadOnly({})
    assert.equal(state.running, 0)
    assert.equal(state.queued, 0)
    assert.equal(state.requested, 0)
    assert.equal(state.waiting, 0)
    assert.equal(state.pending, 0)
    assert.equal(state.deployment, undefined)
    assert.equal(state.cloudflareAccountId, undefined)
    assert.equal(requests.length, 6)
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
