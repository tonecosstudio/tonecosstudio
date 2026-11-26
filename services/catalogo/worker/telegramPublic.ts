import { serveCachedPublicMetadata, type BackgroundTasks } from './publicMetadataCache'
/**
 * Public, read-only presentation of explicitly visible Telegram studio models.
 * The canonical D1 remains the single source of models, and the private R2
 * binding serves only hashes explicitly associated with a Telegram model.
 * Commercial publication flags and review decisions are never modified here.
 */
import { orderedTelegramGallery } from './telegramGallery'
import { loadCanonicalPublicModelTags, type CanonicalPublicTag } from './publicModelTags'

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
  franchise?: string
  franchise_slug?: string
}
type ImageRow = { image_id: string; source_sha256: string; position: number }

const ROOT = '/api/telegram-studios'
const ID = /^tg_[a-f0-9]{24}$/
const SHA = /^[a-f0-9]{64}$/
export const TELEGRAM_PUBLIC_VISIBLE_SQL = "m.telegram_group_key IS NOT NULL AND m.telegram_showcase_visible=1 AND m.telegram_review_status<>'rejected' AND m.telegram_rights_status<>'rejected'"
// Only previously authorized list metadata is cached (60s model lists, 300s
// aggregate studio counts); detail/media recheck revocation on every request.
// Shared projection: resolve the authorized gallery's cover using canonical order.
export const TELEGRAM_PUBLIC_COVER_SHA_SQL = "(SELECT s.source_sha256 FROM model_image_sources s WHERE s.model_id=m.id AND s.gallery_version=1" +
  " ORDER BY CASE WHEN m.cover_storage_key=('telegram-studios/v1/' || m.telegram_origin_id || '/telegram-webp-final-v1/' ||" +
  " substr(s.source_sha256,1,2) || '/' || s.source_sha256 || '/display.webp')" +
  " THEN 0 ELSE 1 END, s.position LIMIT 1)"
const VISIBLE = TELEGRAM_PUBLIC_VISIBLE_SQL
// Identification is independent from editorial confirmation (provisional=1
// includes real, probable names). Only the canonical placeholder title is
// classified as unidentified; keep the visibility/rights gate unchanged.
const UNIDENTIFIED = "(TRIM(COALESCE(m.name,''))='' OR LOWER(TRIM(m.name)) LIKE 'modelo sem nome%' OR LOWER(TRIM(m.name)) LIKE 'modelo tg-%' OR LOWER(TRIM(m.name)) IN ('sem nome','a identificar','unknown','unnamed','untitled'))"
function identityCondition(identity: string | null) {
  return identity === 'unidentified' ? UNIDENTIFIED :
    identity === 'identified' ? 'NOT ' + UNIDENTIFIED : ''
}
const LIST_CACHE_CONTROL = 'public, max-age=0, s-maxage=60'
const STUDIO_DIRECTORY_CACHE_CONTROL = 'public, max-age=0, s-maxage=300'
const metadataCache = (request: Request, cacheControl = LIST_CACHE_CONTROL) =>
  request.headers.has('authorization') || request.headers.has('cookie') ? 'no-store' : cacheControl

function serveCachedMetadata(request: Request, build: () => Promise<Response>, background?: BackgroundTasks) {
  return serveCachedPublicMetadata(request, build, background, url => {
    if (url.pathname === ROOT) {
      if (!url.searchParams.has('limit')) url.searchParams.set('limit', '24')
      if (!url.searchParams.has('offset')) url.searchParams.set('offset', '0')
    }
  })
}

function json(data: unknown, status = 200, cacheControl = 'no-store') {
  return new Response(JSON.stringify(data), { status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': cacheControl, 'x-content-type-options': 'nosniff',
  } })
}
function normalize(m: ModelRow, tags: CanonicalPublicTag[] = []) {
  return {
    id: m.id, name: m.name, studio: m.telegram_studio,
    variant: m.variant_name || '', imageCount: Number(m.image_count),
    provisional: m.telegram_name_provisional === 1,
    category: m.category || '', categorySlug: m.category_slug || '',
    franchise: m.franchise || '', franchiseSlug: m.franchise_slug || '',
    tags,
  }
}
export async function routeTelegramStudioShowcase(
  request: Request, env: TelegramPublicEnv, background?: BackgroundTasks,
): Promise<Response> {
  const url = new URL(request.url)
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405)
  if (!env.DB || !env.PRIVATE_TELEGRAM) return json({ error: 'catalog_studios_unavailable' }, 503)
  try {
    const identity = url.searchParams.get('identity')
    const validIdentity = identity === null || identity === 'identified' || identity === 'unidentified'
    if (url.pathname === ROOT + '/studios') {
      if (!validIdentity || [...url.searchParams.keys()].some(k => k !== 'identity' || url.searchParams.getAll(k).length !== 1))
        return json({ error: 'invalid_query' }, 400)
      return await serveCachedMetadata(request, async () => {
        const rows = (await env.DB.prepare("SELECT m.telegram_studio AS studio, COUNT(*) AS total FROM models m WHERE " +
          VISIBLE + (identityCondition(identity) ? ' AND ' + identityCondition(identity) : '') + " GROUP BY m.telegram_studio ORDER BY m.telegram_studio COLLATE NOCASE")
          .all<{ studio: string; total: number }>()).results
        return json({ studios: rows }, 200, metadataCache(request, STUDIO_DIRECTORY_CACHE_CONTROL))
      }, background)
    }
    if (url.pathname === ROOT) {
      const studio = url.searchParams.get('studio') ?? ''
      const q = url.searchParams.get('q')?.trim() ?? ''
      const provisional = url.searchParams.get('provisional')
      const category = url.searchParams.get('category') ?? ''
      const franchise = url.searchParams.get('franchise') ?? ''
      const characterId = url.searchParams.get('character_id') ?? ''
      const attributeId = url.searchParams.get('attribute_id') ?? ''
      const rawOffset = url.searchParams.get('offset') ?? '0'
      const rawLimit = url.searchParams.get('limit') ?? '24'
      const allowed = new Set(['studio', 'q', 'category', 'franchise', 'character_id', 'attribute_id', 'provisional', 'identity', 'offset', 'limit'])
      if (!validIdentity || [...url.searchParams.keys()].some(k => !allowed.has(k) || url.searchParams.getAll(k).length !== 1) ||
          studio.length > 120 || /\p{Cc}/u.test(studio) ||
          category.length > 80 || (category !== '' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) ||
          franchise.length > 80 || (franchise !== '' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(franchise)) ||
          (characterId && !/^[A-Za-z0-9_-]{3,100}$/.test(characterId)) ||
          (attributeId && !/^[A-Za-z0-9_-]{3,100}$/.test(attributeId)) ||
          (characterId && attributeId) ||
          ((characterId || attributeId) && !franchise) ||
          q.length > 80 || /\p{Cc}/u.test(q) ||
          (provisional !== null && provisional !== '0' && provisional !== '1') ||
          !/^(0|[1-9]\d{0,4})$/.test(rawOffset) ||
          !/^[1-9]\d?$/.test(rawLimit) || Number(rawLimit) > 48)
        return json({ error: 'invalid_query' }, 400)
      return await serveCachedMetadata(request, async () => {
      const where = [VISIBLE]
      const identityFilter = identityCondition(identity)
      if (identityFilter) where.push(identityFilter)
      const values: unknown[] = []
      if (studio) { where.push('m.telegram_studio=?'); values.push(studio) }
      if (category) { where.push('m.franchise_id IN (SELECT f.id FROM franchises f JOIN categories c ON c.id=f.category_id WHERE c.slug=?)'); values.push(category) }
      if (franchise) { where.push('m.franchise_id IN (SELECT f.id FROM franchises f WHERE f.slug=?)'); values.push(franchise) }
      if (characterId) {
        where.push(`EXISTS (
          SELECT 1 FROM catalog_model_characters mc
          JOIN catalog_characters character ON character.id=mc.character_id
          WHERE mc.model_id=m.id AND mc.character_id=? AND mc.review_state='confirmed'
            AND character.status='confirmed' AND m.telegram_name_provisional=0
        )`)
        values.push(characterId)
      }
      if (attributeId) {
        where.push(`EXISTS (
          SELECT 1 FROM catalog_model_characters mc
          JOIN catalog_character_attributes ca ON ca.character_id=mc.character_id
          JOIN catalog_characters character ON character.id=mc.character_id
          JOIN catalog_attributes attribute ON attribute.id=ca.attribute_id
          WHERE mc.model_id=m.id AND attribute.id=? AND mc.review_state='confirmed'
            AND character.status='confirmed' AND attribute.status='confirmed'
            AND m.telegram_name_provisional=0
        )`)
        values.push(attributeId)
      }
      if (provisional !== null) {
        where.push('m.telegram_name_provisional=' + (provisional === '1' ? '1' : '0'))
      }
      if (q) {
        const term = '%' + q.replace(/[%_\\]/g, '') + '%'
        where.push("(m.name LIKE ? OR m.telegram_character LIKE ? OR COALESCE(m.variant_name,'') LIKE ? OR m.franchise_id IN (SELECT f.id FROM franchises f WHERE f.name LIKE ?))")
        values.push(term, term, term, term)
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
        ' (SELECT f.name FROM franchises f WHERE f.id=m.franchise_id) AS franchise,' +
        ' (SELECT f.slug FROM franchises f WHERE f.id=m.franchise_id) AS franchise_slug,' +
        ' ' + TELEGRAM_PUBLIC_COVER_SHA_SQL + ' AS cover_sha' +
        ' FROM page p JOIN models m ON m.id=p.id' +
        ' ORDER BY m.name COLLATE NOCASE,m.telegram_studio COLLATE NOCASE,m.id')
        .bind(...values, Number(rawLimit), Number(rawOffset)).all<ModelRow & {cover_sha: string|null}>()).results
      const tags = await loadCanonicalPublicModelTags(env.DB, rows)
      return json({ total: count?.total ?? 0, offset: Number(rawOffset), limit: Number(rawLimit),
        items: rows.map(m => ({...normalize(m, tags.get(m.id) ?? []), cover: m.cover_sha && SHA.test(m.cover_sha)
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
      'm.variant_name,m.image_count,m.telegram_name_provisional,m.telegram_gallery_order,' +
      ' (SELECT f.name FROM franchises f WHERE f.id=m.franchise_id) AS franchise,' +
      ' (SELECT f.slug FROM franchises f WHERE f.id=m.franchise_id) AS franchise_slug,' +
      ' (SELECT c.name FROM franchises f JOIN categories c ON c.id=f.category_id WHERE f.id=m.franchise_id) AS category,' +
      ' (SELECT c.slug FROM franchises f JOIN categories c ON c.id=f.category_id WHERE f.id=m.franchise_id) AS category_slug' +
      ' FROM models m WHERE m.id=? AND ' + VISIBLE + ' LIMIT 1')
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
    const tags = await loadCanonicalPublicModelTags(env.DB, [model])
    return json({...normalize(model, tags.get(model.id) ?? []), images: ordered.map((x, position)=>({
      position, thumb:ROOT+'/'+id+'/media/'+x.source_sha256+'/thumb',
      display:ROOT+'/'+id+'/media/'+x.source_sha256+'/display',
    })) })
  } catch {
    return json({ error: 'catalog_studios_unavailable' }, 503)
  }
}
