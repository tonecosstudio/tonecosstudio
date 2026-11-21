/**
 * Read-only M5 release gate. Never deploys, changes workflows or writes D1/R2.
 * Checks only Cloudflare D1 schema metadata needed for Worker compatibility.
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
const SCHEMA_CONTRACT = JSON.parse(readFileSync(join(ROOT, 'services/catalogo/config/catalog-schema-contract.json'), 'utf8'))
const SOURCE_WORKFLOW_ID = CANONICAL.origin.apiDeployWorkflowId
const SOURCE_WORKFLOW_PATH = CANONICAL.origin.apiDeployPipeline
const SOURCE_WRITERS = CANONICAL.origin.additionalWriterWorkflows
const SOURCE_REPO = CANONICAL.origin.repository
const SOURCE_REPO_ID = CANONICAL.origin.repositoryId
const SOURCE_MAIN_SHA = CANONICAL.origin.observedMainSha
const SOURCE_FIX_PR = CANONICAL.staging.sourceFixPullRequest
const SOURCE_FIX_HEAD = CANONICAL.staging.sourceFixHead
const TARGET_REPO = CANONICAL.target.repository
const TARGET_REPO_ID = CANONICAL.target.repositoryId
const CLOUDFLARE_ACCOUNT_ID = CANONICAL.runtime.cloudflareAccountId
const WORKER_NAME = CANONICAL.runtime.worker
const WORKER_D1 = WORKER_CONFIG.d1_databases?.find(binding => binding.binding === 'DB')
const WORKER_MEDIA = WORKER_CONFIG.r2_buckets?.find(binding => binding.binding === 'MEDIA')
const REQUIRED_SHOWCASE_COLUMN = 'telegram_showcase_visible'
const REQUIRED_SHOWCASE_MIGRATION = SCHEMA_CONTRACT.requiredMigrations?.find(x => x.startsWith('0025_telegram_showcase_'))
const REQUIRED_SHOWCASE_TRIGGERS = SCHEMA_CONTRACT.requiredObjects?.triggers?.filter(x => x.startsWith('trg_telegram_showcase_')) ?? []

export function assessCutoverReadiness(contract, state) {
  const blockers = []
  const m = contract?.migration ?? {}
  const o = contract?.productionObservation ?? {}
  const observed = state ?? {}
  const workflow = observed.workflow
  const add = (condition, reason) => { if (!condition) blockers.push(reason) }

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
  // The staged R2 media fix came from a still-open source PR, not source main.
  // Never accept an outdated or substituted patch as a promoted Worker candidate.
  const patch = observed.sourceFix
  add(
    Number.isInteger(SOURCE_FIX_PR) && SOURCE_FIX_PR > 0 &&
      typeof SOURCE_FIX_HEAD === 'string' && /^[0-9a-f]{40}$/.test(SOURCE_FIX_HEAD) &&
      contract?.staging?.sourceFixPullRequest === SOURCE_FIX_PR &&
      contract?.staging?.sourceFixHead === SOURCE_FIX_HEAD &&
      contract?.staging?.sourceFixStatusAtImport === 'open-draft-not-merged' &&
      patch?.number === SOURCE_FIX_PR && patch?.state === 'open' &&
      patch?.draft === true && patch?.merged === false &&
      patch?.headSha === SOURCE_FIX_HEAD &&
      patch?.baseSha === SOURCE_MAIN_SHA && patch?.headRepo === SOURCE_REPO,
    'source_media_patch_drift_or_unverified',
  )
  add(contract?.origin?.apiDeployWorkflowId === SOURCE_WORKFLOW_ID && contract?.origin?.apiDeployPipeline === SOURCE_WORKFLOW_PATH, 'github_workflow_identity_unverified')
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
  // The retiring repository had additional independent production D1/R2 writers.
  // Disabling only cloudflare.yml does not prove a unique publishing authority.
  const registeredWriters = contract?.origin?.additionalWriterWorkflows
  const observedWriters = observed.additionalWriters
  add(
    Array.isArray(SOURCE_WRITERS) && SOURCE_WRITERS.length === 4 &&
      Array.isArray(registeredWriters) && registeredWriters.length === SOURCE_WRITERS.length &&
      new Set(registeredWriters.map(x => x.path)).size === 4 &&
      SOURCE_WRITERS.every(writer => registeredWriters.some(x => x.id === writer.id && x.path === writer.path)) &&
      Array.isArray(observedWriters) && observedWriters.length === SOURCE_WRITERS.length &&
      SOURCE_WRITERS.every(writer => {
        const live = observedWriters.find(x => x?.path === writer.path)
        return live?.id === writer.id && live?.state === 'disabled_manually' &&
          ['running', 'queued', 'requested', 'waiting', 'pending'].every(
            key => Number.isInteger(live[key]) && live[key] === 0)
      }),
    'source_additional_writers_active_or_unverified',
  )
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
  // A Worker that selects telegram_showcase_visible returns HTTP 503 on the old
  // D1 schema. Verify the actual applied migration and all relevant triggers
  // before authorizing a new version, never rely only on a tracked SQL file.
  const visibility = observed.showcaseSchema
  add(
    REQUIRED_SHOWCASE_MIGRATION === '0025_telegram_showcase_private_visibility.sql' &&
      REQUIRED_SHOWCASE_TRIGGERS.length === 3 &&
      visibility?.column === REQUIRED_SHOWCASE_COLUMN &&
      visibility?.migration === REQUIRED_SHOWCASE_MIGRATION &&
      REQUIRED_SHOWCASE_TRIGGERS.every(name => visibility?.triggers?.includes(name)),
    'telegram_showcase_migration_0025_unverified',
  )

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

async function getVerifiedShowcaseSchema(account, token) {
  // D1 HTTP transport uses POST for SELECT. This statement reads metadata only:
  // no scan of models, UPDATE, DDL, migration application or R2 operation.
  if (!WORKER_D1?.database_id || !REQUIRED_SHOWCASE_MIGRATION ||
      REQUIRED_SHOWCASE_TRIGGERS.length !== 3) {
    throw new Error('required_showcase_schema_contract_missing')
  }
  const quote = value => "'" + String(value).replaceAll("'", "''") + "'"
  const sql = [
    "SELECT 'column' AS category,name FROM pragma_table_info('models') WHERE name=" + quote(REQUIRED_SHOWCASE_COLUMN),
    "SELECT 'migration' AS category,name FROM d1_migrations WHERE name=" + quote(REQUIRED_SHOWCASE_MIGRATION),
    "SELECT 'trigger' AS category,name FROM sqlite_master WHERE type='trigger' AND name IN (" +
      REQUIRED_SHOWCASE_TRIGGERS.map(quote).join(',') + ')',
  ].join(' UNION ALL ')
  const url = 'https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(account) + '/d1/database/' + encodeURIComponent(WORKER_D1.database_id) + '/query'
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ sql }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('read_only_d1_schema_http_' + response.status)
  const data = await response.json()
  if (data.success !== true || !Array.isArray(data.result)) {
    throw new Error('read_only_d1_schema_response_invalid')
  }
  const records = data.result.flatMap(x => x.results ?? [])
  const has = (category, name) => records.some(x => x.category === category && x.name === name)
  return {
    column: has('column', REQUIRED_SHOWCASE_COLUMN) ? REQUIRED_SHOWCASE_COLUMN : null,
    migration: has('migration', REQUIRED_SHOWCASE_MIGRATION) ? REQUIRED_SHOWCASE_MIGRATION : null,
    triggers: REQUIRED_SHOWCASE_TRIGGERS.filter(name => has('trigger', name)),
  }
}

export async function inspectLiveReadOnly(env = process.env) {
  const workflowName = SOURCE_WORKFLOW_PATH.split('/').at(-1)
  const sourceUrl = 'https://api.github.com/repos/' + SOURCE_REPO
  const prefix = sourceUrl + '/actions/workflows/' + workflowName
  const ghHeaders = { 'User-Agent': 'tonecos-readonly-cutover-check' }
  // The target repository is private: read-only GitHub credentials are required
  // for the live release preflight. Never use a Cloudflare token for GitHub.
  const githubToken = env.GITHUB_TOKEN || env.GH_TOKEN
  if (githubToken) ghHeaders.Authorization = 'Bearer ' + githubToken
  const [sourceRepo, targetRepo, sourceMain, mediaPatch, workflow, active, queued, requested, waiting, pending] = await Promise.all([
    getJSON(sourceUrl, ghHeaders),
    getJSON('https://api.github.com/repos/' + TARGET_REPO, ghHeaders),
    getJSON(sourceUrl + '/git/ref/heads/main', ghHeaders),
    getJSON(sourceUrl + '/pulls/' + SOURCE_FIX_PR, ghHeaders),
    getJSON(prefix, ghHeaders),
    getJSON(prefix + '/runs?status=in_progress&per_page=1', ghHeaders),
    getJSON(prefix + '/runs?status=queued&per_page=1', ghHeaders),
    getJSON(prefix + '/runs?status=requested&per_page=1', ghHeaders),
    getJSON(prefix + '/runs?status=waiting&per_page=1', ghHeaders),
    getJSON(prefix + '/runs?status=pending&per_page=1', ghHeaders),
  ])
  const state = {
    sourceRepositoryId: sourceRepo.id, sourceRepositoryName: sourceRepo.full_name,
    targetRepositoryId: targetRepo.id, targetRepositoryName: targetRepo.full_name,
    targetDefaultBranch: targetRepo.default_branch,
    sourceMainRef: sourceMain.ref, sourceMainSha: sourceMain.object?.sha,
    sourceFix: {
      number: mediaPatch.number, state: mediaPatch.state, draft: mediaPatch.draft,
      merged: mediaPatch.merged, headSha: mediaPatch.head?.sha,
      baseSha: mediaPatch.base?.sha, headRepo: mediaPatch.head?.repo?.full_name,
    },
    workflow, running: active.total_count, queued: queued.total_count,
    requested: requested.total_count, waiting: waiting.total_count, pending: pending.total_count,
  }
  if (!Array.isArray(SOURCE_WRITERS) || SOURCE_WRITERS.length !== 4 ||
      new Set(SOURCE_WRITERS.map(x => x.path)).size !== 4) {
    throw new Error('retiring_source_writer_inventory_unverified')
  }
  state.additionalWriters = await Promise.all(SOURCE_WRITERS.map(async writer => {
    const endpoint = sourceUrl + '/actions/workflows/' +
      encodeURIComponent(writer.path.split('/').at(-1))
    const [metadata, ...counts] = await Promise.all([
      getJSON(endpoint, ghHeaders),
      ...['in_progress', 'queued', 'requested', 'waiting', 'pending'].map(
        status => getJSON(endpoint + '/runs?status=' + status + '&per_page=1', ghHeaders)),
    ])
    return {
      id: metadata.id, path: metadata.path, state: metadata.state,
      running: counts[0]?.total_count, queued: counts[1]?.total_count,
      requested: counts[2]?.total_count, waiting: counts[3]?.total_count,
      pending: counts[4]?.total_count,
    }
  }))
  // No token: still report actual GitHub state, but never infer Cloudflare readiness.
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) return state
  const account = env.CLOUDFLARE_ACCOUNT_ID
  if (account !== CLOUDFLARE_ACCOUNT_ID) throw new Error('cloudflare_account_mismatch')
  const host = 'https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(account) +
    '/workers/scripts/' + WORKER_NAME
  const headers = { Authorization: 'Bearer ' + env.CLOUDFLARE_API_TOKEN }
  const [deploy, settings, showcaseSchema] = await Promise.all([
    getJSON(host + '/deployments', headers),
    getJSON(host + '/settings', headers),
    getVerifiedShowcaseSchema(account, env.CLOUDFLARE_API_TOKEN),
  ])
  if (deploy.success !== true || settings.success !== true) {
    throw new Error('cloudflare_metadata_not_verified')
  }
  state.cloudflareAccountId = account
  state.deployment = (deploy.result?.deployments ?? [])[0]
  state.bindings = settings.result?.bindings
  state.showcaseSchema = showcaseSchema
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
      sourceInProgress: state.running ?? null,
      sourceQueued: state.queued ?? null,
      sourceRequested: state.requested ?? null,
      sourceWaiting: state.waiting ?? null,
      sourcePending: state.pending ?? null,
      sourceAdditionalWriters: state.additionalWriters?.map(x => ({ path: x.path, state: x.state })) ?? null,
      liveWorkerVersionId: state.deployment?.versions?.[0]?.version_id ?? null,
      verifiedShowcaseMigration: state.showcaseSchema?.migration ?? null,
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
