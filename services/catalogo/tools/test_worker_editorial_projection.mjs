import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import esbuild from 'esbuild'
import {
  buildEditorialProjectionStatements,
  normalizeApprovedEditorialProjection,
} from '../worker/editorialProjection.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config/catalog-schema-contract.json'), 'utf8'))
const bundle = await esbuild.build({
  entryPoints: [path.join(root, 'worker/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node26',
  write: false,
})
const worker = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

const TOKEN = 'test-editorial-sync-token-with-at-least-thirty-two-characters'
const CHARACTER_ID = 'd92e472b-75aa-4f71-8cc4-7f4c9112cc50'
const REVIEWER_ID = 'f02df991-6cb2-49e9-9a19-45b1682ea984'
const MODEL_ID = 'mdl_aaaaaaaaaaaaaaaaaaaa'

function source(title, url, kind = 'official') { return { title, url, kind } }

function projection({ generatedAt = new Date().toISOString(), biography = 'Descrição revisada para fixture de teste.' } = {}) {
  return {
    schemaVersion: 1,
    source: 'public.admin_export_approved_catalog_character_projection',
    generatedAt,
    characters: [{
      identityId: CHARACTER_ID,
      name: 'Personagem de teste',
      franchiseName: 'Saga Alfa',
      slug: 'personagem-de-teste',
      profileRevision: 3,
      reviewedAt: '2026-11-18T12:00:00.000Z',
      reviewedBy: REVIEWER_ID,
      approvalRef: 'c9f22ef7-c078-4f5a-b215-758721755d61',
      approvedAt: '2026-11-18T12:01:00.000Z',
      approvedBy: REVIEWER_ID,
      profile: {
        slug: 'personagem-de-teste',
        aliases: [{ name: 'Alias de teste', sources: [source('Fonte do alias', 'https://example.org/alias')] }],
        biography,
        biographySources: [source('Biografia oficial', 'https://example.org/biography')],
        ageContext: 'A idade varia entre adaptações.',
        ageSources: [source('Fonte de idade', 'https://example.org/age', 'reputable_reference')],
        originWork: 'Obra de teste',
        originWorkSources: [source('Fonte da obra', 'https://example.org/origin', 'publisher')],
        characteristics: [{ name: 'Armadura de teste', sources: [source('Fonte da característica', 'https://example.org/trait', 'institution')] }],
        nameSources: [source('Identidade oficial', 'https://example.org/name')],
        franchiseSources: [source('Universo oficial', 'https://example.org/franchise', 'licensor')],
      },
      modelLinks: [{
        modelId: MODEL_ID,
        modelSlug: 'estatueta-de-teste',
        evidenceUrl: 'https://example.org/model-link',
        evidenceTitle: 'Vínculo validado manualmente',
      }],
    }],
  }
}

function createDatabase() {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON; CREATE TABLE d1_migrations(name TEXT PRIMARY KEY);')
  const insertMigration = db.prepare('INSERT INTO d1_migrations(name) VALUES(?)')
  for (const name of contract.requiredMigrations) {
    db.exec(fs.readFileSync(path.join(root, 'migrations', name), 'utf8'))
    insertMigration.run(name)
  }
  db.prepare("INSERT INTO categories(id,slug,name) VALUES(1,'universos','Universos')").run()
  db.prepare("INSERT INTO franchises(id,category_id,slug,name) VALUES(1,1,'saga-alfa','Saga Alfa')").run()
  db.prepare(`INSERT INTO models(
    id,franchise_id,slug,code,name,variant_name,collection,material,height_cm,
    description,image_count,cover_storage_key,gallery_manifest_key,gallery_version,
    public_gallery_version,published,search_text
  ) VALUES(?,1,?,'TEST01','Estatueta de teste','',NULL,NULL,NULL,'Fixture somente de teste.',1,
    NULL,NULL,1,1,1,'estatueta de teste')`).run(MODEL_ID, 'estatueta-de-teste')
  return db
}

function d1(db) {
  return {
    prepare(sql) {
      const statement = db.prepare(sql)
      const wrap = (values = []) => ({
        async all() { return { results: statement.all(...values) } },
        async first() { return statement.get(...values) ?? null },
        async run() { return statement.run(...values) },
      })
      return {
        async all() { return { results: statement.all() } },
        async first() { return statement.get() ?? null },
        async run() { return statement.run() },
        bind(...values) { return wrap(values) },
      }
    },
    async batch(statements) {
      db.exec('BEGIN IMMEDIATE')
      try {
        const result = []
        for (const statement of statements) result.push(await statement.run())
        db.exec('COMMIT')
        return result
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
  }
}

async function callWorker(db, payload, { token = TOKEN, origin, headers = {}, method = 'POST' } = {}) {
  const requestHeaders = new Headers({ 'content-type': 'application/json', ...headers })
  if (token) requestHeaders.set('authorization', `Bearer ${token}`)
  if (origin) requestHeaders.set('origin', origin)
  const response = await worker.default.fetch(new Request(
    'https://catalog.example.test/api/admin/editorial-projection',
    { method, headers: requestHeaders, body: method === 'POST' ? JSON.stringify(payload) : undefined },
  ), {
    DB: d1(db),
    MEDIA: { get: async () => null },
    CORS_ORIGINS: '',
    EDITORIAL_SYNC_TOKEN: TOKEN,
  })
  return { response, body: await response.json() }
}

test('approved Supabase export applies atomically to the canonical D1 tables and public routes', async () => {
  const db = createDatabase()
  const applied = await callWorker(db, projection())
  assert.equal(applied.response.status, 200)
  assert.equal(applied.body.applied, true)
  assert.deepEqual(applied.body.counts, { universes: 1, characters: 1, modelLinks: 1 })
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM editorial_publication_staged_model_links').get().count, 0)

  const characterResponse = await worker.default.fetch(new Request(
    'https://catalog.example.test/api/editorial/v1/characters/personagem-de-teste',
  ), { DB: d1(db), MEDIA: { get: async () => null }, CORS_ORIGINS: '' })
  assert.equal(characterResponse.status, 200)
  const characterBody = await characterResponse.json()
  assert.equal(characterBody.character.biography, 'Descrição revisada para fixture de teste.')
  assert.deepEqual(characterBody.character.ageContext, {
    value: null,
    context: 'A idade varia entre adaptações.',
    evidenceIds: characterBody.character.ageContext.evidenceIds,
  })
  assert.equal(characterBody.sameCharacterModels[0].modelId, MODEL_ID)
  assert.equal(characterBody.universe.name, 'Saga Alfa')

  const modelResponse = await worker.default.fetch(new Request(
    `https://catalog.example.test/api/editorial/v1/models/${MODEL_ID}/characters`,
  ), { DB: d1(db), MEDIA: { get: async () => null }, CORS_ORIGINS: '' })
  assert.equal(modelResponse.status, 200)
  assert.equal((await modelResponse.json()).items[0].character.slug, 'personagem-de-teste')

  const linkRevoked = projection({ generatedAt: new Date(Date.now() + 1000).toISOString() })
  linkRevoked.characters[0].modelLinks = []
  linkRevoked.characters[0].approvalRef = '3da58bec-2daf-48b2-96af-97e2b9164338'
  const revised = await callWorker(db, linkRevoked)
  assert.equal(revised.response.status, 200)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM editorial_public_character_models').get().count, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM editorial_publication_staged_model_links').get().count, 0)
  db.close()
})

test('private route requires the sync secret and rejects browsers and invalid methods', async () => {
  const db = createDatabase()
  const missingSecret = await worker.default.fetch(new Request(
    'https://catalog.example.test/api/admin/editorial-projection',
  ), { DB: d1(db), MEDIA: { get: async () => null }, CORS_ORIGINS: '' })
  assert.equal(missingSecret.status, 404)

  assert.equal((await callWorker(db, projection(), { token: 'wrong-secret' })).response.status, 401)
  assert.equal((await callWorker(db, projection(), { origin: 'https://tonartstudio.com.br' })).response.status, 403)
  assert.equal((await callWorker(db, projection(), { method: 'GET' })).response.status, 405)
  db.close()
})

test('dry-run verifies exact D1 model and franchise identities without writing rows', async () => {
  const db = createDatabase()
  const payload = projection()
  const dryRun = await callWorker(db, payload, { headers: { 'x-tonart-dry-run': 'true' } })
  assert.equal(dryRun.response.status, 200)
  assert.equal(dryRun.body.dryRun, true)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM editorial_public_characters').get().count, 0)

  const badModel = structuredClone(payload)
  badModel.characters[0].modelLinks[0].modelSlug = 'wrong-catalog-slug'
  const rejectedModel = await callWorker(db, badModel, { headers: { 'x-tonart-dry-run': 'true' } })
  assert.equal(rejectedModel.response.status, 422)
  assert.equal(rejectedModel.body.error, 'editorial_model_reference_invalid')

  const badFranchise = structuredClone(payload)
  badFranchise.characters[0].franchiseName = 'Universo ausente'
  badFranchise.characters[0].profile.franchiseSources[0] = source('Fonte', 'https://example.org/missing')
  const rejectedFranchise = await callWorker(db, badFranchise, { headers: { 'x-tonart-dry-run': 'true' } })
  assert.equal(rejectedFranchise.response.status, 422)
  assert.equal(rejectedFranchise.body.error, 'editorial_franchise_not_found')
  db.close()
})

test('evidence is mandatory for every public fact and relation; empty export is fail-closed', async () => {
  const db = createDatabase()
  const missingBiographySource = projection()
  missingBiographySource.characters[0].profile.biographySources = []
  const rejectedBiography = await callWorker(db, missingBiographySource)
  assert.equal(rejectedBiography.response.status, 422)

  const catalogOnlyIdentity = projection()
  catalogOnlyIdentity.characters[0].profile.nameSources = [source('Catálogo', 'https://example.org/catalog', 'catalog')]
  const rejectedIdentity = await callWorker(db, catalogOnlyIdentity)
  assert.equal(rejectedIdentity.response.status, 422)

  const empty = { schemaVersion: 1, source: 'public.admin_export_approved_catalog_character_projection',
    generatedAt: new Date().toISOString(), characters: [] }
  assert.equal((await callWorker(db, empty)).response.status, 409)
  const clearDryRun = await callWorker(db, empty, {
    headers: { 'x-tonart-allow-empty': 'confirm', 'x-tonart-dry-run': 'true' },
  })
  assert.equal(clearDryRun.response.status, 200)
  assert.equal(clearDryRun.body.counts.characters, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM editorial_public_characters').get().count, 0)
  db.close()
})

test('same snapshot is idempotent; a stale revision cannot restore revoked content', async () => {
  const db = createDatabase()
  const initial = projection()
  assert.equal((await callWorker(db, initial)).response.status, 200)
  const repeated = await callWorker(db, initial)
  assert.equal(repeated.response.status, 200)
  assert.equal(repeated.body.idempotent, true)

  const stale = projection({ generatedAt: '2026-11-17T00:00:00.000Z', biography: 'Conteúdo antigo.' })
  const rejected = await callWorker(db, stale)
  assert.equal(rejected.response.status, 409)
  assert.equal(rejected.body.error, 'editorial_projection_stale_source_revision')
  assert.equal(db.prepare('SELECT biography FROM editorial_public_characters').get().biography,
    'Descrição revisada para fixture de teste.')
  db.close()
})

test('D1 batch rollback and compare-and-swap leave the last approved projection intact on failure', async () => {
  const db = createDatabase()
  const firstPayload = projection()
  const first = await normalizeApprovedEditorialProjection(firstPayload)
  const db1 = d1(db)
  const franchises = new Map([['saga alfa', 1]])
  await db1.batch(buildEditorialProjectionStatements(first, '', new Date().toISOString(), franchises)
    .map(row => db1.prepare(row.sql).bind(...row.values)))

  const secondPayload = projection({
    generatedAt: new Date(Date.now() + 1000).toISOString(),
    biography: 'Biografia atualizada com aprovação nova.',
  })
  secondPayload.characters[0].approvalRef = 'a8e708ae-caf4-4858-a66a-1c9f23174f9d'
  const second = await normalizeApprovedEditorialProjection(secondPayload)

  db.exec(`CREATE TRIGGER fail_projection_test BEFORE UPDATE ON editorial_public_characters
    BEGIN SELECT RAISE(ABORT, 'forced_transaction_failure'); END;`)
  const failedApply = await callWorker(db, secondPayload)
  assert.equal(failedApply.response.status, 409)
  assert.equal(db.prepare('SELECT biography FROM editorial_public_characters').get().biography,
    'Descrição revisada para fixture de teste.')
  db.exec('DROP TRIGGER fail_projection_test')

  // Simulate two publishers that both read the original cursor: the stale CAS
  // must abort rather than replacing the newer snapshot.
  await assert.rejects(db1.batch(buildEditorialProjectionStatements(second, '', new Date().toISOString(), franchises)
    .map(row => db1.prepare(row.sql).bind(...row.values))), /revision_conflict/)
  assert.equal(db.prepare('SELECT biography FROM editorial_public_characters').get().biography,
    'Descrição revisada para fixture de teste.')
  db.close()
})
