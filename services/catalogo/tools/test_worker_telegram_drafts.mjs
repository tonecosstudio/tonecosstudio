import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
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
  const log = { queries: [], privateReads: [], authCalls: [], forceNoWrite: false }
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
            if (sql.includes('GROUP BY telegram_studio')) return {
              results: [
                { studio: 'Abe3D', total: 72 },
                { studio: '3DXM', total: 271 },
                { studio: 'Ydeval', total: 444 },
              ],
            }
            if (sql.includes('FROM model_image_sources')) return { results: [...gallery] }
            if (sql.includes('FROM models m')) return { results: [{ ...row }] }
            throw Error('Unexpected SQL')
          },
          async run() {
            if (!sql.includes('UPDATE models')) throw Error('Unsafe SQL')
            if (vals[9] !== id || vals[10] !== row.telegram_revision) {
              return { meta: { changes: 0 } }
            }
            if (log.forceNoWrite) return { meta: { changes: 0 } }
            Object.assign(row, {
              name: vals[0], telegram_studio: vals[1], telegram_character: vals[2],
              variant_name: vals[3], telegram_review_status: vals[4],
              telegram_name_provisional: vals[5] === 'confirmed' ? 0 : row.telegram_name_provisional,
              telegram_gallery_order: vals[6], cover_storage_key: vals[7],
              telegram_revision: row.telegram_revision + 1,
            })
            // D1 production counts extra FTS trigger writes (observed: changes=7).
            return { meta: { changes: 7 } }
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
    if (options?.headers?.authorization !== token) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401 })
    }
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

test('a zero-row D1 update remains a conflict even when the editor is authenticated', async () => {
  const { env, log, row, restore } = setup()
  try {
    log.forceNoWrite = true
    const response = await routeTelegramDrafts(request('/api/admin/telegram-drafts/' + id, 'PATCH',
      { revision: 0, name: 'Should not persist' }), env)
    assert.equal(response.status, 409)
    assert.equal(row.name, 'Monica Rambeau')
    assert.equal(row.telegram_revision, 0)
  } finally { restore() }
})

test('authorized catalog admin discovers studios dynamically without exposing media', async () => {
  const { env, log, restore } = setup()
  try {
    const response = await routeTelegramDrafts(request('/api/admin/telegram-drafts/studios'), env)
    assert.equal(response.status, 200)
    assert.deepEqual((await response.json()).studios, [
      { studio: 'Abe3D', total: 72 },
      { studio: '3DXM', total: 271 },
      { studio: 'Ydeval', total: 444 },
    ])
    assert.equal(log.privateReads.length, 0)
    assert.ok(log.queries.some(sql => sql.includes('GROUP BY telegram_studio')))
    const denied = await routeTelegramDrafts(request('/api/admin/telegram-drafts/studios', 'GET', undefined, false), env)
    assert.equal(denied.status, 403)
  } finally { restore() }
})

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

test('Cloudflare service identity is limited to the exact private import POST', async () => {
  const { env, log, restore } = setup()
  try {
    env.TELEGRAM_IMPORT_ACCESS_AUD = 'aud-private-import'
    env.TELEGRAM_IMPORT_ACCESS_CLIENT_ID = 'tonart-importer.access'
    const access = {
      aud: 'aud-private-import',
      async getIdentity() {
        return { service_token_status: true, service_token_id: 'tonart-importer.access' }
      },
    }
    let response = await routeTelegramDrafts(
      request('/api/admin/telegram-drafts', 'GET', undefined, false), env, { access },
    )
    assert.equal(response.status, 403)
    assert.equal(log.queries.length, 0)
    assert.equal(log.privateReads.length, 0)

    for (const [path, method] of [
      ['/api/admin/telegram-drafts/studios', 'GET'],
      ['/api/admin/telegram-drafts/' + id, 'PATCH'],
      ['/api/admin/telegram-drafts', 'POST'],
    ]) {
      response = await routeTelegramDrafts(request(path, method,
        method === 'PATCH' ? { revision: 0 } : method === 'POST' ? {} : undefined, false), env, { access })
      assert.equal(response.status, 403, `${method} ${path} is outside the service identity scope`)
    }
    assert.equal(log.queries.length, 0)
    assert.equal(log.privateReads.length, 0)

    // Access credentials must not bypass the existing human-only Supabase route.
    response = await routeTelegramDrafts(
      request('/api/admin/telegram-drafts/import', 'POST', { originId: '2370335738' }, false),
      env, { access },
    )
    assert.equal(response.status, 403)

    response = await routeTelegramDrafts(
      request('/api/admin/telegram-drafts/import/service', 'POST', { originId: '2370335738' }, false), env,
      { access: { ...access, aud: 'wrong-audience' } },
    )
    assert.equal(response.status, 403)

    response = await routeTelegramDrafts(
      request('/api/admin/telegram-drafts/import/service', 'POST', { originId: '2370335738' }, false), env,
      { access: { ...access, async getIdentity() {
        return { service_token_status: false, service_token_id: 'tonart-importer.access' }
      } } },
    )
    assert.equal(response.status, 403, 'a non-service or invalid Access token cannot import')

    response = await routeTelegramDrafts(
      request('/api/admin/telegram-drafts/import/service', 'POST', { originId: '2370335738' }, false), env,
      { access: { ...access, async getIdentity() {
        return { service_token_status: true, service_token_id: 'other-token.access' }
      } } },
    )
    assert.equal(response.status, 403)

    const validImport = {
      originId: '2370335738', studio: 'Momoji', groupKey: 'a'.repeat(24),
      name: 'Modelo de teste', universe: 'Naruto', variant: '', franchiseId: 48,
      images: [{ messageId: 17278, sha256: 'b'.repeat(64) }],
    }
    response = await routeTelegramDrafts(
      request('/api/admin/telegram-drafts/import/service', 'POST', validImport, false), env,
      { access },
    )
    assert.equal(response.status, 503)
    assert.equal((await response.json()).error, 'private_storage_unavailable')
    assert.equal(log.authCalls.length, 0, 'service auth never creates or impersonates a Supabase user')
    assert.equal(log.queries.length, 0, 'malformed service requests do not reach D1')
  } finally { restore() }
})

test('invalid human JWT is rejected by Supabase Auth without reaching D1 or R2', async () => {
  const { env, log, restore } = setup()
  try {
    const invalid = new Request('https://catalog.example.test/api/admin/telegram-drafts', {
      method: 'GET',
      headers: { origin: 'https://tonartstudio.com.br', authorization: 'Bearer ' + 'x'.repeat(64) },
    })
    const response = await routeTelegramDrafts(invalid, env)
    assert.equal(response.status, 403)
    assert.equal(log.authCalls.length, 1)
    assert.equal(log.queries.length, 0)
    assert.equal(log.privateReads.length, 0)
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

test('confirming an identity clears provisional name in D1 without publishing the model', async () => {
  const { env, row, restore } = setup()
  try {
    const updated = await routeTelegramDrafts(request('/api/admin/telegram-drafts/' + id, 'PATCH',
      { revision: 0, name: 'Monica Rambeau', reviewStatus: 'confirmed' }), env)
    assert.equal(updated.status, 200)
    const body = await updated.json()
    assert.equal(body.provisionalName, false)
    assert.equal(body.reviewStatus, 'confirmed')
    assert.equal(body.revision, 1)
    assert.equal(body.published, false)
    assert.equal(row.telegram_name_provisional, 0)
    const persisted = await routeTelegramDrafts(request('/api/admin/telegram-drafts/' + id), env)
    assert.equal((await persisted.json()).provisionalName, false)
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


const importBundle = await esbuild.build({
  entryPoints: [join(dir,'../worker/telegramDraftImport.ts')],
  bundle: true, platform: 'browser', format: 'esm', target: 'es2022',
  write: false, logLevel: 'silent',
})
const { importPrivateTelegramDraft } = await import('data:text/javascript;base64,' +
  Buffer.from(importBundle.outputFiles[0].text).toString('base64'))

function draftImportFixture(overrides = {}, options = {}) {
  const key = 'b2b99222c387716d35aba4c3'
  const input = {
    originId: '2370335738', studio: 'Abe3D', groupKey: key,
    name: 'Bowsette', universe: 'Super Mario', variant: '',
    franchiseId: 197,
    images: [
      { messageId: 17278, sha256: '1'.repeat(64) },
      { messageId: 17279, sha256: '2'.repeat(64) },
    ],
    ...overrides,
  }
  let stored = null
  let batches = 0
  const heads = []
  const env = {
    DB: {
      prepare(sql) {
        const statement = {
          sql, values: [],
          bind(...args) { this.values = args; return this },
          async first() {
            if (sql.includes('FROM franchises')) return {id:197}
            if (sql.includes('WHERE telegram_origin_id=?')) return stored?.groupKey === statement.values[1] ? stored : null
            if (sql.includes('FROM models') && sql.includes('telegram_studio=?')) {
              assert.equal(statement.values[0], input.studio, 'dedupe must scope to a single studio')
              assert.equal(statement.values[1], input.name)
              assert.equal(statement.values[2], input.variant)
              return options.sameStudioCandidate ? {id:'another_sculpture'} : null
            }
            if (sql.includes('FROM models')) return null
            return null
          },
          async all() {
            if (sql.includes('FROM model_image_sources') && sql.includes('WHERE model_id=?')) {
              return {results:stored?.photos??[]}
            }
            return {results:[]}
          },
        }
        return statement
      },
      async batch(statements) {
        batches++
        if (statements[0].sql.includes('INSERT INTO models')) {
          assert.equal(statements.length, input.images.length + 1)
          // Single-message identities are canonical 24-hex IDs, never
          // raw "single:<message_id>" fragments in public slugs/codes.
          assert.match(statements[0].values[2],/^telegram-abe3d-[a-f0-9]{24}$/)
          assert.match(statements[0].values[3],/^TG-[A-F0-9]{24}$/)
          assert.equal(statements[0].values[2].includes(':'),false)
          assert.equal(statements[0].values[10],0,'new drafts cannot be published')
          assert.match(statements[0].sql,/telegram_showcase_visible/,'new drafts must store visibility explicitly')
          assert.equal(statements[0].values.at(-1),0,'new drafts must not appear in public showcase')
          stored = {
            id:statements[0].values[0],groupKey:statements[0].values[13],
            name:input.name, published:0, image_count:input.images.length,
            telegram_revision:0,telegram_gallery_order:JSON.stringify(input.images.map(x=>x.messageId)),
            photos:statements.slice(1).map(x=>({
              image_id:x.values[1],position:x.values[2],source_sha256:x.values[4],
            })),
          }
        } else {
          assert.match(statements[0].sql,/UPDATE models/)
          assert.equal(statements.length,2)
          assert.equal(statements[0].values[3],stored.image_count)
          assert.equal(statements[0].values[4],stored.telegram_revision)
          stored.image_count=statements[0].values[0]
          stored.telegram_gallery_order=statements[0].values[1]
          stored.telegram_revision++
          for(const statement of statements.slice(1)){
            stored.photos.push({
              image_id:statement.values[1],position:statement.values[2],
              source_sha256:statement.values[4],
            })
          }
        }
        return statements.map(()=>({success:true,meta:{changes:1}}))
      },
    },
    PRIVATE_TELEGRAM: {
      async head(key) {
        heads.push(key)
        return {}
      },
    },
  }
  const run = async data => importPrivateTelegramDraft(
    new Request('https://worker.example.test/api/admin/telegram-drafts/import',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify(data),
    }),env,
  )
  return {input,env,heads,run,getBatches:()=>batches}
}

test('canonical group importer creates once, verifies every private R2 HEAD and reuses on replay',async()=>{
  const x=draftImportFixture()
  const first=await x.run(x.input)
  assert.equal(first.status,201)
  assert.equal(first.data.created,true)
  assert.equal(first.data.published,false)
  assert.equal(first.data.imageCount,2)
  assert.equal(x.getBatches(),1)
  assert.equal(x.heads.length,4)
  assert.ok(x.heads.every(k=>k.startsWith('telegram-studios/v1/2370335738/')))
  assert.ok(x.heads.some(k=>k.endsWith('/display.webp')))
  assert.ok(x.heads.some(k=>k.endsWith('/thumb.webp')))
  const second=await x.run({...x.input,name:'Provisional title overridden by Curadoria'})
  assert.equal(second.status,200)
  assert.equal(second.data.created,false)
  assert.equal(second.data.reused,true)
  assert.equal(second.data.name,x.input.name,'manually maintained commercial title survives reimport')
  assert.equal(x.getBatches(),1,'reimport cannot insert images or models again')
  assert.equal(x.heads.length,4,'no R2 rewrite or needless HEAD on idempotent replay')
})

test('identical character names in different studios are not duplicate sculpture identities',async()=>{
  // The original global lower(name) lookup rejected a legitimate second
  // studio's independently sourced image when the character name matched.
  const x=draftImportFixture({name:'Batman',studio:'Abe3D'})
  const created=await x.run(x.input)
  assert.equal(created.status,201)
  assert.equal(created.data.published,false)
  assert.equal(x.getBatches(),1)
  assert.equal(x.heads.length,4)
})

test('same studio, exact name and variant stays under manual duplicate review',async()=>{
  const x=draftImportFixture({}, {sameStudioCandidate:true})
  const held=await x.run(x.input)
  assert.equal(held.status,409)
  assert.equal(held.data.error,'possible_same_studio_sculpture')
  assert.equal(x.getBatches(),0)
  assert.equal(x.heads.length,0)
})

test('Telegram studio/name duplicate check uses the existing D1 title index without losing review protection',async()=>{
  const x=draftImportFixture()
  const queries=[]
  const prepare=x.env.DB.prepare.bind(x.env.DB)
  x.env.DB.prepare=sql=>{
    queries.push(sql)
    return prepare(sql)
  }
  assert.equal((await x.run(x.input)).status,201)
  const sql=queries.find(s=>s.includes('COALESCE(variant_name') && s.includes('telegram_studio=?'))
  assert.ok(sql,'import must check same-studio, same-title, same-variant identity')
  assert.match(sql,/published IN \(0,1\)/,'both private and public models are checked')

  // The canonical SQLite index below is already deployed in D1.
  // EXPLAIN prevents a regression to one full models scan per imported group.
  const db=new DatabaseSync(':memory:')
  try{
    db.exec(`
      CREATE TABLE models (
        id TEXT PRIMARY KEY,published INTEGER NOT NULL DEFAULT 0,
        telegram_studio TEXT NOT NULL,name TEXT NOT NULL,variant_name TEXT
      );
      CREATE INDEX idx_models_published_name_id
        ON models(published,name COLLATE NOCASE,id);
      INSERT INTO models VALUES
        ('private-a',0,'Abe3D','Bowsette',''),
        ('public-b',1,'AnotherStudio','Bowsette',''),
        ('variant-c',0,'Abe3D','Bowsette','gold');
    `)
    const plan=db.prepare('EXPLAIN QUERY PLAN '+sql)
      .all('Abe3D','Bowsette','','not-this-model')
    assert.ok(plan.some(x=>String(x.detail).includes('USING INDEX idx_models_published_name_id')),
      JSON.stringify(plan))
    const lookup=db.prepare(sql)
    assert.equal(lookup.get('Abe3D','BOWSETTE','','new-id')?.id,'private-a')
    assert.equal(lookup.get('AnotherStudio','bowsette','','new-id')?.id,'public-b')
    assert.equal(lookup.get('Abe3D','Bowsette','gold','new-id')?.id,'variant-c')
    assert.equal(lookup.get('Abe3D','Bowsette','','private-a'),undefined,
      'same model is not a false collision')
    assert.equal(lookup.get('DifferentStudio','Bowsette','','new-id'),undefined,
      'other studio does not block legitimate sculptors')
  }finally{db.close()}
})

test('Curadoria single message identity has stable D1 key and replay cannot duplicate a draft',async()=>{
  const x=draftImportFixture({
    groupKey:'single:17278', images:[{messageId:17278,sha256:'1'.repeat(64)}],
  })
  for(const bad of [
    {...x.input,groupKey:'single:17279'},
    {...x.input,groupKey:'single:017278'},
    {...x.input,images:[...x.input.images,{messageId:17279,sha256:'2'.repeat(64)}]},
  ]){
    const rejected=await x.run(bad)
    assert.equal(rejected.status,400)
    assert.equal(x.getBatches(),0)
    assert.equal(x.heads.length,0)
  }
  const created=await x.run(x.input)
  assert.equal(created.status,201)
  const expected='tg_'+createHash('sha256').update('2370335738:single:17278')
    .digest('hex').slice(0,24)
  assert.equal(created.data.id,expected)
  assert.equal(created.data.published,false)
  assert.equal(created.data.imageCount,1)
  assert.equal(x.getBatches(),1)
  assert.equal(x.heads.length,2)
  const replay=await x.run({...x.input,name:'Overridden title'})
  assert.equal(replay.status,200)
  assert.equal(replay.data.id,expected)
  assert.equal(replay.data.name,x.input.name)
  assert.equal(x.getBatches(),1)
  assert.equal(x.heads.length,2)
})

test('import refuses excluded General +50k and corrupt input without touching catalog or R2',async()=>{
  const x=draftImportFixture()
  for(const candidate of [
    {...x.input,studio:'Geral +50k'},
    {...x.input,images:[x.input.images[0],x.input.images[0]]},
    {...x.input,originId:'other-telegram'},
    {...x.input,images:[{messageId:1,sha256:'bad'}]},
    {...x.input,franchiseId:-1},
  ]){
    const r=await x.run(candidate)
    assert.equal(r.status,400)
    assert.equal(x.getBatches(),0)
    assert.equal(x.heads.length,0)
  }
})

test('missing private WebP blocks draft import atomically',async()=>{
  const x=draftImportFixture()
  x.env.PRIVATE_TELEGRAM.head=async()=>null
  const r=await x.run(x.input)
  assert.equal(r.status,409)
  assert.equal(r.data.error,'r2_manifest_incomplete')
  assert.equal(x.getBatches(),0)
})


test('incremental curation appends only new private images and preserves edited metadata',async()=>{
  const x=draftImportFixture()
  const created=await x.run(x.input)
  assert.equal(created.status,201)
  const next={...x.input,operation:'append',expectedModelId:'tg_'+x.input.groupKey,name:'Name revised by admin',
    images:[...x.input.images,{messageId:17280,sha256:'3'.repeat(64)}]}
  const appended=await x.run(next)
  assert.equal(appended.status,200)
  assert.equal(appended.data.reused,true)
  assert.equal(appended.data.created,false)
  assert.equal(appended.data.appended,1)
  assert.equal(appended.data.name,x.input.name)
  assert.equal(appended.data.imageCount,3)
  assert.equal(x.heads.length,6,'only new WebP files are HEAD-checked')
  assert.equal(x.getBatches(),2)
  const replay=await x.run(next)
  assert.equal(replay.status,200)
  assert.equal(replay.data.appended,0)
  assert.equal(x.getBatches(),2,'reimport never duplicates the appended photo')
  assert.equal(x.heads.length,6)
})

test('create operation cannot silently append and append requires its exact existing target',async()=>{
  const x=draftImportFixture()
  await x.run(x.input)
  const expanded={...x.input,images:[...x.input.images,{messageId:17280,sha256:'3'.repeat(64)}]}
  const implicit=await x.run(expanded)
  assert.equal(implicit.status,409)
  assert.equal(implicit.data.error,'existing_group_requires_append_plan')
  const wrongTarget=await x.run({...expanded,operation:'append',expectedModelId:'tg_'+'f'.repeat(24)})
  assert.equal(wrongTarget.status,400)
  const append=await x.run({...expanded,operation:'append',expectedModelId:'tg_'+x.input.groupKey})
  assert.equal(append.status,200)
  assert.equal(append.data.appended,1)
  const replay=await x.run({...expanded,operation:'append',expectedModelId:'tg_'+x.input.groupKey})
  assert.equal(replay.status,200)
  assert.equal(replay.data.appended,0)
  assert.equal(x.getBatches(),2)
})

test('partial replay cannot silently delete a previously indexed image',async()=>{
  const x=draftImportFixture()
  assert.equal((await x.run(x.input)).status,201)
  const wrong={...x.input,images:[x.input.images[0]]}
  const r=await x.run(wrong)
  assert.equal(r.status,409)
  assert.equal(r.data.error,'gallery_changed_requires_reconciliation')
  assert.equal(x.getBatches(),1)
})
