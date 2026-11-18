import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import esbuild from 'esbuild'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config/catalog-schema-contract.json'), 'utf8'))
const migrationDirectory = path.join(root, 'migrations')
const bundled = await esbuild.build({
  entryPoints: [path.join(root, 'worker/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node26',
  write: false,
})
const worker = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
const CATALOG_MODEL_COUNT = 20_320
const PAGE_SIZE = 48

function createCatalogDatabase(modelCount = CATALOG_MODEL_COUNT, franchiseName = 'Saga Alfa') {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON; CREATE TABLE d1_migrations(name TEXT PRIMARY KEY);')
  const migrationInsert = db.prepare('INSERT INTO d1_migrations(name) VALUES(?)')
  for (const name of contract.requiredMigrations) {
    db.exec(fs.readFileSync(path.join(migrationDirectory, name), 'utf8'))
    migrationInsert.run(name)
  }

  db.prepare("INSERT INTO categories(id,slug,name) VALUES(1,'games','Games')").run()
  db.prepare("INSERT INTO franchises(id,category_id,slug,name) VALUES(1,1,'saga-alfa',?)").run(franchiseName)

  const insert = db.prepare(`INSERT INTO models(
    id,franchise_id,slug,code,name,variant_name,collection,material,height_cm,
    description,image_count,cover_storage_key,gallery_manifest_key,gallery_version,
    public_gallery_version,published,search_text
  ) VALUES(?,1,?,?,?,?,?,?,?,'Fixture local de paginação em escala.',1,?, ?,1,1,1,?)`)
  db.exec('BEGIN')
  for (let index = 1; index <= modelCount; index += 1) {
    const suffix = String(index).padStart(5, '0')
    const collection = index % 3 === 0 ? 'Coleção B' : 'Coleção A'
    const material = index % 2 === 0 ? 'PVC' : 'Resina'
    const height = 20 + (index % 61)
    insert.run(
      `model-${suffix}`, `model-${suffix}`, `R29-${suffix}`, `Modelo escalável ${suffix}`, '',
      collection, material, height, `test-media/${suffix}/card.webp`,
      `test-media/${suffix}/manifest.json`, `pokémon modelo escalável ${suffix} ${collection} ${material}`,
    )
  }
  db.exec('COMMIT')
  return db
}

function createD1Adapter(db) {
  const catalogStatements = []
  const categoryStatements = []
  const database = {
    prepare(sql) {
      const statement = db.prepare(sql)
      const all = (values) => {
        if (sql.includes('SELECT m.id,m.slug,m.code,m.name')) catalogStatements.push({ sql, values })
        if (sql.includes('SELECT c.slug AS id,c.name AS label')) categoryStatements.push({ sql, values })
        return { results: statement.all(...values) }
      }
      return {
        async all() { return all([]) },
        bind(...values) {
          return {
            async all() { return all(values) },
            async first() { return statement.get(...values) ?? null },
            async run() { return statement.run(...values) },
          }
        },
      }
    },
    async batch(statements) {
      return statements.map((statement) => statement.run())
    },
  }
  return { database, catalogStatements, categoryStatements }
}

async function requestCatalog(database, params) {
  const url = new URL('https://catalog.example.test/api/catalog')
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  const response = await worker.default.fetch(new Request(url), {
    DB: database,
    MEDIA: { get: async () => null },
    CORS_ORIGINS: '',
  })
  return { response, body: await response.json() }
}

async function requestWorker(database, path, method = 'GET') {
  const response = await worker.default.fetch(
    new Request(new URL(path, 'https://catalog.example.test'), { method }),
    { DB: database, MEDIA: { get: async () => null }, CORS_ORIGINS: '' },
  )
  return { response, body: await response.json() }
}

function seedEditorialProjection(db) {
  const evidence = {
    zoro: { id: 'official-zoro', title: 'Página oficial de personagem', url: 'https://example.org/zoro', kind: 'official' },
    luffy: { id: 'official-luffy', title: 'Página oficial de personagem', url: 'https://example.org/luffy', kind: 'official' },
    universe: { id: 'publisher-one-piece', title: 'Guia da editora', url: 'https://example.org/one-piece', kind: 'publisher' },
  }
  db.prepare(`INSERT INTO editorial_public_universes(
    franchise_id,revision,reviewed_at,approval_ref,media_types_json,summary,
    summary_evidence_ids_json,overview,overview_evidence_ids_json,
    identity_evidence_ids_json,evidence_json
  ) VALUES(1,?,?,?,?,NULL,'[]',NULL,'[]',?,?)`).run(
    'universe-rev-1', '2026-11-17T12:00:00.000Z', 'editorial-pr-1',
    JSON.stringify(['anime']), JSON.stringify([evidence.universe.id]),
    JSON.stringify([evidence.universe]),
  )

  const insertCharacter = db.prepare(`INSERT INTO editorial_public_characters(
    id,slug,franchise_id,name,aliases_json,summary,summary_evidence_ids_json,
    biography,biography_evidence_ids_json,age_value,age_context,age_evidence_ids_json,
    origin_work,origin_work_evidence_ids_json,media_types_json,
    media_type_evidence_ids_json,identity_evidence_ids_json,evidence_json,
    revision,reviewed_at,approval_ref
  ) VALUES(?,?,?,?,?,?,?,?,?,NULL,NULL,'[]',NULL,'[]',?,?,?,?,?,?,?)`)
  const insert = (profile) => insertCharacter.run(
    profile.id, profile.slug, 1, profile.name,
    JSON.stringify([{ value: profile.alias, evidenceIds: [profile.source.id] }]),
    profile.summary, JSON.stringify(profile.summary ? [profile.source.id] : []),
    profile.biography, JSON.stringify(profile.biography ? [profile.source.id] : []),
    JSON.stringify(['anime']), JSON.stringify([profile.source.id]),
    JSON.stringify([profile.source.id]), JSON.stringify([profile.source, evidence.universe]),
    profile.revision, '2026-11-17T12:00:00.000Z', 'editorial-pr-1',
  )
  insert({
    id: 'character-zoro', slug: 'roronoa-zoro', name: 'Roronoa Zoro', alias: 'Marimo',
    summary: 'Resumo aprovado com fonte.', biography: 'Biografia aprovada com fonte.',
    source: evidence.zoro, revision: 'character-rev-1',
  })
  insert({
    id: 'character-luffy', slug: 'monkey-d-luffy', name: 'Monkey D. Luffy', alias: 'Luffy',
    summary: null, biography: null,
    source: evidence.luffy, revision: 'character-rev-2',
  })
  db.prepare('UPDATE editorial_public_characters SET characteristics_json=? WHERE id=?').run(
    JSON.stringify([{ value: 'Espadachim', evidenceIds: [evidence.zoro.id] }]),
    'character-zoro',
  )

  db.prepare(`INSERT INTO editorial_public_character_models(character_id,model_id,evidence_ids_json,approval_ref)
    VALUES(?,?,?,?)`).run(
    'character-zoro', 'model-00001', JSON.stringify([evidence.zoro.id]), 'editorial-pr-1',
  )
  db.prepare(`INSERT INTO editorial_public_character_models(character_id,model_id,evidence_ids_json,approval_ref)
    VALUES(?,?,?,?)`).run(
    'character-luffy', 'model-00002', JSON.stringify([evidence.luffy.id]), 'editorial-pr-1',
  )
  db.prepare('UPDATE models SET published=0 WHERE id=?').run('model-00002')
  db.prepare("UPDATE models SET name='Roronoa Zoro',variant_name='Collector Edition' WHERE id='model-00001'").run()
  db.prepare("UPDATE models SET name='Monkey D. Luffy' WHERE id='model-00002'").run()
}

test('D1 Worker SQL keyset pages and filters a 20k live catalog over a full migrated SQLite schema', async (context) => {
  const db = createCatalogDatabase()
  context.after(() => db.close())
  const { database, catalogStatements, categoryStatements } = createD1Adapter(db)

  const categoriesResponse = await worker.default.fetch(
    new Request('https://catalog.example.test/api/categories'),
    { DB: database, MEDIA: { get: async () => null }, CORS_ORIGINS: '' },
  )
  assert.equal(categoriesResponse.status, 200)
  const categories = await categoriesResponse.json()
  assert.equal(categories.items.find((item) => item.id === 'games')?.label, 'Games')
  assert.equal(categoryStatements.length, 1)
  const categoryPlan = db.prepare(`EXPLAIN QUERY PLAN ${categoryStatements[0].sql}`).all()
  const categoryPlanDescription = categoryPlan.map((row) => row.detail).join(' | ')
  assert.match(categoryPlanDescription, /idx_franchises_category_discovery/)
  assert.match(categoryPlanDescription, /idx_models_franchise_published_image_name/)
  assert.doesNotMatch(categoryPlanDescription, /MATERIALIZE ranked_franchises|SCAN f USING COVERING INDEX/)
  assert.doesNotMatch(categoryStatements[0].sql, /ROW_NUMBER\(\) OVER/)

  const first = await requestCatalog(database, {
    category: 'games', franchise: 'saga-alfa', limit: PAGE_SIZE,
  })
  assert.equal(first.response.status, 200)
  assert.equal(first.body.items.length, PAGE_SIZE)
  assert.equal(first.body.items[0].code, 'R29-00001')
  assert.ok(first.body.nextCursor)
  const firstCodes = first.body.items.map((item) => item.code)
  const firstStatement = catalogStatements.at(-1)
  const firstPlan = db.prepare(`EXPLAIN QUERY PLAN ${firstStatement.sql}`).all(...firstStatement.values)
  assert.ok(firstPlan.some((row) => row.detail.includes('idx_models_franchise_published_name_id')),
    `Expected the franchise/name keyset index; plan: ${firstPlan.map((row) => row.detail).join(' | ')}`)

  const second = await requestCatalog(database, {
    category: 'games', franchise: 'saga-alfa', limit: PAGE_SIZE, cursor: first.body.nextCursor,
  })
  assert.equal(second.response.status, 200)
  assert.equal(second.body.items.length, PAGE_SIZE)
  assert.equal(second.body.items[0].code, 'R29-00049')
  const secondCodes = second.body.items.map((item) => item.code)
  assert.equal(firstCodes.some((code) => secondCodes.includes(code)), false)

  const filtered = await requestCatalog(database, {
    category: 'games', franchise: 'saga-alfa', material: 'PVC', collection: 'Coleção B',
    minHeight: 30, maxHeight: 60, limit: PAGE_SIZE,
  })
  assert.equal(filtered.response.status, 200)
  assert.equal(filtered.body.items.length, PAGE_SIZE)
  assert.ok(filtered.body.items.every((item) => item.material === 'PVC'
    && item.collection === 'Coleção B' && item.height_cm >= 30 && item.height_cm <= 60))
  const filteredNext = await requestCatalog(database, {
    category: 'games', franchise: 'saga-alfa', material: 'PVC', collection: 'Coleção B',
    minHeight: 30, maxHeight: 60, limit: PAGE_SIZE, cursor: filtered.body.nextCursor,
  })
  assert.equal(filteredNext.response.status, 200)
  assert.equal(filtered.body.items.some((item) => filteredNext.body.items.some((next) => next.id === item.id)), false)

  const searched = await requestCatalog(database, {
    category: 'games', franchise: 'saga-alfa', q: 'pokemon', limit: PAGE_SIZE,
  })
  assert.equal(searched.response.status, 200)
  assert.equal(searched.body.items.length, PAGE_SIZE)
  assert.equal(searched.body.items[0].code, 'R29-00001')
  assert.ok(searched.body.nextCursor)
})

test('public editorial search prioritizes exact name, aliases and canonical franchise', async (context) => {
  const db = createCatalogDatabase(3, 'One Piece')
  context.after(() => db.close())
  seedEditorialProjection(db)
  const { database } = createD1Adapter(db)

  const alias = await requestWorker(database, '/api/editorial/v1/characters/search?q=marimo&limit=8')
  assert.equal(alias.response.status, 200)
  assert.equal(alias.body.items.length, 1)
  assert.equal(alias.body.items[0].character.slug, 'roronoa-zoro')
  assert.equal(alias.body.items[0].matchedBy, 'alias')
  assert.equal(alias.body.items[0].publication.editorialStatus, 'approved')
  assert.equal(alias.body.items[0].publication.visibility, 'public')

  const exact = await requestWorker(database, '/api/editorial/v1/characters/search?q=Roronoa%20Zoro')
  assert.equal(exact.response.status, 200)
  assert.equal(exact.body.items[0].matchedBy, 'name_exact')

  const franchise = await requestWorker(database, '/api/editorial/v1/characters/search?q=One%20Piece')
  assert.equal(franchise.response.status, 200)
  assert.deepEqual(franchise.body.items.map(item => item.character.slug), ['monkey-d-luffy', 'roronoa-zoro'])
  assert.ok(franchise.body.items.every(item => item.matchedBy === 'franchise'))

  db.prepare('UPDATE editorial_public_characters SET aliases_json=? WHERE id=?').run(
    JSON.stringify([{ value: 'Wandering Swordsman', evidenceIds: ['official-zoro'] }]),
    'character-zoro',
  )
  const retiredAlias = await requestWorker(database, '/api/editorial/v1/characters/search?q=marimo')
  assert.equal(retiredAlias.body.items.length, 0)
  const currentAlias = await requestWorker(database, '/api/editorial/v1/characters/search?q=Wandering%20Swordsman')
  assert.equal(currentAlias.body.items[0].matchedBy, 'alias')
})

test('public character and universe profiles resolve only approved relations to published D1 models', async (context) => {
  const db = createCatalogDatabase(3, 'One Piece')
  context.after(() => db.close())
  seedEditorialProjection(db)
  const { database } = createD1Adapter(db)

  const character = await requestWorker(database, '/api/editorial/v1/characters/roronoa-zoro')
  assert.equal(character.response.status, 200)
  assert.equal(character.body.character.biography, 'Biografia aprovada com fonte.')
  assert.deepEqual(character.body.character.characteristics, [
    { value: 'Espadachim', evidenceIds: ['official-zoro'] },
  ])
  assert.equal(character.body.sameCharacterModels.length, 1)
  assert.equal(character.body.sameCharacterModels[0].modelId, 'model-00001')
  assert.equal(character.body.sameCharacterModels[0].variantName, 'Collector Edition')
  assert.ok(character.body.sameCharacterModels[0].evidenceIds.length > 0)

  const universe = await requestWorker(database, '/api/editorial/v1/universes/games/saga-alfa')
  assert.equal(universe.response.status, 200)
  assert.equal(universe.body.universe.name, 'One Piece')
  assert.deepEqual(universe.body.characters.map(item => item.slug), ['monkey-d-luffy', 'roronoa-zoro'])
  assert.deepEqual(universe.body.models.map(item => item.modelId), ['model-00003', 'model-00001'])

  db.prepare(`INSERT INTO editorial_public_character_models(character_id,model_id,evidence_ids_json,approval_ref)
    VALUES(?,?,?,?)`).run(
    'character-luffy', 'model-00001', JSON.stringify(['official-luffy']), 'editorial-pr-2',
  )
  const modelCharacters = await requestWorker(database, '/api/editorial/v1/models/model-00001/characters')
  assert.equal(modelCharacters.response.status, 200)
  assert.deepEqual(modelCharacters.body.items.map(item => item.character.slug), [
    'monkey-d-luffy', 'roronoa-zoro',
  ])
  assert.ok(modelCharacters.body.items.every(item =>
    item.publication.editorialStatus === 'approved' &&
    item.character.evidenceIds.length > 0 && item.relationEvidenceIds.length > 0,
  ))
  assert.ok(modelCharacters.body.items.every(item =>
    item.evidence.every(source => source.kind !== 'catalog'),
  ))
  const unpublishedModelCharacters = await requestWorker(database, '/api/editorial/v1/models/model-00002/characters')
  assert.equal(unpublishedModelCharacters.response.status, 404)

  const absent = await requestWorker(database, '/api/editorial/v1/characters/not-published')
  assert.equal(absent.response.status, 404)
  const write = await requestWorker(database, '/api/editorial/v1/characters/roronoa-zoro', 'POST')
  assert.equal(write.response.status, 404)
})
