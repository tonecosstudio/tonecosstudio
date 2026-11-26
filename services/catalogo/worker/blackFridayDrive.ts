/** Owner-authorized export of already-public catalog media to the promotion folder.
 * The browser never supplies a destination, filename, category, credential or remote URL.
 */
import { verifyAdmin } from './telegramDrafts'
import { publicMediaKey } from './media'

export const BLACKFRIDAY_DRIVE_ROUTE = '/api/admin/blackfriday-drive'
const DRIVE = 'https://www.googleapis.com/drive/v3/'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const FOLDER = 'application/vnd.google-apps.folder'
const ID = /^[A-Za-z0-9_-]{10,200}$/
const SHA = /^[a-f0-9]{64}$/
const MAX_BYTES = 5 * 1024 * 1024
const LEASE_MS = 180_000
const MAX_PAGE = 10
const ORIGINS = new Set(['https://tonartstudio.com.br', 'https://www.tonartstudio.com.br'])
const EXT: Record<string, string> = {
  'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png',
  'image/avif': 'avif', 'image/gif': 'gif',
}
const CATEGORIES: Record<string, string> = {
  'animes-desenhos': 'Animes & Desenhos', 'filmes-series': 'Filmes & Séries',
  'marvel-dc': 'Marvel & DC', games: 'Games', pessoas: 'Pessoas',
  'tokusatsu-cultura-japonesa': 'Tokusatsu & Cultura Japonesa',
}
const PENDING = 'A identificar'
const categoryLabels = new Set([...Object.values(CATEGORIES), PENDING])
type Statement = {
  bind(...values: unknown[]): Statement
  first<T = unknown>(): Promise<T | null>
  run(): Promise<unknown>
}
export type BlackFridayDriveEnv = {
  DB: { prepare(sql: string): Statement }
  ADMIN_SUPABASE_URL?: string
  ADMIN_SUPABASE_ANON_KEY?: string
  BLACKFRIDAY_DRIVE_FOLDER_ID?: string
  /** Secret JSON provisioned out of band after Google OAuth consent. */
  BLACKFRIDAY_DRIVE_OAUTH?: string
}
type ReadPublic = (path: string) => Promise<Response>
type Config = { root: string; client_id: string; client_secret: string; refresh_token: string }
type DriveFile = {
  id: string; name: string; mimeType: string; parents?: string[]; trashed?: boolean
  size?: string; sha256Checksum?: string
  capabilities?: { canAddChildren?: boolean; canEdit?: boolean }
}
type Model = { name?: unknown; franchise?: unknown; categorySlug?: unknown; category_slug?: unknown
  provisional?: unknown; telegram_name_provisional?: unknown; cover_storage_key?: unknown }
class ExportError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code) }
}
function fail(code: string, status = 503): never { throw new ExportError(code, status) }
function config(env: BlackFridayDriveEnv): Config | null {
  const root = env.BLACKFRIDAY_DRIVE_FOLDER_ID
  if (!root || !ID.test(root) || !env.BLACKFRIDAY_DRIVE_OAUTH) return null
  try {
    const v = JSON.parse(env.BLACKFRIDAY_DRIVE_OAUTH) as Partial<Config>
    if (![v.client_id, v.client_secret, v.refresh_token].every(x => typeof x === 'string' && x.length > 0)) return null
    return { root, client_id: v.client_id!, client_secret: v.client_secret!, refresh_token: v.refresh_token! }
  } catch { return null }
}
function headers(request: Request) {
  const h = new Headers({ 'cache-control': 'private, no-store', vary: 'Origin, Authorization',
    'x-content-type-options': 'nosniff' })
  const origin = request.headers.get('origin')
  if (origin && ORIGINS.has(origin)) {
    h.set('access-control-allow-origin', origin)
    h.set('access-control-allow-methods', 'GET, POST, OPTIONS')
    h.set('access-control-allow-headers', 'authorization, content-type')
  }
  return h
}
function reply(request: Request, data: unknown, status = 200) {
  const h = headers(request); h.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { status, headers: h })
}
async function boundedBytes(response: Response | Request, max: number): Promise<Uint8Array> {
  const length = response.headers.get('content-length')
  if (length && Number(length) > max) fail('payload_too_large', 413)
  if (!response.body) fail('empty_payload', 400)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > max) { await reader.cancel(); fail('payload_too_large', 413) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  if (!size) fail('empty_payload', 400)
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}
function categoryFor(model: Model) {
  const slug = String(model.categorySlug ?? model.category_slug ?? '')
  return model.provisional === true || model.telegram_name_provisional === 1 ? PENDING
    : (Object.hasOwn(CATEGORIES, slug) ? CATEGORIES[slug] : PENDING)
}
function safeName(value: unknown) {
  return typeof value === 'string'
    ? value.normalize('NFC').replace(/[\p{Cc}<>:"/\\|?*]/gu, '-').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 100)
    : ''
}
function imageName(model: Model, sha: string, mime: string) {
  const name = safeName(model.name)
  if (!name) fail('invalid_model_identity', 409)
  const franchise = safeName(model.franchise)
  const prefix = categoryFor(model) === PENDING && !/^a identificar/i.test(name) ? 'A identificar - ' : ''
  return prefix + name + (franchise && !name.toLowerCase().includes(franchise.toLowerCase()) ? ' - ' + franchise : '')
    + ' - ' + sha.slice(0, 12) + '.' + EXT[mime]
}
async function jsonRead<T>(readPublic: ReadPublic, path: string): Promise<T> {
  const response = await readPublic(path)
  if (!response.ok) fail('public_model_unavailable', response.status === 404 ? 404 : 503)
  return await response.json() as T
}
async function publicSource(data: unknown, readPublic: ReadPublic) {
  if (!data || typeof data !== 'object') fail('invalid_source', 400)
  const { path, modelSlug } = data as { path?: unknown; modelSlug?: unknown }
  if (typeof path !== 'string' || path.length > 1400 || !path.startsWith('/') ||
      /[?#\\\x00-\x1f]/.test(path)) fail('invalid_source', 400)
  const telegram = /^\/api\/telegram-studios\/(tg_[a-f0-9]{24})\/media\/([a-f0-9]{64})\/(?:thumb|display)$/.exec(path)
  let model: Model, mediaPath: string
  if (telegram) {
    const detail = '/api/telegram-studios/' + telegram[1]
    model = await jsonRead<Model>(readPublic, detail)
    // Reuse the public Telegram handler's visibility and image-membership checks.
    mediaPath = detail + '/media/' + telegram[2] + '/display'
  } else {
    const key = publicMediaKey(path)
    if (!key || typeof modelSlug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,239}$/.test(modelSlug)) fail('invalid_source', 400)
    const detail = '/api/models/' + modelSlug
    model = await jsonRead<Model>(readPublic, detail)
    // Match the specific published model's cover or validated public gallery.
    // No caller-supplied R2 key may be relabeled as another model.
    let approved = model.cover_storage_key === key
    let cursor: string | null = null
    for (let i = 0; !approved && i < 10; i++) {
      const params = new URLSearchParams({ limit: '60' })
      if (cursor) params.set('cursor', cursor)
      const page: {items?: Array<{variantKeys?: Record<string, unknown>}>; nextCursor?: string | null} =
        await jsonRead(readPublic, detail + '/images?' + params)
      approved = !!page.items?.some(image => ['thumb','card','detail'].some(role => image.variantKeys?.[role] === key))
      if (!page.nextCursor || page.nextCursor === cursor) break
      cursor = page.nextCursor
    }
    if (!approved) fail('media_not_in_public_model', 404)
    mediaPath = path
  }
  const response = await readPublic(mediaPath)
  const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (!response.ok || !Object.hasOwn(EXT, mime)) fail('public_image_unavailable', 404)
  const bytes = await boundedBytes(response, MAX_BYTES)
  const sha = await digest(bytes)
  return { model, bytes, mime, sha, category: categoryFor(model), name: imageName(model, sha, mime) }
}
async function digest(bytes: Uint8Array) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>)),
    b => b.toString(16).padStart(2,'0')).join('')
}
async function accessToken(c: Config) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12_000),
    body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret,
      refresh_token: c.refresh_token, grant_type: 'refresh_token' }),
  })
  if (!response.ok) fail('drive_authorization_required')
  const payload = await response.json() as {access_token?: unknown}
  if (typeof payload.access_token !== 'string' || !payload.access_token) fail('drive_authorization_required')
  return payload.access_token
}
class Drive {
  constructor(private token: string, private deadline: number) {}
  async request(url: string, init: RequestInit = {}) {
    const remaining = this.deadline - Date.now()
    if (remaining <= 0) fail('drive_retry_required')
    const h = new Headers(init.headers)
    h.set('authorization', 'Bearer ' + this.token)
    return fetch(url, { ...init, headers: h, redirect: 'error',
      signal: AbortSignal.timeout(Math.min(12_000, remaining)) })
  }
  async json<T>(url: string, init?: RequestInit) {
    const r = await this.request(url, init)
    if (!r.ok) fail(r.status === 401 || r.status === 403 ? 'drive_authorization_required' : 'drive_retry_required')
    return await r.json() as T
  }
  async file(id: string) {
    if (!ID.test(id)) fail('drive_invalid_id')
    return this.json<DriveFile>(DRIVE+'files/'+id+'?supportsAllDrives=true&fields=id,name,mimeType,parents,trashed,capabilities,sha256Checksum,size')
  }
  async list(parent: string): Promise<DriveFile[]> {
    if (!ID.test(parent)) fail('drive_invalid_id')
    const out: DriveFile[] = []
    let pageToken = ''
    for (let i=0; i<MAX_PAGE; i++) {
      const query = new URLSearchParams({q: "'"+parent+"' in parents and trashed = false", pageSize: '1000',
        fields: 'nextPageToken,incompleteSearch,files(id,name,mimeType,parents,size,sha256Checksum,capabilities)',
        supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' })
      if (pageToken) query.set('pageToken',pageToken)
      const page = await this.json<{files?: DriveFile[];nextPageToken?: string;incompleteSearch?: boolean}>(DRIVE+'files?'+query)
      if (page.incompleteSearch || !Array.isArray(page.files)) fail('drive_inventory_incomplete')
      out.push(...page.files)
      if (!page.nextPageToken) return out
      if (page.nextPageToken === pageToken) fail('drive_inventory_incomplete')
      pageToken = page.nextPageToken
    }
    return fail('drive_inventory_incomplete')
  }
  async generateId() {
    const data = await this.json<{ids?: string[]}>(DRIVE+'files/generateIds?count=1&space=drive&type=files')
    const id = data.ids?.[0]
    if (!id || !ID.test(id)) fail('drive_invalid_id')
    return id
  }
  async createFolder(root: string, category: string, id: string) {
    const response = await this.request(DRIVE+'files?supportsAllDrives=true&fields=id', {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({id,name:category+' [0]',mimeType:FOLDER,parents:[root]}),
    })
    if (!response.ok && response.status !== 409) fail('drive_folder_creation_failed')
    return this.file(id)
  }
  async upload(id: string, folder: string, source: Awaited<ReturnType<typeof publicSource>>) {
    const boundary = 'tonart_'+crypto.randomUUID()
    const meta = {id, name:source.name, parents:[folder], mimeType:source.mime,
      appProperties:{tonartSha256:source.sha}}
    const pre = new TextEncoder().encode('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(meta)
      +'\r\n--'+boundary+'\r\nContent-Type: '+source.mime+'\r\n\r\n')
    const post = new TextEncoder().encode('\r\n--'+boundary+'--\r\n')
    const body = new Uint8Array(pre.length+source.bytes.length+post.length)
    body.set(pre); body.set(source.bytes,pre.length); body.set(post,pre.length+source.bytes.length)
    const response = await this.request(UPLOAD+'?uploadType=multipart&supportsAllDrives=true&fields=id', {
      method:'POST',headers:{'content-type':'multipart/related; boundary='+boundary},body})
    // A pre-generated Drive ID makes a lost response safe to retry.
    if (!response.ok && response.status !== 409) fail('drive_upload_failed')
    const uploaded = await this.file(id)
    if (uploaded.trashed || !uploaded.parents?.includes(folder) || uploaded.mimeType !== source.mime ||
        !(await this.sameBytes(uploaded,source))) fail('drive_upload_verification_failed')
    return uploaded
  }
  async sameBytes(file: DriveFile, source: Awaited<ReturnType<typeof publicSource>>) {
    if (file.sha256Checksum && SHA.test(file.sha256Checksum)) return file.sha256Checksum === source.sha
    if (file.mimeType !== source.mime || Number(file.size) !== source.bytes.length || !ID.test(file.id)) return false
    const response = await this.request(DRIVE+'files/'+file.id+'?alt=media&supportsAllDrives=true')
    if (!response.ok) fail('drive_inventory_incomplete')
    return await digest(await boundedBytes(response,MAX_BYTES)) === source.sha
  }
  async recount(folder: string, category: string) {
    const images = (await this.list(folder)).filter(x => x.mimeType.startsWith('image/'))
    const name = category+' ['+images.length+']'
    const current = await this.file(folder)
    if (current.name !== name) {
      await this.json<DriveFile>(DRIVE+'files/'+folder+'?supportsAllDrives=true&fields=id,name', {
        method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({name})})
    }
    return {count:images.length, folderName:name}
  }
}
function folderCategory(name: string) { return name.replace(/ \[\d+\]$/,'') }
async function exportImage(env: BlackFridayDriveEnv, c: Config, source: Awaited<ReturnType<typeof publicSource>>) {
  const lease = crypto.randomUUID(), now = Date.now()
  const claimed = await env.DB.prepare('INSERT INTO blackfriday_drive_lock(root_id,lease_token,expires_at) VALUES(?,?,?) '+
    'ON CONFLICT(root_id) DO UPDATE SET lease_token=excluded.lease_token,expires_at=excluded.expires_at '+
    'WHERE blackfriday_drive_lock.expires_at<=? RETURNING lease_token')
    .bind(c.root,lease,now+LEASE_MS,now).first<{lease_token:string}>()
  if (claimed?.lease_token !== lease) fail('drive_busy_retry',409)
  try {
    const drive = new Drive(await accessToken(c), now+LEASE_MS-30_000)
    const root = await drive.file(c.root)
    if (root.trashed || root.mimeType !== FOLDER || root.capabilities?.canAddChildren !== true) fail('drive_folder_not_authorized')
    const folders = new Map<string,DriveFile>()
    for (const child of await drive.list(c.root)) {
      const category = folderCategory(child.name)
      if (child.mimeType !== FOLDER || !categoryLabels.has(category)) continue
      if (folders.has(category) || !ID.test(child.id)) fail('drive_category_conflict',409)
      folders.set(category,child)
    }
    // Detect exact duplicates throughout the promotion (including manually uploaded images).
    for (const [category,folder] of folders) {
      for (const file of await drive.list(folder.id)) {
        if (file.mimeType.startsWith('image/') && await drive.sameBytes(file,source)) {
          return {saved:true,duplicate:true,fileId:file.id,category,...await drive.recount(folder.id,category)}
        }
      }
    }
    let folder = folders.get(source.category)
    if (!folder) {
      let reservation = await env.DB.prepare('SELECT drive_folder_id FROM blackfriday_drive_folders WHERE root_id=? AND category=?')
        .bind(c.root,source.category).first<{drive_folder_id:string}>()
      if (!reservation) {
        const id = await drive.generateId()
        await env.DB.prepare('INSERT INTO blackfriday_drive_folders(root_id,category,drive_folder_id) VALUES(?,?,?)')
          .bind(c.root,source.category,id).run()
        reservation = {drive_folder_id:id}
      }
      if (!ID.test(reservation.drive_folder_id)) fail('drive_reservation_conflict',409)
      folder = await drive.createFolder(c.root,source.category,reservation.drive_folder_id)
    }
    const verifiedFolder = await drive.file(folder.id)
    if (verifiedFolder.trashed || verifiedFolder.mimeType !== FOLDER || !verifiedFolder.parents?.includes(c.root)
        || verifiedFolder.capabilities?.canAddChildren !== true || verifiedFolder.capabilities?.canEdit !== true
        || folderCategory(verifiedFolder.name) !== source.category) fail('drive_folder_not_authorized')
    // Persistent reservation survives a failed Worker or ambiguous upload response.
    let record = await env.DB.prepare('SELECT drive_file_id,folder_id FROM blackfriday_drive_exports WHERE root_id=? AND sha256=?')
      .bind(c.root,source.sha).first<{drive_file_id:string;folder_id:string}>()
    if (!record) {
      const id = await drive.generateId()
      await env.DB.prepare('INSERT INTO blackfriday_drive_exports(root_id,sha256,drive_file_id,folder_id) VALUES(?,?,?,?)')
        .bind(c.root,source.sha,id,folder.id).run()
      record = {drive_file_id:id,folder_id:folder.id}
    }
    if (record.folder_id !== folder.id || !ID.test(record.drive_file_id)) fail('drive_reservation_conflict',409)
    const file = await drive.upload(record.drive_file_id,folder.id,source)
    return {saved:true,duplicate:false,fileId:file.id,category:source.category,...await drive.recount(folder.id,source.category)}
  } finally {
    await env.DB.prepare('DELETE FROM blackfriday_drive_lock WHERE root_id=? AND lease_token=?').bind(c.root,lease).run()
  }
}
export async function routeBlackFridayDrive(request: Request, env: BlackFridayDriveEnv, readPublic: ReadPublic) {
  const origin = request.headers.get('origin')
  if (origin && !ORIGINS.has(origin)) return reply(request,{error:'origin_denied'},403)
  if (request.method === 'OPTIONS') return new Response(null,{status:origin ? 204 : 403,headers:headers(request)})
  if (new URL(request.url).search || !['GET','POST'].includes(request.method)) return reply(request,{error:'invalid_request'},400)
  const admin = await verifyAdmin(request,env)
  if (admin !== true) return reply(request,{error:admin === null ? 'admin_auth_unconfigured' : 'admin_required'},admin === null ? 503 : 403)
  const c = config(env)
  if (request.method === 'GET') return reply(request,{configured:!!c})
  if (!c) return reply(request,{error:'drive_not_configured'},503)
  try {
    if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) fail('invalid_request',400)
    let data: unknown
    try { data = JSON.parse(new TextDecoder().decode(await boundedBytes(request,4096))) }
    catch (error) { if (error instanceof ExportError) throw error; fail('invalid_request',400) }
    const source = await publicSource(data,readPublic)
    return reply(request,await exportImage(env,c,source))
  } catch (error) {
    // Never expose provider responses, credentials, internal paths or signed URLs.
    return reply(request,{error:error instanceof ExportError ? error.code : 'drive_retry_required'},
      error instanceof ExportError ? error.status : 503)
  }
}
