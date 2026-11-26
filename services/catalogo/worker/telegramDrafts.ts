/**
 * Private draft editor on the existing catalog Worker and D1.
 * No anonymous route can list drafts or read the separate Telegram R2 binding.
 * Supabase Auth and the canonical is_tonecos_admin RPC remain the authority.
 */
import { importPrivateTelegramDraft, type DraftImportEnv } from './telegramDraftImport'
import { orderedTelegramGallery } from './telegramGallery'

type Statement = {
  bind(...values: unknown[]): Statement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<{ results: T[] }>
  run(): Promise<{ meta?: { changes?: number } }>
}
type Database = { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<Array<{ success: boolean }>> }
type PrivateR2 = {
  get(key: string): Promise<{ body: ReadableStream | null } | null>
  head(key: string): Promise<unknown | null>
}
export type TelegramDraftEnv = {
  DB: Database
  PRIVATE_TELEGRAM?: PrivateR2
  CORS_ORIGINS: string
  ADMIN_SUPABASE_URL?: string
  ADMIN_SUPABASE_ANON_KEY?: string
  TELEGRAM_IMPORT_ACCESS_AUD?: string
  TELEGRAM_IMPORT_ACCESS_CLIENT_ID?: string
}
export type TelegramDraftAccessContext = {
  access?: {
    aud?: string
    getIdentity(): Promise<{
      service_token_id?: string
      service_token_status?: boolean
    } | null>
  }
}

type Draft = {
  id: string
  name: string
  variant_name: string
  telegram_group_key: string
  telegram_origin_id: string
  telegram_studio: string
  telegram_character: string
  telegram_review_status: string
  telegram_rights_status: string
  telegram_name_provisional: number
  telegram_revision: number
  telegram_gallery_order: string
  published: number
  image_count: number
  collection: string | null
}
type Source = { image_id: string; position: number; role: string; source_sha256: string }
const DRAFT_ID = /^tg_[0-9a-f]{24}$/
const SHA = /^[a-f0-9]{64}$/
const ROLES = new Set(['display', 'thumb'])
const REVIEW = new Set(['pending', 'reviewing', 'confirmed', 'rejected'])
const PREFIX = '/api/admin/telegram-drafts'

function headers(request: Request, env: TelegramDraftEnv) {
  const origin = request.headers.get('origin')
  const allowed = new Set((env.CORS_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean))
  const headers: Record<string, string> = {
    'cache-control': 'private, no-store',
    'vary': 'Origin, Authorization',
    'x-content-type-options': 'nosniff',
  }
  if (origin && allowed.has(origin)) {
    headers['access-control-allow-origin'] = origin
    headers['access-control-allow-headers'] = 'authorization, content-type'
    headers['access-control-allow-methods'] = 'GET, PATCH, POST, OPTIONS'
    headers['access-control-max-age'] = '600'
  }
  return headers
}
function result(request: Request, env: TelegramDraftEnv, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...headers(request, env), 'content-type': 'application/json; charset=utf-8' },
  })
}
async function verifyAdmin(request: Request, env: TelegramDraftEnv): Promise<boolean | null> {
  // Missing config is a service failure, never an authorization bypass.
  const base = env.ADMIN_SUPABASE_URL
  const apikey = env.ADMIN_SUPABASE_ANON_KEY
  if (!base || !apikey || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(base)) return null
  const authorization = request.headers.get('authorization') || ''
  if (!/^Bearer [A-Za-z0-9._~-]{60,8192}$/.test(authorization)) return false
  const h = { apikey, authorization, 'content-type': 'application/json' }
  try {
    const user = await fetch(base.replace(/\/$/, '') + '/auth/v1/user', {
      headers: h, signal: AbortSignal.timeout(8000),
    })
    if (!user.ok) return false
    const identity = await user.json() as { id?: string; is_anonymous?: boolean }
    if (!identity.id || identity.is_anonymous) return false
    const check = await fetch(base.replace(/\/$/, '') + '/rest/v1/rpc/is_tonecos_admin', {
      method: 'POST', headers: h, body: '{}', signal: AbortSignal.timeout(8000),
    })
    return check.ok && await check.json() === true
  } catch {
    // An unreachable authority must not grant access.
    return false
  }
}
async function verifyImportService(
  env: TelegramDraftEnv, context?: TelegramDraftAccessContext,
): Promise<boolean> {
  const expectedAud = env.TELEGRAM_IMPORT_ACCESS_AUD
  const expectedClientId = env.TELEGRAM_IMPORT_ACCESS_CLIENT_ID
  if (!expectedAud || !expectedClientId || !context?.access ||
      context.access.aud !== expectedAud) return false
  try {
    const identity = await context.access.getIdentity()
    return identity?.service_token_status === true &&
      identity.service_token_id === expectedClientId
  } catch {
    return false
  }
}
const FIELDS = `m.id,m.name,m.variant_name,m.collection,m.published,m.image_count,
  m.telegram_group_key,m.telegram_origin_id,m.telegram_studio,m.telegram_character,
  m.telegram_review_status,m.telegram_rights_status,m.telegram_name_provisional,
  m.telegram_revision,m.telegram_gallery_order`
async function findDraft(db: Database, id: string): Promise<Draft | null> {
  return db.prepare(`SELECT ${FIELDS} FROM models m
    WHERE m.id=? AND m.telegram_group_key IS NOT NULL AND m.published=0 LIMIT 1`)
    .bind(id).first<Draft>()
}
async function sources(db: Database, id: string) {
  return (await db.prepare(`SELECT image_id,position,role,source_sha256
    FROM model_image_sources WHERE model_id=? AND gallery_version=1
    ORDER BY position,image_id LIMIT 80`).bind(id).all<Source>()).results
}
function detail(draft: Draft, images: Source[]) {
  const ordered = orderedTelegramGallery(images, draft.telegram_gallery_order)
  return {
    id: draft.id,
    source: 'telegram_studios',
    studio: draft.telegram_studio,
    name: draft.name,
    character: draft.telegram_character,
    variant: draft.variant_name,
    collection: draft.collection,
    groupKey: draft.telegram_group_key,
    originId: draft.telegram_origin_id,
    provisionalName: draft.telegram_name_provisional === 1,
    reviewStatus: draft.telegram_review_status,
    rightsStatus: draft.telegram_rights_status,
    revision: draft.telegram_revision,
    published: false,
    imageCount: ordered.length,
    images: ordered.map((s, index) => ({
      messageId: Number(s.image_id.replace(/^tg:/, '')),
      sha256: s.source_sha256,
      position: index,
      role: index === 0 ? 'cover' : 'gallery',
      thumbPath: `${PREFIX}/${encodeURIComponent(draft.id)}/media/${s.source_sha256}/thumb`,
      displayPath: `${PREFIX}/${encodeURIComponent(draft.id)}/media/${s.source_sha256}/display`,
    })),
  }
}
function validText(value: unknown, max: number, required: boolean): value is string {
  return typeof value === 'string' && value.length <= max &&
    !/\p{Cc}/u.test(value) &&
    (!required || value.trim().length > 0)
}

export async function routeTelegramDrafts(
  request: Request, env: TelegramDraftEnv, context?: TelegramDraftAccessContext,
): Promise<Response> {
  const url = new URL(request.url)
  if (request.method === 'OPTIONS') {
    return headers(request, env)['access-control-allow-origin']
      ? new Response(null, { status: 204, headers: headers(request, env) })
      : new Response(null, { status: 403 })
  }
  if (!['GET', 'PATCH', 'POST'].includes(request.method)) return result(request, env, { error: 'method_not_allowed' }, 405)
  const isImportPost = request.method === 'POST' && url.pathname === PREFIX + '/import'
  const serviceAuthorized = isImportPost && await verifyImportService(env, context)
  if (!serviceAuthorized) {
    const auth = await verifyAdmin(request, env)
    if (auth === null) return result(request, env, { error: 'admin_auth_unconfigured' }, 503)
    if (!auth) return result(request, env, { error: 'admin_required' }, 403)
  }
  if (url.pathname === PREFIX + '/import') {
    if (request.method !== 'POST') return result(request, env, { error: 'method_not_allowed' }, 405)
    const output = await importPrivateTelegramDraft(request, env as unknown as DraftImportEnv)
    return result(request, env, output.data, output.status)
  }
  if (request.method === 'POST') return result(request, env, { error: 'method_not_allowed' }, 405)
  if (url.pathname === PREFIX + '/studios' && request.method === 'GET') {
    const studios = (await env.DB.prepare(`SELECT telegram_studio AS studio,COUNT(*) AS total
      FROM models WHERE telegram_group_key IS NOT NULL AND published=0
      GROUP BY telegram_studio ORDER BY telegram_studio COLLATE NOCASE`)
      .all<{ studio: string; total: number }>()).results
    return result(request, env, { studios })
  }
  if (url.pathname === PREFIX && request.method === 'GET') {
    const studio = url.searchParams.get('studio')?.trim() || ''
    const limit = Math.min(30, Math.max(1, Number(url.searchParams.get('limit')) || 12))
    const offset = Math.min(10000, Math.max(0, Number(url.searchParams.get('offset')) || 0))
    if (!Number.isSafeInteger(limit) || !Number.isSafeInteger(offset) || studio.length > 100) {
      return result(request, env, { error: 'invalid_query' }, 400)
    }
    const where = `m.telegram_group_key IS NOT NULL AND m.published=0
      AND (?='' OR m.telegram_studio=?)`
    const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM models m WHERE ${where}`)
      .bind(studio, studio).first<{total: number}>()
    const items = (await env.DB.prepare(`SELECT ${FIELDS} FROM models m
      WHERE ${where} ORDER BY m.created_at DESC,m.id DESC LIMIT ? OFFSET ?`)
      .bind(studio, studio, limit, offset).all<Draft>()).results
    return result(request, env, {
      total: count?.total || 0, limit, offset,
      items: items.map(x => ({
        id: x.id, name: x.name, studio: x.telegram_studio,
        character: x.telegram_character, variant: x.variant_name,
        reviewStatus: x.telegram_review_status, provisionalName: x.telegram_name_provisional===1,
        imageCount: x.image_count, revision: x.telegram_revision,
      })),
    })
  }
  const match = url.pathname.match(/^\/api\/admin\/telegram-drafts\/(tg_[0-9a-f]{24})(?:\/media\/([0-9a-f]{64})\/(display|thumb))?$/)
  if (!match) return result(request, env, { error: 'not_found' }, 404)
  const [, id, digest, role] = match
  if (!DRAFT_ID.test(id)) return result(request, env, { error: 'invalid_id' }, 400)
  const model = await findDraft(env.DB, id)
  if (!model || model.telegram_origin_id !== '2370335738') {
    return result(request, env, { error: 'not_found' }, 404)
  }
  if (digest && role) {
    if (request.method !== 'GET' || !SHA.test(digest) || !ROLES.has(role)) {
      return result(request, env, { error: 'not_found' }, 404)
    }
    const owned = await env.DB.prepare(`SELECT source_sha256 FROM model_image_sources
      WHERE model_id=? AND source_sha256=? AND gallery_version=1 LIMIT 1`)
      .bind(id, digest).first<{ source_sha256: string }>()
    if (!owned) return result(request, env, { error: 'not_found' }, 404)
    if (!env.PRIVATE_TELEGRAM) return result(request, env, { error: 'private_storage_unavailable' }, 503)
    const key = `telegram-studios/v1/2370335738/telegram-webp-final-v1/${digest.slice(0,2)}/${digest}/${role}.webp`
    const object = await env.PRIVATE_TELEGRAM.get(key)
    if (!object?.body) return result(request, env, { error: 'media_not_found' }, 404)
    return new Response(object.body, {
      status: 200, headers: { ...headers(request, env), 'content-type': 'image/webp',
        'content-security-policy': "default-src 'none'" },
    })
  }
  if (request.method === 'GET') return result(request, env, detail(model, await sources(env.DB, id)))
  let input: unknown
  try {
    if (Number(request.headers.get('content-length') || 0) > 8192) throw Error('too_big')
    input = await request.json()
  } catch {
    return result(request, env, { error: 'invalid_body' }, 400)
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return result(request, env, { error: 'invalid_body' }, 400)
  }
  const body = input as Record<string, unknown>
  const accepted = new Set(['revision','name','studio','character','variant','reviewStatus','imageOrder'])
  if (Object.keys(body).some(x => !accepted.has(x)) || !Number.isSafeInteger(body.revision) ||
      body.revision !== model.telegram_revision ||
      !Object.keys(body).some(x => x !== 'revision')) {
    return result(request, env, { error: 'invalid_revision_or_fields' }, 409)
  }
  const name = body.name === undefined ? model.name : body.name
  const studio = body.studio === undefined ? model.telegram_studio : body.studio
  const character = body.character === undefined ? model.telegram_character : body.character
  const variant = body.variant === undefined ? model.variant_name : body.variant
  const status = body.reviewStatus === undefined ? model.telegram_review_status : body.reviewStatus
  if (!validText(name, 160, true) || !validText(studio, 120, true) ||
      !validText(character, 160, false) || !validText(variant, 160, false) ||
      typeof status !== 'string' || !REVIEW.has(status)) {
    return result(request, env, { error: 'invalid_field_values' }, 400)
  }
  const images = await sources(env.DB, id)
  const current = detail(model, images).images
  const ids = current.map(x => x.messageId)
  const requested = body.imageOrder
  const validOrder = requested === undefined || (
    Array.isArray(requested) && requested.length === ids.length &&
    requested.every(x => Number.isSafeInteger(x) && ids.includes(x)) &&
    new Set(requested).size === ids.length
  )
  if (!validOrder) return result(request, env, { error: 'invalid_gallery_order' }, 400)
  const order = requested === undefined ? ids : requested as number[]
  const first = images.find(x => Number(x.image_id.replace(/^tg:/, '')) === order[0])
  if (!first) return result(request, env, { error: 'empty_gallery' }, 409)
  const cover = `telegram-studios/v1/2370335738/telegram-webp-final-v1/${first.source_sha256.slice(0,2)}/${first.source_sha256}/display.webp`
  const stored = await env.DB.prepare(`UPDATE models SET
    name=?,telegram_studio=?,telegram_character=?,variant_name=?,
    telegram_review_status=?,
    telegram_name_provisional=CASE WHEN ?='confirmed' THEN 0 ELSE telegram_name_provisional END,
    telegram_gallery_order=?,cover_storage_key=?,
    telegram_revision=telegram_revision+1,search_text=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND telegram_group_key IS NOT NULL AND published=0 AND telegram_revision=?`)
    .bind(name.trim(),studio.trim(),character.trim(),variant.trim(),status,status,
      JSON.stringify(order),cover,
      [studio.trim(),name.trim(),character.trim(),variant.trim()].filter(Boolean).join(' '),
      id,model.telegram_revision).run()
  // D1 counts FTS maintenance triggers in meta.changes; one matched model can report >1.
  if (!Number.isInteger(stored.meta?.changes) || (stored.meta?.changes ?? 0) < 1) {
    return result(request, env, { error: 'revision_conflict' }, 409)
  }
  const latest = await findDraft(env.DB,id)
  if (!latest) return result(request, env, { error: 'draft_not_found' }, 404)
  if (latest.telegram_revision !== model.telegram_revision + 1) {
    return result(request, env, { error: 'revision_conflict' }, 409)
  }
  return result(request, env, detail(latest, await sources(env.DB,id)))
}
