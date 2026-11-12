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
const SOURCE_REPO_ID = CANONICAL.origin.repositoryId
const SOURCE_MAIN_SHA = CANONICAL.origin.observedMainSha
const SOURCE_FIX_PR = CANONICAL.staging.sourceFixPullRequest
const SOURCE_FIX_HEAD = CANONICAL.staging.sourceFixMergedHead
const SOURCE_FIX_MERGE_SHA = CANONICAL.staging.sourceFixMergeCommit
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
  const continuingRelease = m.phase === 'cutover-complete'

  if (!continuingRelease) {
  add(contract?.origin?.repository === SOURCE_REPO, 'origin_repository_mismatch')
  // GitHub repository identity and exact source HEAD must be observed, not inferred
  // from a stale import manifest. No D1/R2 request is made by these checks.
  add(
    contract?.origin?.repositoryId === SOURCE_REPO_ID &&
      observed.sourceRepositoryId === SOURCE_REPO_ID &&
      observed.sourceRepositoryName === SOURCE_REPO,
    'source_repository_identity_unverified',
  )
  add(
    typeof SOURCE_MAIN_SHA === 'string' && /^[0-9a-f]{40}$/.test(SOURCE_MAIN_SHA) &&
      contract?.origin?.observedMainSha === SOURCE_MAIN_SHA &&
      contract?.staging?.sourceMain === SOURCE_MAIN_SHA &&
      o.observedSourceMainSha === SOURCE_MAIN_SHA &&
      observed.sourceMainRef === 'refs/heads/main' &&
      observed.sourceMainSha === SOURCE_MAIN_SHA,
    'source_main_drift_or_unverified',
  )
  // PR #266 is now merged. Verify its exact merged head and the media blob
  // actually present on the current source main; historical draft status is
  // not a live readiness condition. No D1 or R2 reads are performed.
  const patch = observed.sourceFix
  add(
    Number.isInteger(SOURCE_FIX_PR) && SOURCE_FIX_PR > 0 &&
      typeof SOURCE_FIX_HEAD === 'string' && /^[0-9a-f]{40}$/.test(SOURCE_FIX_HEAD) &&
      typeof SOURCE_FIX_MERGE_SHA === 'string' && /^[0-9a-f]{40}$/.test(SOURCE_FIX_MERGE_SHA) &&
      contract?.staging?.sourceFixPullRequest === SOURCE_FIX_PR &&
      contract?.staging?.sourceFixStatusAtReconciliation === 'merged-in-main' &&
      patch?.number === SOURCE_FIX_PR && patch?.state === 'closed' &&
      patch?.draft === false && patch?.merged === true &&
      patch?.headSha === SOURCE_FIX_HEAD &&
      patch?.mergeCommitSha === SOURCE_FIX_MERGE_SHA &&
      patch?.headRepo === SOURCE_REPO &&
      observed.sourceMediaBlobSha === contract?.staging?.fileBlobs?.['worker/media.ts'],
    'source_media_patch_not_merged_or_unverified',
  )
  add(contract?.origin?.apiDeployWorkflowId === SOURCE_WORKFLOW_ID && contract?.origin?.apiDeployPipeline === SOURCE_WORKFLOW_PATH, 'github_workflow_identity_unverified')
  }
  add(
    contract?.target?.repository === TARGET_REPO &&
      contract?.target?.repositoryId === TARGET_REPO_ID &&
      observed.targetRepositoryName === TARGET_REPO &&
      observed.targetRepositoryId === TARGET_REPO_ID &&
      observed.targetDefaultBranch === 'main',
    'target_repository_mismatch',
  )
  add(contract?.runtime?.worker === WORKER_NAME && contract?.runtime?.cloudflareAccountId === CLOUDFLARE_ACCOUNT_ID && o.worker === WORKER_NAME && o.cloudflareAccountId === CLOUDFLARE_ACCOUNT_ID, 'worker_authority_mismatch')
  add(
    WORKER_CONFIG.name === WORKER_NAME &&
      WORKER_D1?.database_name === contract?.runtime?.d1 &&
      WORKER_MEDIA?.bucket_name === contract?.runtime?.r2 &&
      WORKER_CONFIG.main === 'worker/entry.ts',
    'staged_worker_config_mismatch',
  )
  if (continuingRelease) {
    // Once M5 has been verified and committed, Washington is historical
    // provenance only. No future release may need its GitHub availability.
    add(m.releaseAuthorized === true && o.releaseGoApproved === true &&
      m.sourceWriterDisabled === true && o.sourceWorkflowDisabledVerified === true &&
      m.targetWorkerReleaseEnabled === true && o.runtimeCutoverPerformed === true &&
      contract.activeWorkerPublisher === TARGET_REPO,
    'completed_target_authority_unverified')
  } else {
    add(m.phase === 'cutover-approved', 'cutover_not_approved')
    add(m.releaseAuthorized === true && o.releaseGoApproved === true, 'explicit_release_go_missing')
    add(m.sourceWriterDisabled === true && o.sourceWorkflowDisabledVerified === true, 'source_writer_not_confirmed_disabled')
    add(m.targetWorkerReleaseEnabled === true && contract.activeWorkerPublisher === contract.target?.repository, 'target_not_unique_publisher')
  }
  add(m.targetD1MigrationEnabled === false, 'remote_d1_migrations_must_remain_disabled')
  add(o.targetProductionCredentialsVerified === true, 'target_credentials_unverified')
  add(o.rollbackTestedAgainstProduction === true, 'rollback_not_verified')
  if (!continuingRelease) {
  add(workflow?.id === SOURCE_WORKFLOW_ID && workflow?.path === SOURCE_WORKFLOW_PATH, 'github_workflow_identity_unverified')
  add(workflow?.state === 'disabled_manually', 'source_github_workflow_still_enabled')
  add(Number.isInteger(observed.running) && observed.running === 0, 'source_workflow_runs_in_progress_or_unverified')
  add(Number.isInteger(observed.queued) && observed.queued === 0, 'source_workflow_runs_queued_or_unverified')
  add(Number.isInteger(observed.requested) && observed.requested === 0, 'source_workflow_runs_requested_or_unverified')
  add(Number.isInteger(observed.waiting) && observed.waiting === 0, 'source_workflow_runs_waiting_or_unverified')
  add(Number.isInteger(observed.pending) && observed.pending === 0, 'source_workflow_runs_pending_or_unverified')
  // The original repository has FOUR more D1/R2 writers than cloudflare.yml.
  // Checking only the main Worker workflow is insufficient to transfer ownership.
  const writers = contract?.origin?.additionalWriterWorkflows
  const liveWriters = observed.additionalWriters
  add(Array.isArray(writers) && writers.length === 4 &&
    new Set(writers.map(row => row.path)).size === 4 &&
    Array.isArray(liveWriters) && liveWriters.length === writers.length &&
    writers.every(writer => {
      const live = liveWriters.find(item => item?.path === writer.path)
      return live?.id === writer.id && live?.state === 'disabled_manually' &&
        ['running','queued','requested','waiting','pending'].every(
          status => Number.isInteger(live[status]) && live[status] === 0)
    }), 'source_additional_writers_active_or_unverified')
  }
  add(observed.cloudflareAccountId === CLOUDFLARE_ACCOUNT_ID, 'cloudflare_account_unverified')

  const deployment = observed.deployment
  const traffic = deployment?.versions
  add(
    Array.isArray(traffic) && traffic.length === 1 &&
      traffic[0]?.percentage === 100 &&
      (continuingRelease ? /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(traffic[0]?.version_id ?? '')
        : traffic[0]?.version_id === o.currentVersionId),
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

export async function inspectLiveReadOnly(env = process.env, contract = CANONICAL) {
  const workflowName = SOURCE_WORKFLOW_PATH.split('/').at(-1)
  const sourceUrl = 'https://api.github.com/repos/' + SOURCE_REPO
  const prefix = sourceUrl + '/actions/workflows/' + workflowName
  // The GITHUB_TOKEN provided to TONART Actions is scoped to the private
  // target repo and may be denied access to unrelated repository resources.
  // Read the public source using GitHub's anonymous API and send the scoped
  // installation token ONLY to TONART. Do not leak target credentials to a
  // retiring publisher or require permanent Washington credentials.
  const sourceHeaders = { 'User-Agent': 'tonart-source-cutover-readonly' }
  const targetHeaders = { 'User-Agent': 'tonart-target-cutover-readonly' }
  const githubToken = env.GITHUB_TOKEN || env.GH_TOKEN
  if (githubToken) targetHeaders.Authorization = 'Bearer ' + githubToken
  let state
  if (contract?.migration?.phase === 'cutover-complete') {
    // The definitive owner is TONART. Do not query the retired publisher on
    // routine releases, even to test its availability.
    const targetRepo = await getJSON('https://api.github.com/repos/' + TARGET_REPO, targetHeaders)
    state = {
      targetRepositoryId: targetRepo.id,
      targetRepositoryName: targetRepo.full_name,
      targetDefaultBranch: targetRepo.default_branch,
    }
  } else {
  const [sourceRepo, targetRepo, sourceMain, mediaPatch, mediaFile, workflow, active, queued, requested, waiting, pending] = await Promise.all([
    getJSON(sourceUrl, sourceHeaders),
    getJSON('https://api.github.com/repos/' + TARGET_REPO, targetHeaders),
    getJSON(sourceUrl + '/git/ref/heads/main', sourceHeaders),
    getJSON(sourceUrl + '/pulls/' + SOURCE_FIX_PR, sourceHeaders),
    getJSON(sourceUrl + '/contents/worker/media.ts?ref=main', sourceHeaders),
    getJSON(prefix, sourceHeaders),
    getJSON(prefix + '/runs?status=in_progress&per_page=1', sourceHeaders),
    getJSON(prefix + '/runs?status=queued&per_page=1', sourceHeaders),
    getJSON(prefix + '/runs?status=requested&per_page=1', sourceHeaders),
    getJSON(prefix + '/runs?status=waiting&per_page=1', sourceHeaders),
    getJSON(prefix + '/runs?status=pending&per_page=1', sourceHeaders),
  ])
  state = {
    sourceRepositoryId: sourceRepo.id, sourceRepositoryName: sourceRepo.full_name,
    targetRepositoryId: targetRepo.id, targetRepositoryName: targetRepo.full_name,
    targetDefaultBranch: targetRepo.default_branch,
    sourceMainRef: sourceMain.ref, sourceMainSha: sourceMain.object?.sha,
    sourceFix: {
      number: mediaPatch.number, state: mediaPatch.state, draft: mediaPatch.draft,
      merged: mediaPatch.merged, headSha: mediaPatch.head?.sha,
      mergeCommitSha: mediaPatch.merge_commit_sha,
      baseSha: mediaPatch.base?.sha, headRepo: mediaPatch.head?.repo?.full_name,
    },
    sourceMediaBlobSha: mediaFile.sha,
    workflow, running: active.total_count, queued: queued.total_count,
    requested: requested.total_count, waiting: waiting.total_count, pending: pending.total_count,
  }
  const sourceWriters = contract.origin.additionalWriterWorkflows
  if (!Array.isArray(sourceWriters) || sourceWriters.length !== 4) {
    throw new Error('source_writer_inventory_unverified')
  }
  state.additionalWriters = await Promise.all(sourceWriters.map(async writer => {
    const writerApi = sourceUrl + '/actions/workflows/' +
      encodeURIComponent(writer.path.split('/').at(-1))
    const [metadata, ...runs] = await Promise.all([
      getJSON(writerApi, sourceHeaders),
      ...['in_progress', 'queued', 'requested', 'waiting', 'pending'].map(status =>
        getJSON(writerApi + '/runs?status=' + status + '&per_page=1', sourceHeaders)),
    ])
    return {
      id: metadata.id, path: metadata.path, state: metadata.state,
      running: runs[0].total_count, queued: runs[1].total_count,
      requested: runs[2].total_count, waiting: runs[3].total_count,
      pending: runs[4].total_count,
    }
  }))
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
  const contract = CANONICAL
  try {
    const state = await inspectLiveReadOnly()
    const verdict = assessCutoverReadiness(contract, state)
    console.log(JSON.stringify({
      status: verdict.ready ? 'READY_FOR_SEPARATELY_AUTHORIZED_CUTOVER' : 'BLOCKED',
      sourceWorkflow: state.workflow?.state ?? 'unverified',
      sourceMainSha: state.sourceMainSha ?? null,
      targetRepositoryId: state.targetRepositoryId ?? null,
      sourceMediaPatchSha: state.sourceFix?.headSha ?? null,
      sourceMediaBlobSha: state.sourceMediaBlobSha ?? null,
      sourceInProgress: state.running ?? null,
      sourceQueued: state.queued ?? null,
      sourceRequested: state.requested ?? null,
      sourceWaiting: state.waiting ?? null,
      sourcePending: state.pending ?? null,
      sourceAdditionalWriters: state.additionalWriters ?? null,
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
