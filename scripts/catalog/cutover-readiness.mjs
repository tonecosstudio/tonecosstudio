/**
 * Read-only M5 release gate. Never deploys, changes workflows, accesses D1 or touches R2.
 * An approval flag alone is insufficient: inspect the source writer and live Worker state.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
// The manifest owns source/target identities; staged Wrangler owns Worker resources.
// The offline monorepo guard pins these identities to the approved repository.
const CANONICAL = JSON.parse(readFileSync(join(ROOT, 'config/catalog-code-consolidation.json'), 'utf8'))
const WORKER_CONFIG = JSON.parse(readFileSync(join(ROOT, 'services/catalogo/wrangler.jsonc'), 'utf8'))
const SOURCE_WORKFLOW_ID = CANONICAL.origin.apiDeployWorkflowId
const SOURCE_WORKFLOW_PATH = CANONICAL.origin.apiDeployPipeline
const SOURCE_REPO = CANONICAL.origin.repository
const TARGET_REPO = CANONICAL.target.repository
const TARGET_REPO_ID = CANONICAL.target.repositoryId
const CLOUDFLARE_ACCOUNT_ID = CANONICAL.runtime.cloudflareAccountId
const WORKER_NAME = CANONICAL.runtime.worker
const WORKER_D1 = WORKER_CONFIG.d1_databases?.find(binding => binding.binding === 'DB')
const WORKER_MEDIA = WORKER_CONFIG.r2_buckets?.find(binding => binding.binding === 'MEDIA')

export function assessCutoverReadiness(contract, state) {
  const blockers = []
  const m = contract?.migration ?? {}
  const o = contract?.productionObservation ?? {}
  const observed = state ?? {}
  const workflow = observed.workflow
  const add = (condition, reason) => { if (!condition) blockers.push(reason) }

  add(contract?.origin?.repository === SOURCE_REPO, 'origin_repository_mismatch')
  add(contract?.target?.repository === TARGET_REPO && contract?.target?.repositoryId === TARGET_REPO_ID, 'target_repository_mismatch')
  add(contract?.runtime?.worker === WORKER_NAME && contract?.runtime?.cloudflareAccountId === CLOUDFLARE_ACCOUNT_ID && o.worker === WORKER_NAME && o.cloudflareAccountId === CLOUDFLARE_ACCOUNT_ID, 'worker_authority_mismatch')
  add(
    WORKER_CONFIG.name === WORKER_NAME &&
      WORKER_D1?.database_name === contract?.runtime?.d1 &&
      WORKER_MEDIA?.bucket_name === contract?.runtime?.r2 &&
      WORKER_CONFIG.main === 'worker/entry.ts',
    'staged_worker_config_mismatch',
  )
  add(m.phase === 'cutover-approved', 'cutover_not_approved')
  add(m.releaseAuthorized === true && o.releaseGoApproved === true, 'explicit_release_go_missing')
  add(m.sourceWriterDisabled === true && o.sourceWorkflowDisabledVerified === true, 'source_writer_not_confirmed_disabled')
  add(m.targetWorkerReleaseEnabled === true && contract.activeWorkerPublisher === contract.target?.repository, 'target_not_unique_publisher')
  add(m.targetD1MigrationEnabled === false, 'remote_d1_migrations_must_remain_disabled')
  add(o.targetProductionCredentialsVerified === true, 'target_credentials_unverified')
  add(o.rollbackTestedAgainstProduction === true, 'rollback_not_verified')
  add(workflow?.id === SOURCE_WORKFLOW_ID && workflow?.path === SOURCE_WORKFLOW_PATH, 'github_workflow_identity_unverified')
  add(workflow?.state === 'disabled_manually', 'source_github_workflow_still_enabled')
  add(Number.isInteger(observed.running) && observed.running === 0, 'source_workflow_runs_in_progress_or_unverified')
  add(Number.isInteger(observed.queued) && observed.queued === 0, 'source_workflow_runs_queued_or_unverified')
  add(Number.isInteger(observed.requested) && observed.requested === 0, 'source_workflow_runs_requested_or_unverified')
  add(Number.isInteger(observed.waiting) && observed.waiting === 0, 'source_workflow_runs_waiting_or_unverified')
  add(Number.isInteger(observed.pending) && observed.pending === 0, 'source_workflow_runs_pending_or_unverified')
  add(observed.cloudflareAccountId === CLOUDFLARE_ACCOUNT_ID, 'cloudflare_account_unverified')

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
    db?.type === 'd1' && WORKER_D1?.database_id && db.id === WORKER_D1.database_id,
    'existing_d1_binding_unverified',
  )
  add(
    media?.type === 'r2_bucket' && WORKER_MEDIA?.bucket_name && media.bucket_name === WORKER_MEDIA.bucket_name,
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
  const workflowName = SOURCE_WORKFLOW_PATH.split('/').at(-1)
  const prefix = 'https://api.github.com/repos/' + SOURCE_REPO + '/actions/workflows/' + workflowName
  const ghHeaders = { 'User-Agent': 'tonecos-readonly-cutover-check' }
  const [workflow, active, queued, requested, waiting, pending] = await Promise.all([
    getJSON(prefix, ghHeaders),
    getJSON(prefix + '/runs?status=in_progress&per_page=1', ghHeaders),
    getJSON(prefix + '/runs?status=queued&per_page=1', ghHeaders),
    getJSON(prefix + '/runs?status=requested&per_page=1', ghHeaders),
    getJSON(prefix + '/runs?status=waiting&per_page=1', ghHeaders),
    getJSON(prefix + '/runs?status=pending&per_page=1', ghHeaders),
  ])
  const state = {
    workflow, running: active.total_count, queued: queued.total_count,
    requested: requested.total_count, waiting: waiting.total_count, pending: pending.total_count,
  }
  // No token: still report actual GitHub state, but never infer Cloudflare readiness.
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) return state
  const account = env.CLOUDFLARE_ACCOUNT_ID
  if (account !== CLOUDFLARE_ACCOUNT_ID) throw new Error('cloudflare_account_mismatch')
  const host = 'https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(account) +
    '/workers/scripts/' + WORKER_NAME
  const headers = { Authorization: 'Bearer ' + env.CLOUDFLARE_API_TOKEN }
  const [deploy, settings] = await Promise.all([
    getJSON(host + '/deployments', headers),
    getJSON(host + '/settings', headers),
  ])
  if (deploy.success !== true || settings.success !== true) {
    throw new Error('cloudflare_metadata_not_verified')
  }
  state.cloudflareAccountId = account
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
      sourceRequested: state.requested ?? null,
      sourceWaiting: state.waiting ?? null,
      sourcePending: state.pending ?? null,
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
