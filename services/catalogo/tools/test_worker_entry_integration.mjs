import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { dirname, join } from 'node:path'
import esbuild from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundle = await esbuild.build({
  entryPoints: [join(root, 'worker/entry.ts')],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  write: false,
  logLevel: 'silent',
})
const source = bundle.outputFiles[0].text
const worker = (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).default

function mediaObject(range) {
  return {
    body: new ReadableStream({
      start(c) { c.enqueue(new TextEncoder().encode(range ? 'ab' : 'abc')); c.close() },
    }),
    size: 3,
    range,
    httpEtag: '"safe-etag"',
    writeHttpMetadata(headers) { headers.set('content-type', 'image/webp') },
  }
}

function envWithMedia(objectFactory) {
  const reads = []
  const env = {
    DB: { prepare() { throw new Error('Media handler must not touch D1') } },
    MEDIA: {
      async get(key, options) {
        reads.push({ key, options })
        return objectFactory()
      },
    },
    CORS_ORIGINS: '',
  }
  return { env, reads }
}

test('bundled Worker entrypoint builds for the edge and exports a fetch handler', () => {
  assert.equal(typeof worker.fetch, 'function')
  assert.ok(source.length > 10000)
  assert.doesNotMatch(source, /process\.env\.CLOUDFLARE_API_TOKEN|process\.env\.TURNSTILE_SECRET_KEY/)
  assert.match(readFileSync(join(root, 'worker/entry.ts'), 'utf8'), /return apiWorker\.fetch\(request, env, ctx\)/)
})

test('bundled edge entrypoint serves public R2 GET and HEAD as 200 without DB reads', async () => {
  for (const method of ['GET', 'HEAD']) {
    const { env, reads } = envWithMedia(() => mediaObject(undefined))
    const response = await worker.fetch(
      new Request('https://catalog.example.test/media/mdl_1/image/card.webp', { method }), env,
    )
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-length'), '3')
    assert.equal(response.headers.has('content-range'), false)
    assert.equal(await response.text(), method === 'GET' ? 'abc' : '')
    assert.equal(reads.length, 1)
    assert.equal(reads[0].key, 'media/mdl_1/image/card.webp')
  }
})

test('bundled edge entrypoint returns 206 only on explicit Range and blocks media mutations', async () => {
  const { env, reads } = envWithMedia(() => mediaObject({ offset: 0, length: 2 }))
  const ranged = await worker.fetch(new Request(
    'https://catalog.example.test/media/mdl_1/image/card.webp',
    { headers: { range: 'bytes=0-1' } },
  ), env)
  assert.equal(ranged.status, 206)
  assert.equal(ranged.headers.get('content-range'), 'bytes 0-1/3')
  assert.equal(await ranged.text(), 'ab')
  assert.equal(reads.length, 1)
  const blocked = await worker.fetch(new Request(
    'https://catalog.example.test/media/mdl_1/image/card.webp', { method: 'POST' },
  ), env)
  assert.equal(blocked.status, 405)
  assert.equal(reads.length, 1)
})

test('discovery cache serves only validated anonymous metadata without D1', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'caches')
  const hits = []
  let reads = 0
  let writes = 0
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: {
    async match(key) {
      hits.push(key.url)
      return Response.json({ items: [] }, { headers: { 'cache-control': 'public, max-age=300, s-maxage=1800' } })
    },
    async put() { writes++ },
  } } })
  const env = {
    DB: { prepare() { reads++; throw new Error('D1 unavailable') } },
    MEDIA: {},
    CORS_ORIGINS: 'https://tonartstudio.com.br',
  }
  const origin = 'https://catalog.example.test'
  try {
    for (const route of ['/api/categories', '/api/franchises?category=anime', '/api/folders?franchise=marvel&category=anime']) {
      const response = await worker.fetch(new Request(origin + route), env)
      assert.equal(response.status, 200, route)
      assert.deepEqual(await response.json(), { items: [] })
    }
    assert.deepEqual(hits, [
      origin + '/api/categories',
      origin + '/api/franchises?category=anime&limit=24',
      origin + '/api/folders?category=anime&franchise=marvel',
    ])
    assert.equal(reads, 0)
    assert.equal(writes, 0)
    const invalid = await worker.fetch(new Request(origin + '/api/categories?extra=1'), env)
    assert.equal(invalid.status, 400)
    assert.equal(hits.length, 3)
    for (const headers of [{ authorization: 'Bearer test' }, { cookie: 'session=test' }, { origin: 'https://tonartstudio.com.br' }]) {
      const response = await worker.fetch(new Request(origin + '/api/categories', { headers }), env)
      assert.equal(response.status, 503)
    }
    assert.ok(reads > 0)
    assert.equal(hits.length, 3)
    assert.equal(writes, 0)
  } finally {
    if (original) Object.defineProperty(globalThis, 'caches', original)
    else delete globalThis.caches
  }
})
