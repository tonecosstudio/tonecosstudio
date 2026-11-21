/**
 * Public, read-only presentation of explicitly visible Telegram studio models.
 * The canonical D1 remains the single source of models, and the private R2
 * binding serves only hashes explicitly associated with a Telegram model.
 * Commercial publication flags and review decisions are never modified here.
 */
import { orderedTelegramGallery } from './telegramGallery'

type D1Statement = {
  bind(...values: unknown[]): D1Statement
  first<T>(): Promise<T | null>
  all<T>(): Promise<{ results: T[] }>
}
type Database = { prepare(sql: string): D1Statement }
type PrivateR2 = { get(key: string): Promise<{ body: ReadableStream | null } | null> }
export type TelegramPublicEnv = { DB: Database; PRIVATE_TELEGRAM?: PrivateR2 }
type ModelRow = {
  id: string; name: string; telegram_studio: string; telegram_character: string
  telegram_origin_id: string; variant_name: string | null; image_count: number
  telegram_name_provisional: number
  telegram_gallery_order: string | null
  category?: string
  category_slug?: string
}
type ImageRow = { image_id: string; source_sha256: string; position: number }

const ROOT = '/api/telegram-studios'
const ID = /^tg_[a-f0-9]{24}$/
const SHA = /^[a-f0-9]{64}$/
const VISIBLE = "m.telegram_group_key IS NOT NULL AND m.telegram_showcase_visible=1 AND m.telegram_review_status<>'rejected' AND m.telegram_rights_status<>'rejected'"
// Only previously authorized list metadata is cached (60s model lists, 300s
// aggregate studio counts); detail/media recheck revocation on every request.
const LIST_CACHE_CONTROL = 'public, max-age=0, s-maxage=60'
const STUDIO_DIRECTORY_CACHE_CONTROL = 'public, max-age=0, s-maxage=300'
const metadataCache = (request: Request, cacheControl = LIST_CACHE_CONTROL) =>
  request.headers.has('authorization') || request.headers.has('cookie') ? 'no-store' : cacheControl

type PublicEdgeCache = {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
}
type BackgroundTasks = { waitUntil(promise: Promise<unknown>): void }

/**
 * Reuse the existing Cloudflare edge cache on anonymous public metadata only.
 * No cache namespace, KV, R2 objects or D1 counters are created. Details,
 * individual media, errors and authenticated requests always recheck storage.
 * Cache API is regional; a miss in another colo is not a publication grant.
 */
async function serveCachedMetadata(
  request: Request,
  build: () => Promise<Response>,
  background?: BackgroundTasks,
): Promise<Response> {
  const allowed = request.method === 'GET' &&
    !request.headers.has('authorization') && !request.headers.has('cookie') &&
    !request.headers.has('range') && !request.headers.has('if-none-match') &&
    !request.headers.has('if-modified-since')
  const cache = allowed
    ? (globalThis as unknown as { caches?: { default?: PublicEdgeCache } }).caches?.default
    : undefined
  if (!cache) return build()

  // The route already validated allowed parameters and rejected duplicates.
  // Canonicalize equivalent public-list URLs so parameter order and omitted
  // pagination defaults do not multiply D1 reads on regional cache misses.
  // Do not normalize studio, search, category or provisional filters.
  const cacheUrl = new URL(request.url)
  if (cacheUrl.pathname === ROOT) {
    if (!cacheUrl.searchParams.has('limit')) cacheUrl.searchParams.set('limit', '24')
    if (!cacheUrl.searchParams.has('offset')) cacheUrl.searchParams.set('offset', '0')
  }
  cacheUrl.searchParams.sort()
  // Recreate a header-free request: user-controlled headers never vary the key.
  const key = new Request(cacheUrl.toString(), { method: 'GET' })
  try {
    const hit = await cache.match(key)
    if (hit?.status === 200) return hit
  } catch {
    // An unavailable cache is a miss, never a catalog outage.
  }

  const response = await build()
  if (response.status === 200 && response.headers.get('cache-control')?.startsWith('public,')) {
    const write = cache.put(key, response.clone()).catch(() => {
      // Cache insertion failures must never hide a valid D1 response.
    })
    if (background) background.waitUntil(write)
    else await write
  }
  return response
}

function json(data: unknown, status = 200, cacheControl = 'no-store') {
  return new Response(JSON.stringify(data), { status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': cacheControl, 'x-content-type-options': 'nosniff',
  } })
}
function normalize(m: ModelRow) {
  return {
    id: m.id, name: m.name, studio: m.telegram_studio, character: m.telegram_character,
    variant: m.variant_name || '', imageCount: Number(m.image_count),
    provisional: m.telegram_name_provisional === 1,
    category: m.category || '', categorySlug: m.category_slug || '',
  }
}
export async function routeTelegramStudioShowcase(
  request: Request, env: TelegramPublicEnv, background?: BackgroundTasks,
): Promise<Response> {
  const url = new URL(request.url)
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405)
  if (!env.DB || !env.PRIVATE_TELEGRAM) return json({ error: 'catalog_studios_unavailable' }, 503)
  try {
    if (url.pathname === ROOT + '/studios') {
      if (url.search) return json({ error: 'invalid_query' }, 400)
      return await serveCachedMetadata(request, async () => {
        const rows = (await env.DB.prepare("SELECT m.telegram_studio AS studio, COUNT(*) AS total FROM models m WHERE " +
          VISIBLE + " GROUP BY m.telegram_studio ORDER BY m.telegram_studio COLLATE NOCASE")
          .all<{ studio: string; total: number }>()).results
        return json({ studios: rows }, 200, metadataCache(request, STUDIO_DIRECTORY_CACHE_CONTROL))
      }, background)
    }
    if (url.pathname === ROOT) {
      const studio = url.searchParams.get('studio') ?? ''
      const q = url.searchParams.get('q')?.trim() ?? ''
      const provisional = url.searchParams.get('provisional')
      const category = url.searchParams.get('category') ?? ''
      const rawOffset = url.searchParams.get('offset') ?? '0'
      const rawLimit = url.searchParams.get('limit') ?? '24'
      const allowed = new Set(['studio', 'q', 'category', 'provisional', 'offset', 'limit'])
      if ([...url.searchParams.keys()].some(k => !allowed.has(k) || url.searchParams.getAll(k).length !== 1) ||
          studio.length > 120 || /\p{Cc}/u.test(studio) ||
          category.length > 80 || (category !== '' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) ||
          q.length > 80 || /\p{Cc}/u.test(q) ||
          (provisional !== null && provisional !== '0' && provisional !== '1') ||
          !/^(0|[1-9]\d{0,4})$/.test(rawOffset) ||
          !/^[1-9]\d?$/.test(rawLimit) || Number(rawLimit) > 48)
        return json({ error: 'invalid_query' }, 400)
      return await serveCachedMetadata(request, async () => {
      const where = [VISIBLE]
      const values: unknown[] = []
      if (studio) { where.push('m.telegram_studio=?'); values.push(studio) }
      if (category) { where.push('m.franchise_id IN (SELECT f.id FROM franchises f JOIN categories c ON c.id=f.category_id WHERE c.slug=?)'); values.push(category) }
      if (provisional !== null) {
        where.push('m.telegram_name_provisional=' + (provisional === '1' ? '1' : '0'))
      }
      if (q) {
        const term = '%' + q.replace(/[%_\\]/g, '') + '%'
        where.push("(m.name LIKE ? OR m.telegram_character LIKE ? OR COALESCE(m.variant_name,'') LIKE ?)")
        values.push(term, term, term)
      }
      const condition = where.join(' AND ')
      const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM models m WHERE ' + condition)
        .bind(...values).first<{ total: number }>()
      // Materialize only the page IDs before resolving cover/gallery and taxonomy.
      // Prevent correlated image-source lookups across the entire filtered set.
      const rows = (await env.DB.prepare(
        'WITH page AS MATERIALIZED (' +
        ' SELECT m.id FROM models m WHERE ' + condition +
        ' ORDER BY m.name COLLATE NOCASE,m.telegram_studio COLLATE NOCASE,m.id LIMIT ? OFFSET ?)' +
        ' SELECT m.id,m.name,m.telegram_studio,m.telegram_character,m.telegram_origin_id,m.variant_name,m.image_count,m.telegram_name_provisional,' +
        ' (SELECT c.name FROM franchises f JOIN categories c ON c.id=f.category_id WHERE f.id=m.franchise_id) AS category,' +
        ' (SELECT c.slug FROM franchises f JOIN categories c ON c.id=f.category_id WHERE f.id=m.franchise_id) AS category_slug,' +
        ' (SELECT s.source_sha256 FROM model_image_sources s WHERE s.model_id=m.id AND s.gallery_version=1' +
        ' ORDER BY CASE WHEN m.cover_storage_key=(' +
        " 'telegram-studios/v1/' || m.telegram_origin_id || '/telegram-webp-final-v1/' ||" +
        " substr(s.source_sha256,1,2) || '/' || s.source_sha256 || '/display.webp')" +
        ' THEN 0 ELSE 1 END, s.position LIMIT 1) AS cover_sha' +
        ' FROM page p JOIN models m ON m.id=p.id' +
        ' ORDER BY m.name COLLATE NOCASE,m.telegram_studio COLLATE NOCASE,m.id')
        .bind(...values, Number(rawLimit), Number(rawOffset)).all<ModelRow & {cover_sha: string|null}>()).results
      return json({ total: count?.total ?? 0, offset: Number(rawOffset), limit: Number(rawLimit),
        items: rows.map(m => ({...normalize(m), cover: m.cover_sha && SHA.test(m.cover_sha)
          ? ROOT + '/' + m.id + '/media/' + m.cover_sha + '/thumb' : null})) }, 200, metadataCache(request))
      }, background)
    }
    const mediaMatch = new RegExp('^' + ROOT + '/(tg_[a-f0-9]{24})/media/([a-f0-9]{64})/(thumb|display)$').exec(url.pathname)
    const detailMatch = new RegExp('^' + ROOT + '/(tg_[a-f0-9]{24})$').exec(url.pathname)
    if (!mediaMatch && !detailMatch) return json({ error: 'not_found' }, 404)
    if (url.search) return json({ error: 'invalid_query' }, 400)
    const id = (mediaMatch || detailMatch)![1]
    if (!ID.test(id)) return json({ error: 'not_found' }, 404)
    const model = await env.DB.prepare('SELECT m.id,m.name,m.telegram_studio,m.telegram_character,m.telegram_origin_id,' +
      'm.variant_name,m.image_count,m.telegram_name_provisional,m.telegram_gallery_order FROM models m WHERE m.id=? AND ' + VISIBLE + ' LIMIT 1')
      .bind(id).first<ModelRow>()
    if (!model) return json({ error: 'not_found' }, 404)
    if (mediaMatch) {
      const sha = mediaMatch[2], role = mediaMatch[3]
      if (!SHA.test(sha) || !/^\d{1,30}$/.test(model.telegram_origin_id)) return json({ error: 'not_found' }, 404)
      const source = await env.DB.prepare('SELECT s.source_sha256 FROM model_image_sources s ' +
        'WHERE s.model_id=? AND s.source_sha256=? AND s.gallery_version=1 LIMIT 1')
        .bind(id, sha).first<{ source_sha256: string }>()
      if (!source) return json({ error: 'not_found' }, 404)
      const key = 'telegram-studios/v1/' + model.telegram_origin_id + '/telegram-webp-final-v1/' +
        sha.slice(0, 2) + '/' + sha + '/' + role + '.webp'
      const obj = await env.PRIVATE_TELEGRAM.get(key)
      if (!obj?.body) return json({ error: 'media_not_found' }, 404)
      return new Response(obj.body, { headers: {
        'content-type': 'image/webp', 'x-content-type-options': 'nosniff',
        'cache-control': 'no-store',
      } })
    }
    const images = (await env.DB.prepare('SELECT image_id,source_sha256,position FROM model_image_sources ' +
      'WHERE model_id=? AND gallery_version=1 ORDER BY position,image_id LIMIT 80')
      .bind(id).all<ImageRow>()).results
    const ordered = orderedTelegramGallery(images, model.telegram_gallery_order)
      .filter(x => SHA.test(x.source_sha256))
    return json({...normalize(model), images: ordered.map((x, position)=>({
      position, thumb:ROOT+'/'+id+'/media/'+x.source_sha256+'/thumb',
      display:ROOT+'/'+id+'/media/'+x.source_sha256+'/display',
    })) })
  } catch {
    return json({ error: 'catalog_studios_unavailable' }, 503)
  }
}
