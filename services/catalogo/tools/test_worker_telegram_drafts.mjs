import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import esbuild from 'esbuild'

const dir = dirname(fileURLToPath(import.meta.url))
const entry = join(dir, '../worker/telegramDrafts.ts')
const bundle = await esbuild.build({
  entryPoints: [entry], bundle: true, platform: 'browser',
  format: 'esm', target: 'es2022', write: false, logLevel: 'silent',
})
const { routeTelegramDrafts } = await import('data:text/javascript;base64,' +
  Buffer.from(bundle.outputFiles[0].text).toString('base64'))
const id = 'tg_04e28eadb6e1811af4f37845'
const sha = '3c7f50718e6cab3787df0443404f01a9b5e5976036a542c13daff9e51e4884e7'
const token = 'Bearer ' + 'a'.repeat(100)
const gallery = [
  { image_id: 'tg:21448', position: 0, role: 'cover', source_sha256: sha },
  { image_id: 'tg:21449', position: 1, role: 'gallery', source_sha256: 'b'.repeat(64) },
  { image_id: 'tg:21450', position: 2, role: 'gallery', source_sha256: 'c'.repeat(64) },
  { image_id: 'tg:21451', position: 3, role: 'gallery', source_sha256: 'd'.repeat(64) },
]
function setup() {
  const log = { queries: [], privateReads: [], authCalls: [] }
  const row = {
    id, name: 'Monica Rambeau', variant_name: '', collection: 'Telegram Studios · Rascunhos',
    published: 0, image_count: 4, telegram_group_key: '04e28eadb6e1811af4f37845',
    telegram_origin_id: '2370335738', telegram_studio: 'Abe3D',
    telegram_character: 'Monica Rambeau', telegram_review_status: 'pending',
    telegram_rights_status: 'not_reviewed', telegram_name_provisional: 1, telegram_revision: 0,
    telegram_gallery_order: '[]',
  }
  const env = {
    ADMIN_SUPABASE_URL: 'https://mockproject.supabase.co',
    ADMIN_SUPABASE_ANON_KEY: 'mock-publishable-key',
    CORS_ORIGINS: 'https://tonartstudio.com.br',
    DB: {
      prepare(sql) {
        log.queries.push(sql)
        let vals = []
        return {
          bind(...v) { vals = v; return this },
          async first() {
            if (sql.includes('COUNT(*) AS total')) return { total: 1 }
            if (sql.includes('FROM model_image_sources')) {
              return gallery.find(x => x.source_sha256 === vals[1]) || null
            }
            if (sql.includes('FROM models m') && vals[0] === id) return { ...row }
            return null
          },
          async all() {
            if (sql.includes('FROM model_image_sources')) return { results: [...gallery] }
            if (sql.includes('FROM models m')) return { results: [{ ...row }] }
            throw Error('Unexpected SQL')
          },
          async run() {
            if (!sql.includes('UPDATE models')) throw Error('Unsafe SQL')
            if (vals[8] !== id || vals[9] !== row.telegram_revision) {
              return { meta: { changes: 0 } }
            }
            Object.assign(row, {
              name: vals[0], telegram_studio: vals[1], telegram_character: vals[2],
              variant_name: vals[3], telegram_review_status: vals[4],
              telegram_gallery_order: vals[5], cover_storage_key: vals[6],
              telegram_revision: row.telegram_revision + 1,
            })
            return { meta: { changes: 1 } }
          },
        }
      },
    },
    PRIVATE_TELEGRAM: {
      async get(key) {
        log.privateReads.push(key)
        const bytes = new TextEncoder().encode('RIFFxxxxWEBPVP8 ')
        return { body: new ReadableStream({ start(c) { c.enqueue(bytes); c.close() } }) }
      },
    },
  }
  const original = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    log.authCalls.push(String(url))
    assert.equal(options?.headers?.apikey, 'mock-publishable-key')
    assert.equal(options?.headers?.authorization, token)
    if (String(url).endsWith('/auth/v1/user')) return new Response(JSON.stringify({ id: 'owner-1' }), { status: 200 })
    if (String(url).endsWith('/rest/v1/rpc/is_tonecos_admin')) return new Response('true', { status: 200 })
    return new Response('not_found', { status: 404 })
  }
  return { env, log, row, restore: () => { globalThis.fetch = original } }
}
function request(path, method = 'GET', data, authorize = true) {
  return new Request('https://catalog.example.test' + path, {
    method,
    headers: {
      origin: 'https://tonartstudio.com.br',
      ...(authorize ? { authorization: token } : {}),
      ...(data ? { 'content-type': 'application/json' } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  })
}

test('private draft never authenticates from UI alone and fails closed', async () => {
  const { env, log, restore } = setup()
  try {
    let r = await routeTelegramDrafts(request('/api/admin/telegram-drafts', 'GET', undefined, false), env)
    assert.equal(r.status, 403)
    assert.equal(log.queries.length, 0)
    assert.equal(log.privateReads.length, 0)
    r = await routeTelegramDrafts(request('/api/admin/telegram-drafts/' + id + '/media/' + sha + '/thumb', 'GET', undefined, false), env)
    assert.equal(r.status, 403)
    assert.equal(log.privateReads.length, 0)
    r = await routeTelegramDrafts(request('/api/admin/telegram-drafts'), { ...env, ADMIN_SUPABASE_URL: '' })
    assert.equal(r.status, 503)
  } finally { restore() }
})

test('authorized admin lists, opens, edits, persists and sees four private images', async () => {
  const { env, log, row, restore } = setup()
  try {
    let response = await routeTelegramDrafts(request('/api/admin/telegram-drafts?studio=Abe3D'), env)
    assert.equal(response.status, 200)
    const list = await response.json()
    assert.equal(list.total, 1)
    assert.equal(list.items[0].name, 'Monica Rambeau')
    response = await routeTelegramDrafts(request('/api/admin/telegram-drafts/' + id), env)
    const before = await response.json()
    assert.equal(before.images.length, 4)
    assert.equal(before.published, false)
    assert.equal(before.provisionalName, true)
    response = await routeTelegramDrafts(request(before.images[0].thumbPath), env)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/webp')
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
    assert.match(log.privateReads[0], /^telegram-studios\/v1\/2370335738\//)
    assert.equal(log.privateReads.length, 1)
    const edit = { revision: 0, name: 'Monica Rambeau — revisão', studio: 'Abe3D',
      character: 'Monica Rambeau', variant: '', reviewStatus: 'reviewing' }
    response = await routeTelegramDrafts(request('/api/admin/telegram-drafts/' + id, 'PATCH', edit), env)
    assert.equal(response.status, 200)
    const saved = await response.json()
    assert.equal(saved.name, edit.name)
    assert.equal(saved.revision, 1)
    assert.equal(saved.groupKey, before.groupKey)
    assert.deepEqual(saved.images.map(x => x.sha256), before.images.map(x => x.sha256))
    response = await routeTelegramDrafts(request('/api/admin/telegram-drafts/' + id), env)
    assert.equal((await response.json()).name, edit.name)
    assert.equal(row.published, 0)
    const order = [21451,21450,21449,21448]
    response = await routeTelegramDrafts(request('/api/admin/telegram-drafts/' + id, 'PATCH',
      { ...edit, revision: 1, imageOrder: order }), env)
    assert.equal(response.status, 200)
    const reordered = await response.json()
    assert.equal(reordered.revision, 2)
    assert.deepEqual(reordered.images.map(x => x.messageId), order)
    assert.equal(reordered.images[0].role, 'cover')
    assert.equal(reordered.images.length, before.images.length)
    assert.deepEqual(new Set(reordered.images.map(x => x.sha256)),
      new Set(before.images.map(x => x.sha256)))
    response = await routeTelegramDrafts(request('/api/admin/telegram-drafts/' + id), env)
    assert.deepEqual((await response.json()).images.map(x => x.messageId),order)
    response = await routeTelegramDrafts(request('/api/admin/telegram-drafts/' + id, 'PATCH', edit), env)
    assert.equal(response.status, 409)
    assert.equal(row.telegram_revision, 2)
    response = await routeTelegramDrafts(request('/api/admin/telegram-drafts/' + id, 'PATCH',
      { revision: 2, name: 'unsafe', published: true }), env)
    assert.equal(response.status, 409)
    assert.equal(row.published, 0)
  } finally { restore() }
})

test('anonymous CORS from unknown origin never exposes private media', async () => {
  const { env, restore } = setup()
  try {
    const r = await routeTelegramDrafts(new Request('https://catalog.example.test/api/admin/telegram-drafts', {
      method: 'OPTIONS', headers: { origin: 'https://attacker.example' },
    }), env)
    assert.equal(r.status, 403)
    assert.equal(r.headers.has('access-control-allow-origin'), false)
  } finally { restore() }
})

test('canonical SQL migration has draft-only triggers', () => {
  const sql = readFileSync(join(dir,'../migrations/0023_telegram_private_drafts.sql'),'utf8')
  assert.match(sql, /trg_telegram_draft_no_public_insert/)
  assert.match(sql, /trg_telegram_draft_publication_requires_review/)
  assert.match(sql, /idx_models_telegram_group_key/)
})
