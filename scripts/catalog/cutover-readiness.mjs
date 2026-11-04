/**
 * Read-only M5 release gate. Never deploys, changes workflows, accesses D1 or touches R2.
 * An approval flag alone is insufficient: inspect the source writer and live Worker state.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const SOURCE_WORKFLOW_ID = 371358484
const SOURCE_WORKFLOW_PATH = '.github/workflows/cloudflare.yml'
const SOURCE_REPO = 'washingtonmsdj/catalogo'

export function assessCutoverReadiness(contract, state) {
  const blockers = []
  const m = contract?.migration ?? {}
  const o = contract?.productionObservation ?? {}
  const observed = state ?? {}
  const workflow = observed.workflow
  const add = (condition, reason) => { if (!condition) blockers.push(reason) }

  add(contract?.origin?.repository === SOURCE_REPO, 'origin_repository_mismatch')
  add(m.phase === 'cutover-approved', 'cutover_not_approved')
  add(m.releaseAuthorized === true && o.releaseGoApproved === true, 'explicit_release_go_missing')
  add(m.sourceWriterDisabled === true && o.sourceWorkflowDisabledVerified === true, 'source_writer_not_confirmed_disabled')
  add(m.targetWorkerReleaseEnabled === true && contract.activeWorkerPublisher === contract.target?.repository, 'target_not_unique_publisher')
  add(m.targetD1MigrationEnabled === false, 'remote_d1_migrations_must_remain_disabled')
  add(o.targetProductionCredentialsVerified === true, 'target_credentials_unverified')
  add(workflow?.id === SOURCE_WORKFLOW_ID && workflow?.path === SOURCE_WORKFLOW_PATH, 'github_workflow_identity_unverified')
  add(workflow?.state === 'disabled_manually', 'source_github_workflow_still_enabled')
  add(Number.isInteger(observed.running) && observed.running === 0, 'source_workflow_runs_in_progress_or_unverified')
  add(Number.isInteger(observed.queued) && observed.queued === 0, 'source_workflow_runs_queued_or_unverified')

  const deployment = observed.deployment
  const traffic = deployment?.versions
  add(
    Array.isArray(traffic) && traffic.length === 1 &&
      traffic[0]?.percentage === 100 &&
      traffic[0]?.version_id === o.currentVersionId,
    'cloudflare_active_version_unverified_or_changed',
  )

  const bindings = observed.bindings
  const findBinding = name => Array.isArray(bindings) ? bindings.find(x => x.name === name) : undefined
  const db = findBinding('DB')
  const media = findBinding('MEDIA')
  const turnstile = findBinding('TURNSTILE_SECRET_KEY')
  add(
    db?.type === 'd1' && db.id === '87006366-60f3-4937-af73-2ef5a5f901fb',
    'existing_d1_binding_unverified',
  )
  add(
    media?.type === 'r2_bucket' && media.bucket_name === contract?.runtime?.r2,
    'existing_r2_binding_unverified',
  )
  add(turnstile?.type === 'secret_text', 'turnstile_secret_presence_unverified')

  return { ready: blockers.length === 0, blockers }
}

async function getJSON(url, headers = {}) {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('readonly_api_http_' + response.status)
  return response.json()
}

export async function inspectLiveReadOnly(env = process.env) {
  const prefix = 'https://api.github.com/repos/' + SOURCE_REPO + '/actions/workflows/cloudflare.yml'
  const ghHeaders = { 'User-Agent': 'tonecos-readonly-cutover-check' }
  const [workflow, active, queued] = await Promise.all([
    getJSON('https://api.github.com/repos/' + SOURCE_REPO + '/actions/workflows/cloudflare.yml', ghHeaders),
    getJSON(prefix + '/runs?status=in_progress&per_page=1', ghHeaders),
    getJSON(prefix + '/runs?status=queued&per_page=1', ghHeaders),
  ])
  const state = { workflow, running: active.total_count, queued: queued.total_count }
  // No token: still report actual GitHub state, but never infer Cloudflare readiness.
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) return state
  const account = env.CLOUDFLARE_ACCOUNT_ID
  const host = 'https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(account) +
    '/workers/scripts/tonecos-catalogo-api'
  const headers = { Authorization: 'Bearer ' + env.CLOUDFLARE_API_TOKEN }
  const [deploy, settings] = await Promise.all([
    getJSON(host + '/deployments', headers),
    getJSON(host + '/settings', headers),
  ])
  if (deploy.success !== true || settings.success !== true) {
    throw new Error('cloudflare_metadata_not_verified')
  }
  state.deployment = (deploy.result?.deployments ?? [])[0]
  state.bindings = settings.result?.bindings
  return state
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--live') {
    console.error('Read-only gate: use --live. No deployment option exists.')
    process.exitCode = 2
    return
  }
  const contract = JSON.parse(readFileSync(join(ROOT, 'config/catalog-code-consolidation.json'), 'utf8'))
  try {
    const state = await inspectLiveReadOnly()
    const verdict = assessCutoverReadiness(contract, state)
    console.log(JSON.stringify({
      status: verdict.ready ? 'READY_FOR_SEPARATELY_AUTHORIZED_CUTOVER' : 'BLOCKED',
      sourceWorkflow: state.workflow?.state ?? 'unverified',
      sourceInProgress: state.running ?? null,
      sourceQueued: state.queued ?? null,
      liveWorkerVersionId: state.deployment?.versions?.[0]?.version_id ?? null,
      blockers: verdict.blockers,
    }, null, 2))
    if (!verdict.ready) process.exitCode = 2
  } catch (error) {
    console.log(JSON.stringify({ status: 'BLOCKED', blockers: [
      'live_preflight_unavailable_' + (error?.message ?? 'unknown'),
    ] }, null, 2))
    process.exitCode = 2
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main()
}
