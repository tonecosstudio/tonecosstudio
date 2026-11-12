/**
 * Publish a reviewed editorial PR to the EXISTING D1 database after M5.
 * No browser credential, second database, schema migration or unreviewed write.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { patchCanonicalEditorialContract } from './catalog-editorial-contract.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CONTRACT = 'services/catalogo/config/catalog-production-model-contract.json';
const REPO = 'tonecosstudio/tonecosstudio';
const SHA = /^[a-f0-9]{40}$/;
const ID = /^mdl_[a-f0-9]{20}$/;

function requireCondition(condition, code) {
  if (!condition) throw new Error(code);
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function validLabel(value, max) {
  return typeof value === 'string' && value.trim() === value &&
    value.length > 0 && Array.from(value).length <= max &&
    !Array.from(value).some(c => c.charCodeAt(0) <= 31 || c.charCodeAt(0) === 127) &&
    !/^[=+@-]/.test(value) && !/[<>]/.test(value);
}

export function planReviewedEditorial(beforeText, afterText) {
  const before = JSON.parse(beforeText), after = JSON.parse(afterText);
  const rest = ({ models, ...metadata }) => metadata;
  requireCondition(before?.version === 1 && after?.version === 1 &&
    Array.isArray(before.models) && Array.isArray(after.models) &&
    same(rest(before), rest(after)) && before.models.length === after.models.length &&
    before.source?.productionModels === before.models.length &&
    before.source?.publishedModels === before.models.filter(m => m.published === 1 || m.published === true).length,
  'editorial_contract_structure_changed');
  const ids = new Set(), changes = [];
  for (let i = 0; i < before.models.length; i++) {
    const old = before.models[i], next = after.models[i];
    requireCondition(old && next && ID.test(old.id) && old.id === next.id &&
      !ids.has(old.id) && same(Object.keys(old), Object.keys(next)),
    'editorial_contract_identity_changed');
    ids.add(old.id);
    const strip = ({ displayName, variantName, ...identity }) => identity;
    requireCondition(same(strip(old), strip(next)), 'editorial_contract_metadata_changed');
    if (old.displayName === next.displayName && old.variantName === next.variantName) continue;
    requireCondition(old.published === true || old.published === 1, 'editorial_unpublished_change');
    requireCondition(validLabel(next.displayName, 120) &&
      (next.variantName === '' || validLabel(next.variantName, 160)) &&
      (next.variantName !== '' || old.variantName === ''),
    'editorial_invalid_target_label');
    requireCondition(typeof old.slug === 'string' && typeof old.code === 'string' &&
      typeof old.displayName === 'string' && typeof old.variantName === 'string',
    'editorial_invalid_prior_snapshot');
    changes.push({
      id: old.id, slug: old.slug, code: old.code,
      fromName: old.displayName, fromVariant: old.variantName,
      toName: next.displayName, toVariant: next.variantName,
    });
  }
  requireCondition(changes.length > 0 && changes.length <= 12, 'editorial_change_count_invalid');
  // Reuse the ONE production contract validator also used by admin submission.
  // This protects name collisions, exact model identity and canonical layout,
  // instead of maintaining a weaker publication-side interpretation.
  const expected = patchCanonicalEditorialContract(beforeText, changes.map(change => {
    const prior = before.models.find(model => model.id === change.id);
    return {
      id: change.id, slug: prior.slug, code: prior.code,
      name: prior.displayName, variantName: prior.variantName,
      category: prior.categoryName, franchise: prior.franchiseName,
      newName: change.fromName === change.toName ? '' : change.toName,
      newVariant: change.fromVariant === change.toVariant ? '' : change.toVariant,
    };
  }));
  requireCondition(expected.content.trimEnd() === afterText.trimEnd(),
    'editorial_revision_does_not_match_canonical_patcher');
  return changes;
}

/* All-or-nothing conditional update: a stale row prevents ANY write.
 * D1/SQLite executes this one statement atomically; FTS triggers observe
 * search_text changes. Parameters are bound; user text never forms SQL.
 */
export function makeAtomicEditorialStatement(changes) {
  requireCondition(Array.isArray(changes) && changes.length > 0 && changes.length <= 12,
    'editorial_invalid_plan');
  const values = changes.map(() => '(?,?,?,?,?,?,?)').join(',');
  const sql =
    'WITH patch(id,slug,code,old_name,old_variant,new_name,new_variant) AS (VALUES ' + values + ') ' +
    'UPDATE models SET ' +
    'name=(SELECT new_name FROM patch WHERE patch.id=models.id),' +
    'variant_name=(SELECT new_variant FROM patch WHERE patch.id=models.id),' +
    "search_text=trim(coalesce(models.search_text,'') || ' ' || " +
      "(SELECT new_name FROM patch WHERE patch.id=models.id) || ' ' || " +
      "(SELECT new_variant FROM patch WHERE patch.id=models.id))," +
    'updated_at=CURRENT_TIMESTAMP ' +
    'WHERE models.id IN (SELECT id FROM patch) AND ' +
    '(SELECT COUNT(*) FROM patch p JOIN models m ON m.id=p.id ' +
      'AND m.slug=p.slug AND m.code=p.code ' +
      'AND m.name=p.old_name AND m.variant_name=p.old_variant ' +
      'AND m.published=1)=' + changes.length + ' ' +
    // The D1 production trigger prohibits changing names for any member of a
    // gallery. Refuse the ENTIRE batch when a protected name is changed.
    'AND NOT EXISTS (SELECT 1 FROM patch p JOIN model_gallery_members g ' +
      'ON (g.canonical_model_id=p.id OR g.source_model_id=p.id) ' +
      'WHERE p.old_name<>p.new_name) ' +
    'RETURNING id,name,variant_name';
  return { sql, params: changes.flatMap(c =>
    [c.id,c.slug,c.code,c.fromName,c.fromVariant,c.toName,c.toVariant]) };
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 6 * 1024 * 1024 }).trimEnd();
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(12000),
  });
  requireCondition(response.ok, 'editorial_github_read_failed_' + response.status);
  return response.json();
}

export function assertMergedReview(pr, reviews, number, currentSha) {
  requireCondition(pr?.number === number && pr?.merged === true && pr?.merged_at &&
    pr?.base?.ref === 'main' && pr?.base?.repo?.full_name === REPO &&
    pr?.head?.repo?.full_name === REPO &&
    pr?.head?.ref === 'editorial/tonart-admin-review' &&
    SHA.test(pr.merge_commit_sha ?? '') && pr.merge_commit_sha === currentSha &&
    Array.isArray(reviews) &&
    reviews.some(review => review.state === 'APPROVED' &&
      review.commit_id === pr.head.sha &&
      review.user?.login && review.user.login !== pr.user?.login),
  'editorial_review_not_approved_on_current_head');
}

async function d1Query(sql, params, env) {
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const config = JSON.parse(readFileSync(join(ROOT, 'services/catalogo/wrangler.jsonc'), 'utf8'));
  const db = config.d1_databases?.find(x => x.binding === 'DB')?.database_id;
  requireCondition(account && account === JSON.parse(readFileSync(
    join(ROOT, 'config/catalog-code-consolidation.json'), 'utf8')).runtime.cloudflareAccountId &&
    db && /^[a-f0-9-]{36}$/.test(db) && env.CLOUDFLARE_API_TOKEN,
  'editorial_cloudflare_binding_unverified');
  const url = 'https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(account) + '/d1/database/' + encodeURIComponent(db) + '/query';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.CLOUDFLARE_API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
    signal: AbortSignal.timeout(20000),
  });
  requireCondition(response.ok, 'editorial_d1_http_' + response.status);
  const body = await response.json();
  requireCondition(body.success === true && Array.isArray(body.result) &&
    body.result.length === 1 && body.result[0].success !== false &&
    Array.isArray(body.result[0].results),
  'editorial_d1_query_unverified');
  return body.result[0].results;
}

export function classifyLiveRows(changes, rows) {
  if (!Array.isArray(rows) || rows.length !== changes.length) return 'conflict';
  const byId = new Map(rows.map(row => [row.id, row]));
  if (byId.size !== changes.length ||
      rows.some(row => row.gallery_name_locked !== 0 && row.gallery_name_locked !== 1)) {
    return 'conflict';
  }
  const is = (variant) => changes.every(c => {
    const row = byId.get(c.id);
    return row && row.slug === c.slug && row.code === c.code &&
      Number(row.published) === 1 &&
      row.name === (variant === 'before' ? c.fromName : c.toName) &&
      row.variant_name === (variant === 'before' ? c.fromVariant : c.toVariant);
  });
  if (is('after')) return 'already_applied';
  if (!is('before')) return 'conflict';
  return changes.some(c => c.fromName !== c.toName &&
    byId.get(c.id).gallery_name_locked === 1)
    ? 'gallery_name_protected' : 'ready';
}

async function main() {
  const args = process.argv.slice(2);
  requireCondition(args.length === 3 && args[0] === '--pr' &&
    /^\d+$/.test(args[1]) && args[2] === '--apply',
  'usage: --pr <merged_editorial_pr> --apply');
  const prNumber = Number(args[1]);
  requireCondition(Number.isSafeInteger(prNumber) && prNumber > 0 &&
    process.env.GITHUB_REF === 'refs/heads/main' &&
    process.env.GITHUB_SHA === git('rev-parse','HEAD'),
  'editorial_not_canonical_main');
  const manifest = JSON.parse(readFileSync(join(ROOT, 'config/catalog-code-consolidation.json'), 'utf8'));
  requireCondition(manifest.migration.phase === 'cutover-complete' &&
    manifest.activeWorkerPublisher === REPO && manifest.productionObservation.runtimeCutoverPerformed === true,
  'editorial_m5_not_complete');
  const token = process.env.GITHUB_TOKEN;
  requireCondition(typeof token === 'string' && token.length > 0, 'editorial_github_token_missing');
  const pr = await githubJson('https://api.github.com/repos/' + REPO + '/pulls/' + prNumber, token);
  const reviews = await githubJson('https://api.github.com/repos/' + REPO +
    '/pulls/' + prNumber + '/reviews?per_page=100', token);
  requireCondition(SHA.test(pr?.merge_commit_sha ?? ''), 'editorial_merge_commit_missing');
  const sha = pr.merge_commit_sha;
  // A reviewed older PR cannot silently overwrite a later contract revision.
  const afterText = git('show',sha + ':' + CONTRACT);
  requireCondition(afterText === git('show','HEAD:' + CONTRACT) &&
    git('diff','--name-only',sha + '^',sha).trim() === CONTRACT,
  'editorial_merge_contains_unreviewed_changes');
  try { git('merge-base','--is-ancestor',sha,'HEAD'); }
  catch { throw new Error('editorial_review_not_in_main'); }
  assertMergedReview(pr, reviews, prNumber, sha);
  const beforeText = git('show',sha + '^:' + CONTRACT);
  const changes = planReviewedEditorial(beforeText, afterText);
  const placeholders = changes.map(() => '?').join(',');
  const readSQL =
    'SELECT m.id,m.slug,m.code,m.name,m.variant_name,m.published, ' +
    'EXISTS (SELECT 1 FROM model_gallery_members g WHERE ' +
      'g.canonical_model_id=m.id OR g.source_model_id=m.id) AS gallery_name_locked ' +
    'FROM models m WHERE m.id IN (' + placeholders + ')';
  const live = await d1Query(readSQL, changes.map(x => x.id), process.env);
  const state = classifyLiveRows(changes, live);
  requireCondition(state !== 'conflict', 'editorial_live_snapshot_drift');
  requireCondition(state !== 'gallery_name_protected', 'editorial_gallery_name_protected');
  if (state === 'already_applied') {
    console.log(JSON.stringify({ status:'ALREADY_APPLIED', approvedPr:prNumber, count:changes.length }));
    return;
  }
  const write = makeAtomicEditorialStatement(changes);
  const rows = await d1Query(write.sql, write.params, process.env);
  requireCondition(rows.length === changes.length &&
    changes.every(c => rows.some(row => row.id === c.id &&
      row.name === c.toName && row.variant_name === c.toVariant)),
  'editorial_atomic_apply_not_confirmed');
  const verified = await d1Query(readSQL, changes.map(x => x.id), process.env);
  requireCondition(classifyLiveRows(changes, verified) === 'already_applied',
    'editorial_post_apply_verification_failed');
  console.log(JSON.stringify({ status:'APPLIED', approvedPr:prNumber, count:changes.length }));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    console.error(error?.message || 'editorial_apply_failed');
    process.exitCode = 1;
  });
}
