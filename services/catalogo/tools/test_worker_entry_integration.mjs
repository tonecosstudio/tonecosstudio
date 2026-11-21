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
