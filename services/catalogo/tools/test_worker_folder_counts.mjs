import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'

const worker = fs.readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')

test('folder navigation uses materialized subtree counters', () => {
  const start = worker.indexOf('async function listFolders')
  const end = worker.indexOf('async function listCatalog', start)
  assert.ok(start >= 0 && end > start, 'listFolders não encontrado')
  const body = worker.slice(start, end)

  assert.match(body, /subtree_model_count/)
  assert.doesNotMatch(body, /COUNT\(m\.id\)/)
  assert.doesNotMatch(body, /subtree\(root_id,id\)/)
})

test('folder cover comes from a published model in the same folder through the existing index', () => {
  const block = worker.slice(worker.indexOf('async function listFolders'), worker.indexOf('async function listCatalog'))
  const match = block.match(/const result = await env\.DB\.prepare\(`(SELECT[\s\S]*?)`\)\.bind\(category, franchise, parent, parent, parent\)/)
  assert.ok(match, 'expected canonical indexed folder SQL')
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(`
      CREATE TABLE categories (id INTEGER PRIMARY KEY, slug TEXT);
      CREATE TABLE franchises (id INTEGER PRIMARY KEY, category_id INTEGER, slug TEXT);
      CREATE TABLE catalog_folders (
        id INTEGER PRIMARY KEY, franchise_id INTEGER, parent_id INTEGER,
        path TEXT, name TEXT, subtree_model_count INTEGER
      );
      CREATE TABLE models (
        id TEXT PRIMARY KEY, folder_id INTEGER, published INTEGER,
        cover_storage_key TEXT, name TEXT
      );
      CREATE INDEX idx_models_folder_published ON models(folder_id, published, name COLLATE NOCASE, id);
      INSERT INTO categories VALUES (1,'games');
      INSERT INTO franchises VALUES (1,1,'resident-evil'), (2,1,'other-franchise');
      INSERT INTO catalog_folders VALUES
        (1,1,NULL,'ada-wong','Ada Wong',3),
        (2,1,NULL,'jill-valentine','Jill Valentine',2),
        (3,1,NULL,'no-covers','No Covers',2),
        (4,2,NULL,'ada-wong','Other Ada',1);
      INSERT INTO models VALUES
        ('z',1,1,'media/ada-z.webp','Zed'),
        ('a',1,1,'media/ada-a.webp','Alpha'),
        ('hidden',2,0,'media/hidden.webp','Hidden'),
        ('jill',2,1,'media/jill.webp','Jill'),
        ('empty',3,1,'','No Image'),
        ('missing',3,1,NULL,'Null Image'),
        ('foreign',4,1,'media/foreign.webp','Other');
    `)
    const args = ['games','resident-evil','','','']
    const rows = db.prepare(match[1]).all(...args)
    assert.deepEqual(rows.map(row => [row.id, row.cover_storage_key]), [
      ['ada-wong','media/ada-a.webp'],
      ['jill-valentine','media/jill.webp'],
      ['no-covers',null],
    ])
    const planner = db.prepare('EXPLAIN QUERY PLAN '+match[1]).all(...args)
    assert.ok(planner.some(step => /idx_models_folder_published/.test(step.detail)),
      'cover lookup must reuse the indexed folder/published prefix')
  } finally {
    db.close()
  }
})
