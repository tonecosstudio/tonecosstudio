/**
 * Public, read-only presentation of explicitly visible Telegram studio models.
 * The canonical D1 remains the single source of models, and the private R2
 * binding serves only hashes explicitly associated with a Telegram model.
 * Commercial publication flags and review decisions are never modified here.
 */
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
}
type ImageRow = { image_id: string; source_sha256: string; position: number }

const ROOT = '/api/telegram-studios'
const ID = /^tg_[a-f0-9]{24}$/
const SHA = /^[a-f0-9]{64}$/
const VISIBLE = "m.telegram_group_key IS NOT NULL AND m.telegram_showcase_visible=1 AND m.telegram_review_status<>'rejected' AND m.telegram_rights_status<>'rejected'"

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
  } })
}
function normalize(m: ModelRow) {
  return {
    id: m.id, name: m.name, studio: m.telegram_studio, character: m.telegram_character,
    variant: m.variant_name || '', imageCount: Number(m.image_count),
    provisional: m.telegram_name_provisional === 1,
  }
}
export async function routeTelegramStudioShowcase(request: Request, env: TelegramPublicEnv): Promise<Response> {
  const url = new URL(request.url)
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405)
  if (!env.DB || !env.PRIVATE_TELEGRAM) return json({ error: 'catalog_studios_unavailable' }, 503)
  try {
    if (url.pathname === ROOT + '/studios') {
      if (url.search) return json({ error: 'invalid_query' }, 400)
      const rows = (await env.DB.prepare("SELECT m.telegram_studio AS studio, COUNT(*) AS total FROM models m WHERE " +
        VISIBLE + " GROUP BY m.telegram_studio ORDER BY m.telegram_studio COLLATE NOCASE")
        .all<{ studio: string; total: number }>()).results
      return json({ studios: rows })
    }
    if (url.pathname === ROOT) {
      const studio = url.searchParams.get('studio') ?? ''
      const q = url.searchParams.get('q')?.trim() ?? ''
      const provisional = url.searchParams.get('provisional')
      const rawOffset = url.searchParams.get('offset') ?? '0'
      const rawLimit = url.searchParams.get('limit') ?? '24'
      const allowed = new Set(['studio', 'q', 'provisional', 'offset', 'limit'])
      if ([...url.searchParams.keys()].some(k => !allowed.has(k) || url.searchParams.getAll(k).length !== 1) ||
          studio.length > 120 || /\p{Cc}/u.test(studio) ||
          q.length > 80 || /\p{Cc}/u.test(q) ||
          (provisional !== null && provisional !== '0' && provisional !== '1') ||
          !/^(0|[1-9]\d{0,4})$/.test(rawOffset) ||
          !/^[1-9]\d?$/.test(rawLimit) || Number(rawLimit) > 48)
        return json({ error: 'invalid_query' }, 400)
      const where = [VISIBLE]
      const values: unknown[] = []
      if (studio) { where.push('m.telegram_studio=?'); values.push(studio) }
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
      const rows = (await env.DB.prepare(
        'SELECT m.id,m.name,m.telegram_studio,m.telegram_character,m.telegram_origin_id,m.variant_name,m.image_count,m.telegram_name_provisional,' +
        ' (SELECT s.source_sha256 FROM model_image_sources s WHERE s.model_id=m.id AND s.gallery_version=1 ORDER BY s.position LIMIT 1) AS cover_sha' +
        ' FROM models m WHERE ' + condition +
        ' ORDER BY m.telegram_studio COLLATE NOCASE,m.name COLLATE NOCASE,m.id LIMIT ? OFFSET ?')
        .bind(...values, Number(rawLimit), Number(rawOffset)).all<ModelRow & {cover_sha: string|null}>()).results
      return json({ total: count?.total ?? 0, offset: Number(rawOffset), limit: Number(rawLimit),
        items: rows.map(m => ({...normalize(m), cover: m.cover_sha && SHA.test(m.cover_sha)
          ? ROOT + '/' + m.id + '/media/' + m.cover_sha + '/thumb' : null})) })
    }
    const mediaMatch = new RegExp('^' + ROOT + '/(tg_[a-f0-9]{24})/media/([a-f0-9]{64})/(thumb|display)$').exec(url.pathname)
    const detailMatch = new RegExp('^' + ROOT + '/(tg_[a-f0-9]{24})$').exec(url.pathname)
    if (!mediaMatch && !detailMatch) return json({ error: 'not_found' }, 404)
    if (url.search) return json({ error: 'invalid_query' }, 400)
    const id = (mediaMatch || detailMatch)![1]
    if (!ID.test(id)) return json({ error: 'not_found' }, 404)
    const model = await env.DB.prepare('SELECT m.id,m.name,m.telegram_studio,m.telegram_character,m.telegram_origin_id,' +
      'm.variant_name,m.image_count,m.telegram_name_provisional FROM models m WHERE m.id=? AND ' + VISIBLE + ' LIMIT 1')
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
    return json({...normalize(model), images: images.filter(x=>SHA.test(x.source_sha256)).map(x=>({
      position:x.position, thumb:ROOT+'/'+id+'/media/'+x.source_sha256+'/thumb',
      display:ROOT+'/'+id+'/media/'+x.source_sha256+'/display',
    })) })
  } catch {
    return json({ error: 'catalog_studios_unavailable' }, 503)
  }
}
