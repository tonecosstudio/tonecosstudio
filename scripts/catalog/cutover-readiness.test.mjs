import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { assessCutoverReadiness } from './cutover-readiness.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
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
  return v
}
const fullState = () => ({
  workflow: { ...workflow }, running: 0, queued: 0,
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
