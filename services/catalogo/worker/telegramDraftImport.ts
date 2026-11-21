/**
 * Incremental private Telegram studio ingestion into the existing D1 catalog.
 * One Curadoria group => one draft model. R2 is READ-ONLY; no image reupload.
 * Called only after the canonical admin session was verified by telegramDrafts.
 */
type Statement = {
  bind(...values: unknown[]): Statement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<{ results: T[] }>
  run(): Promise<{ meta?: { changes?: number } }>
}
type D1 = {
  prepare(sql: string): Statement
  batch(statements: Statement[]): Promise<Array<{ success: boolean; meta?: { changes?: number } }>>
}
type PrivateBucket = { head(key: string): Promise<unknown | null> }
export type DraftImportEnv = {
  DB: D1
  PRIVATE_TELEGRAM?: PrivateBucket
}
type Photo = { messageId: number; sha256: string }
type ImportResult = { status: number; data: Record<string, unknown> }
const sha64 = /^[a-f0-9]{64}$/
const group24 = /^[a-f0-9]{24}$/
// Existing Curadoria uses single:<message_id> for an ungrouped photo.
const singleGroup = /^single:([1-9][0-9]{0,15})$/
const sourceId = '2370335738'
const root = 'telegram-studios/v1/' + sourceId + '/telegram-webp-final-v1/'
const allowedFields = ['originId', 'studio', 'groupKey', 'name', 'universe', 'variant', 'franchiseId', 'images']
const present = (value: unknown, max: number) =>
  typeof value === 'string' && value.length > 0 && value.length <= max &&
  value.trim().length > 0 && !/\p{Cc}/u.test(value)
const optional = (value: unknown, max: number) =>
  typeof value === 'string' && value.length <= max && !/\p{Cc}/u.test(value)
function key(digest: string, role: 'display' | 'thumb') {
  return root + digest.slice(0, 2) + '/' + digest + '/' + role + '.webp'
}
function error(status: number, reason: string): ImportResult {
  return { status, data: { error: reason } }
}

export async function importPrivateTelegramDraft(
  request: Request, env: DraftImportEnv,
): Promise<ImportResult> {
  let parsed: unknown
  try {
    if (Number(request.headers.get('content-length') || 0) > 20000) return error(413, 'group_too_large')
    const content = await request.text()
    if (content.length > 20000) return error(413, 'group_too_large')
    parsed = JSON.parse(content)
  } catch {
    return error(400, 'invalid_group_manifest')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return error(400, 'invalid_group_manifest')
  const body = parsed as Record<string, unknown>
  if (Object.keys(body).some(k => !allowedFields.includes(k))) return error(400, 'unexpected_group_fields')
  const studio = body.studio
  const name = body.name
  const universe = body.universe
  const variant = body.variant
  const group = body.groupKey
  const ids = body.images
  if (body.originId !== sourceId || typeof studio !== 'string' || !present(studio, 120) ||
      /geral\s*\+?\s*50k/i.test(studio) || !present(name, 160) ||
      !optional(universe, 160) || !optional(variant, 160) ||
      typeof group !== 'string' || (!group24.test(group) && !singleGroup.test(group)) ||
      !Number.isSafeInteger(body.franchiseId) || (body.franchiseId as number) <= 0 ||
      !Array.isArray(ids) || ids.length < 1 || ids.length > 80) {
    return error(400, 'invalid_group_identity')
  }
  const images: Photo[] = []
  for (const entry of ids) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return error(400, 'invalid_photo')
    const photo = entry as Record<string, unknown>
    if (Object.keys(photo).some(k => k !== 'messageId' && k !== 'sha256') ||
        !Number.isSafeInteger(photo.messageId) || (photo.messageId as number) <= 0 ||
        typeof photo.sha256 !== 'string' || !sha64.test(photo.sha256)) {
      return error(400, 'invalid_photo')
    }
    images.push({ messageId: photo.messageId as number, sha256: photo.sha256 })
  }
  if (new Set(images.map(x => x.messageId)).size !== images.length ||
      new Set(images.map(x => x.sha256)).size !== images.length) {
    return error(400, 'duplicate_group_photos')
  }
  // One image remains a Curadoria single, not a fabricated multi-photo gallery.
  // Derive a stable D1-compatible ID from the origin and the original message ID.
  let canonicalGroup = group as string
  const solo = singleGroup.exec(canonicalGroup)
  if (solo) {
    if (images.length !== 1 || !Number.isSafeInteger(Number(solo[1])) ||
        images[0].messageId !== Number(solo[1])) return error(400, 'invalid_group_identity')
    const bytes = new TextEncoder().encode(sourceId + ':' + canonicalGroup)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    canonicalGroup = Array.from(new Uint8Array(digest).slice(0, 12), b =>
      b.toString(16).padStart(2, '0')).join('')
  }
  if (!env.PRIVATE_TELEGRAM?.head) return error(503, 'private_storage_unavailable')
  const id = 'tg_' + canonicalGroup
  const already = await env.DB.prepare(
    'SELECT id,name,published,image_count,telegram_revision,telegram_gallery_order FROM models WHERE telegram_origin_id=? AND telegram_group_key=? LIMIT 1',
  ).bind(sourceId, canonicalGroup).first<{
    id: string; name: string; published: number; image_count: number;
    telegram_revision: number; telegram_gallery_order: string
  }>()
  if (already) {
    if (already.id !== id || already.published !== 0) return error(409, 'group_identity_conflict')
    const stored = (await env.DB.prepare(
      'SELECT image_id,source_sha256,position FROM model_image_sources WHERE model_id=? AND gallery_version=1 ORDER BY position',
    ).bind(id).all<{ image_id: string; source_sha256: string; position: number }>()).results
    if (stored.length !== already.image_count || !stored.length) return error(409, 'gallery_integrity_conflict')
    const known = new Map(stored.map(x => [x.image_id, x.source_sha256]))
    const submitted = new Map(images.map(x => ['tg:' + x.messageId, x.sha256]))
    if (Array.from(known).some(([k, v]) => submitted.get(k) !== v)) {
      return error(409, 'gallery_changed_requires_reconciliation')
    }
    const fresh = images.filter(x => !known.has('tg:' + x.messageId))
    if (!fresh.length) {
      // Never overwrite a manually corrected name or a reviewed gallery on replay.
      return { status: 200, data: { id, created: false, reused: true,
        appended: 0, imageCount: stored.length, published: false, name: already.name } }
    }
    const placeholders = fresh.map(() => '?').join(',')
    const otherOwner = (await env.DB.prepare(
      'SELECT model_id,source_sha256 FROM model_image_sources WHERE source_sha256 IN (' +
      placeholders + ') LIMIT 1',
    ).bind(...fresh.map(x => x.sha256)).all()).results
    if (otherOwner.length) return error(409, 'existing_image_collision')
    for (const photo of fresh) {
      for (const role of ['display', 'thumb'] as const) {
        if (!await env.PRIVATE_TELEGRAM.head(key(photo.sha256, role))) {
          return error(409, 'r2_manifest_incomplete')
        }
      }
    }
    const knownIds = stored.map(x => Number(x.image_id.replace(/^tg:/, '')))
    let previousOrder = knownIds
    try {
      const encoded: unknown = JSON.parse(already.telegram_gallery_order || '[]')
      if (Array.isArray(encoded) && encoded.length === knownIds.length &&
          encoded.every(x => Number.isSafeInteger(x) && knownIds.includes(x)) &&
          new Set(encoded).size === knownIds.length) {
        previousOrder = encoded as number[]
      }
    } catch { /* The original source order remains authoritative on malformed metadata. */ }
    const nextOrder = [...previousOrder, ...fresh.map(x => x.messageId)]
    const newCount = stored.length + fresh.length
    const nextRevision = already.telegram_revision + 1
    const encodedOrder = JSON.stringify(nextOrder)
    const append: Statement[] = [
      env.DB.prepare(
        'UPDATE models SET image_count=?,telegram_gallery_order=?,' +
        'telegram_revision=telegram_revision+1,updated_at=CURRENT_TIMESTAMP' +
        ' WHERE id=? AND published=0 AND image_count=? AND telegram_revision=?',
      ).bind(newCount, encodedOrder, id, stored.length, already.telegram_revision),
      ...fresh.map((photo, i) => env.DB.prepare(
        'INSERT INTO model_image_sources(model_id,image_id,position,role,source_sha256,gallery_version)' +
        ' SELECT ?,?,?,?,?,1 WHERE EXISTS (SELECT 1 FROM models WHERE id=? AND published=0' +
        ' AND image_count=? AND telegram_revision=? AND telegram_gallery_order=?)',
      ).bind(id, 'tg:' + photo.messageId, stored.length + i, 'gallery', photo.sha256,
        id, newCount, nextRevision, encodedOrder)),
    ]
    try {
      const applied = await env.DB.batch(append)
      if (applied.length !== append.length || applied.some(x => !x.success) ||
          applied.some(x => !Number.isInteger(x.meta?.changes) || (x.meta?.changes ?? 0) < 1)) {
        return error(409, 'catalog_import_conflict')
      }
    } catch { return error(409, 'catalog_import_conflict') }
    return { status: 200, data: { id, created: false, reused: true,
      appended: fresh.length, imageCount: newCount, published: false, name: already.name } }
  }
  const existingSameId = await env.DB.prepare(
    'SELECT id FROM models WHERE id=? LIMIT 1',
  ).bind(id).first()
  if (existingSameId) return error(409, 'draft_id_conflict')
  // A character name is not a sculpture identity: different studios and
  // variants legitimately create different models. A same-studio/same-variant
  // title is a review candidate, not proof of duplicate bytes.
  // Group key and SHA owners have already been checked above.
  const possibleSameSculpture = await env.DB.prepare(
    'SELECT id FROM models WHERE telegram_studio=? AND name=? COLLATE NOCASE' +
    ' AND COALESCE(variant_name, \'\')=? COLLATE NOCASE AND id<>? LIMIT 1',
  ).bind((studio as string).trim(), (name as string).trim(),
    (variant as string).trim(), id).first()
  if (possibleSameSculpture) return error(409, 'possible_same_studio_sculpture')
  const franchise = await env.DB.prepare(
    'SELECT id FROM franchises WHERE id=? LIMIT 1',
  ).bind(body.franchiseId).first()
  if (!franchise) return error(400, 'unknown_catalog_franchise')

  const placeholders = images.map(() => '?').join(',')
  const collision = (await env.DB.prepare(
    'SELECT model_id,source_sha256 FROM model_image_sources WHERE source_sha256 IN (' +
    placeholders + ') LIMIT 1',
  ).bind(...images.map(x => x.sha256)).all()).results
  if (collision.length) return error(409, 'existing_image_collision')

  for (const photo of images) {
    for (const role of ['display', 'thumb'] as const) {
      const found = await env.PRIVATE_TELEGRAM.head(key(photo.sha256, role))
      if (!found) return error(409, 'r2_manifest_incomplete')
    }
  }
  const studioName = (studio as string).trim()
  const modelName = (name as string).trim()
  const variantName = (variant as string).trim()
  const universeName = (universe as string).trim()
  const cover = key(images[0].sha256, 'display')
  const groupIds = images.map(x => x.messageId)
  const statements: Statement[] = [
    env.DB.prepare(
      'INSERT INTO models(id,franchise_id,slug,code,name,collection,image_count,' +
      'cover_storage_key,gallery_manifest_key,gallery_version,published,search_text,' +
      'variant_name,telegram_group_key,telegram_origin_id,telegram_studio,telegram_character,' +
      'telegram_review_status,telegram_name_provisional,telegram_rights_status,' +
      'telegram_revision,telegram_gallery_order,telegram_showcase_visible) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    ).bind(
      id, body.franchiseId, 'telegram-' + studioName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + group,
      'TG-' + group.toUpperCase(), modelName, 'Telegram Studios · Rascunhos',
      images.length, cover, null, 1, 0, [studioName, modelName, universeName].filter(Boolean).join(' '),
      variantName, canonicalGroup, sourceId, studioName, modelName, 'pending', 1, 'not_reviewed',
      0, JSON.stringify(groupIds), 0,
    ),
    ...images.map((photo, i) => env.DB.prepare(
      'INSERT INTO model_image_sources(model_id,image_id,position,role,source_sha256,gallery_version)' +
      ' VALUES (?,?,?,?,?,?)',
    ).bind(id, 'tg:' + photo.messageId, i, i === 0 ? 'cover' : 'gallery', photo.sha256, 1)),
  ]
  try {
    const result = await env.DB.batch(statements)
    if (result.length !== statements.length || result.some(x => !x.success)) {
      return error(503, 'catalog_import_not_committed')
    }
  } catch {
    // D1 batch is atomic; concurrency may have won the unique group key.
    return error(409, 'catalog_import_conflict')
  }
  return { status: 201, data: { id, created: true, reused: false, imageCount: images.length,
    published: false, reviewStatus: 'pending', provisionalName: true } }
}
