import { pathToFileURL } from 'node:url';

const EXPORT_RPC = 'admin_export_approved_catalog_character_projection';
const WORKER_PATH = '/api/admin/editorial-projection';
const PRODUCTION_SUPABASE_REF = 'icmtmaakjucmuzxnofkd';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function requireCondition(condition, code) {
  if (!condition) throw new Error(code);
}

function parseUrl(value, code) {
  try { return new URL(value); }
  catch { throw new Error(code); }
}

export function validateEditorialSyncTargets(sourceUrl, workerUrl, token, isolatedProjectRef) {
  const source = parseUrl(sourceUrl, 'editorial_source_url_invalid');
  const worker = parseUrl(workerUrl, 'editorial_local_worker_url_invalid');
  const localSource = LOOPBACK_HOSTS.has(source.hostname.toLowerCase());
  const sourceProjectRef = source.hostname.toLowerCase().endsWith('.supabase.co')
    ? source.hostname.slice(0, -'.supabase.co'.length)
    : '';
  const explicitlyIsolatedSource = source.protocol === 'https:' &&
    /^[a-z0-9]{20}$/.test(sourceProjectRef) &&
    sourceProjectRef !== PRODUCTION_SUPABASE_REF &&
    typeof isolatedProjectRef === 'string' &&
    isolatedProjectRef === sourceProjectRef;
  requireCondition(
    (localSource && ['http:', 'https:'].includes(source.protocol)) ||
      (!localSource && explicitlyIsolatedSource),
    'editorial_source_must_be_local_or_explicitly_isolated_supabase',
  );
  requireCondition(worker.protocol === 'http:' && LOOPBACK_HOSTS.has(worker.hostname.toLowerCase()) &&
    !worker.username && !worker.password && !worker.search && !worker.hash &&
    (worker.pathname === '/' || worker.pathname === ''),
  'editorial_target_must_be_local_worker');
  requireCondition(typeof token === 'string' && token.length >= 32,
    'editorial_sync_token_invalid');
  requireCondition(!source.username && !source.password && !source.search && !source.hash &&
    (source.pathname === '/' || source.pathname === ''),
    'editorial_source_url_invalid');
  return { source, worker };
}

export function validateApprovedExport(payload) {
  requireCondition(payload && typeof payload === 'object' && !Array.isArray(payload) &&
    payload.schemaVersion === 1 &&
    payload.source === `public.${EXPORT_RPC}` &&
    typeof payload.generatedAt === 'string' && Number.isFinite(Date.parse(payload.generatedAt)) &&
    Array.isArray(payload.characters),
  'editorial_export_contract_invalid');
  return payload;
}

export async function fetchApprovedExport(source, serviceRoleKey, fetchImpl = fetch) {
  requireCondition(typeof serviceRoleKey === 'string' && serviceRoleKey.length > 20,
    'editorial_service_role_key_missing');
  const endpoint = new URL(`/rest/v1/rpc/${EXPORT_RPC}`, source);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: '{}',
    signal: AbortSignal.timeout(20000),
  });
  requireCondition(response.ok, `editorial_export_failed_${response.status}`);
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('editorial_export_response_invalid'); }
  return validateApprovedExport(payload);
}

export async function sendEditorialProjection({
  payload,
  worker,
  token,
  mode = 'dry-run',
  fetchImpl = fetch,
}) {
  validateApprovedExport(payload);
  requireCondition(['dry-run', 'apply', 'rollback-dry-run', 'rollback-clear'].includes(mode),
    'editorial_publish_mode_invalid');
  const body = mode === 'rollback-clear' || mode === 'rollback-dry-run'
    ? { ...payload, characters: [] }
    : payload;
  const endpoint = new URL(WORKER_PATH, worker);
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    accept: 'application/json',
  };
  if (mode === 'dry-run') headers['x-tonart-dry-run'] = 'true';
  if (mode === 'rollback-dry-run' || mode === 'rollback-clear') {
    headers['x-tonart-allow-empty'] = 'confirm';
  }
  if (mode === 'rollback-dry-run') headers['x-tonart-dry-run'] = 'true';
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error('editorial_worker_response_invalid'); }
  requireCondition(response.ok && result?.ok === true,
    `editorial_worker_rejected_${response.status}_${result?.error ?? 'unknown'}`);
  if (mode === 'dry-run' || mode === 'rollback-dry-run') requireCondition(result.dryRun === true,
    'editorial_worker_dry_run_not_confirmed');
  return result;
}

export async function runApprovedEditorialSync(args, env = process.env, fetchImpl = fetch) {
  requireCondition(args.length <= 1 && (!args.length ||
    ['--dry-run', '--apply', '--rollback-clear'].includes(args[0])),
  'usage: [--dry-run | --apply | --rollback-clear]');
  const mode = args[0] === '--apply' ? 'apply' :
    args[0] === '--rollback-clear' ? 'rollback-clear' : 'dry-run';
  const { source, worker } = validateEditorialSyncTargets(
    env.TONART_EDITORIAL_SOURCE_URL,
    env.TONART_EDITORIAL_LOCAL_WORKER_URL,
    env.TONART_EDITORIAL_SYNC_TOKEN,
    env.TONART_EDITORIAL_ISOLATED_SUPABASE_REF,
  );
  // Emergency withdrawal must work when the private Supabase export is down.
  // Retain the explicit local Worker and source-environment gates above, but
  // never contact Supabase or require its service-role key for rollback-clear.
  const payload = mode === 'rollback-clear'
    ? {
      schemaVersion: 1,
      source: `public.${EXPORT_RPC}`,
      generatedAt: new Date().toISOString(),
      characters: [],
    }
    : await fetchApprovedExport(
      source,
      env.TONART_EDITORIAL_SERVICE_ROLE_KEY,
      fetchImpl,
    );
  if (mode === 'rollback-clear') {
    console.error('Rollback mode clears only the local public D1 projection; Supabase editorial records are untouched.');
  }
  const dryRun = await sendEditorialProjection({ payload, worker, token: env.TONART_EDITORIAL_SYNC_TOKEN,
    mode: mode === 'rollback-clear' ? 'rollback-dry-run' : 'dry-run', fetchImpl });
  let result = dryRun;
  if (mode === 'apply') {
    result = await sendEditorialProjection({ payload, worker, token: env.TONART_EDITORIAL_SYNC_TOKEN,
      mode: 'apply', fetchImpl });
  } else if (mode === 'rollback-clear') {
    result = await sendEditorialProjection({ payload, worker, token: env.TONART_EDITORIAL_SYNC_TOKEN,
      mode: 'rollback-clear', fetchImpl });
  }
  console.log(JSON.stringify({
    mode,
    dryRun: mode !== 'apply',
    applied: result.applied === true,
    idempotent: result.idempotent === true,
    snapshotSha256: result.snapshotSha256,
    counts: result.counts,
  }));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  runApprovedEditorialSync(process.argv.slice(2)).catch(error => {
    console.error(error?.message || 'editorial_projection_publish_failed');
    process.exitCode = 1;
  });
}
