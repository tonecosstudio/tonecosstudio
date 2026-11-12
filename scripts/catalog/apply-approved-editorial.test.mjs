import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  planReviewedEditorial, makeAtomicEditorialStatement,
  classifyLiveRows, assertMergedReview,
} from './apply-approved-editorial.mjs';

function model(n) {
  return {
    id: 'mdl_' + String(n).repeat(20), slug: 'model-' + n,
    code: 'TS-' + n, displayName: 'Modelo ' + n,
    variantName: '', published: 1,
    categoryName: 'Colecionáveis', categorySlug: 'colecionaveis',
    franchiseName: 'Exemplo', franchiseSlug: 'exemplo',
    folderPathKey: 'series', imageCount: 2,
  };
}
function contract(models) {
  return { version:1, source:{productionModels:models.length,publishedModels:models.filter(x=>x.published).length},models };
}
const canonicalText = value => JSON.stringify(value,null,2);
const base = contract([model('a'),model('b')]);
const changed = structuredClone(base);
changed.models[0].displayName = 'Modelo novo';
changed.models[0].variantName = 'Edição especial';
changed.models[1].displayName = 'Outro modelo';

test('only edited labels from the approved immutable model contract are published', () => {
  const changes = planReviewedEditorial(canonicalText(base), canonicalText(changed));
  assert.equal(changes.length, 2);
  assert.deepEqual(changes.map(x=>x.id), base.models.map(x=>x.id));
  assert.equal(changes[0].toVariant, 'Edição especial');
  const statement = makeAtomicEditorialStatement(changes);
  assert.equal(statement.params.length, 14);
  assert.equal(statement.sql.includes('RETURNING id,name,variant_name'), true);
  assert.equal(statement.sql.includes(changes[0].toName), false,
    'The editorial text must remain bound as a parameter');
});

test('structural metadata, unpublished changes and unsupported names fail closed', () => {
  for (const mutation of [
    c=>{c.models[0].slug='different'},
    c=>{c.models[1].categorySlug='new-category'},
    c=>{c.source.publishedModels=4},
    c=>{c.models[0].id='mdl_'+'f'.repeat(20)},
    c=>{c.models[0].displayName='<unsafe>'},
    c=>{c.models[0].variantName='=spreadsheet'},
    c=>{c.models[0].variantName='>unsafe'},
    c=>{c.models[0].published=0},
  ]) {
    const c=structuredClone(changed);
    mutation(c);
    assert.throws(()=>planReviewedEditorial(canonicalText(base),canonicalText(c)));
  }
  const unchanged=structuredClone(base);
  assert.throws(()=>planReviewedEditorial(canonicalText(base),canonicalText(unchanged)),
    /editorial_change_count_invalid/);
  const collision = structuredClone(base);
  collision.models[0].displayName = base.models[1].displayName;
  assert.throws(() => planReviewedEditorial(canonicalText(base),canonicalText(collision)),
    /editorial_public_name_collision/);
  const large=contract(Array.from({length:13},(_,i)=>model((i+1).toString(16).padStart(2,'0').slice(0,1))));
  // duplicate ids from 13-to-1 digit mapping never allow a bulk release
  const next=structuredClone(large);
  next.models.forEach(m=>{m.displayName='Renomeado';});
  assert.throws(()=>planReviewedEditorial(canonicalText(large),canonicalText(next)));
});

function database() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE models(
    id TEXT PRIMARY KEY, slug TEXT NOT NULL, code TEXT NOT NULL,
    name TEXT NOT NULL, variant_name TEXT NOT NULL, published INTEGER NOT NULL,
    search_text TEXT NOT NULL, updated_at TEXT,
    franchise_id INTEGER NOT NULL DEFAULT 1, folder_id INTEGER);
    CREATE TABLE model_gallery_members(
      canonical_model_id TEXT NOT NULL, source_model_id TEXT NOT NULL);
    CREATE TRIGGER trg_gallery_member_scope_immutable
    BEFORE UPDATE OF franchise_id,folder_id,name ON models
    WHEN (
      OLD.franchise_id != NEW.franchise_id OR
      COALESCE(OLD.folder_id,-1) != COALESCE(NEW.folder_id,-1) OR
      lower(trim(OLD.name)) != lower(trim(NEW.name))
    ) AND EXISTS(
      SELECT 1 FROM model_gallery_members
      WHERE canonical_model_id=OLD.id OR source_model_id=OLD.id
    ) BEGIN
      SELECT RAISE(ABORT,'gallery member scope is immutable while attached');
    END;
    CREATE VIRTUAL TABLE fts USING fts5(model_id UNINDEXED, search_text);
    CREATE TRIGGER fts_update AFTER UPDATE OF search_text ON models
      BEGIN
        DELETE FROM fts WHERE model_id=NEW.id;
        INSERT INTO fts (model_id,search_text) VALUES (NEW.id,NEW.search_text);
      END;`);
  for(const x of base.models){
    db.prepare('INSERT INTO models (id,slug,code,name,variant_name,published,search_text) VALUES (?,?,?,?,?,?,?)')
      .run(x.id,x.slug,x.code,x.displayName,x.variantName,x.published,x.displayName.toLowerCase());
  }
  return db;
}
function rows(db){
  return db.prepare('SELECT m.id,m.slug,m.code,m.name,m.variant_name,m.published,' +
    ' EXISTS(SELECT 1 FROM model_gallery_members g' +
    ' WHERE g.canonical_model_id=m.id OR g.source_model_id=m.id)' +
    ' AS gallery_name_locked FROM models m ORDER BY m.id').all().map(r => ({
      ...r, gallery_name_locked: Number(r.gallery_name_locked),
    }));
}
test('D1/SQLite atomic UPDATE changes all approved names and refreshes FTS', () => {
  const changes=planReviewedEditorial(canonicalText(base),canonicalText(changed));
  const db=database(), before=rows(db);
  assert.equal(classifyLiveRows(changes,before),'ready');
  const {sql,params}=makeAtomicEditorialStatement(changes);
  const results=db.prepare(sql).all(...params);
  assert.equal(results.length,2);
  assert.equal(classifyLiveRows(changes,rows(db)),'already_applied');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM fts').get().n,2);
  assert.match(db.prepare('SELECT search_text FROM fts WHERE model_id=?').get(base.models[0].id).search_text,
    /Edição especial/);
  // A second invocation cannot accidentally alter any row or create aliases.
  assert.equal(db.prepare(sql).all(...params).length,0);
  assert.equal(classifyLiveRows(changes,rows(db)),'already_applied');
});
test('one stale row aborts every write; no partial update is ever applied', () => {
  const changes=planReviewedEditorial(canonicalText(base),canonicalText(changed));
  const db=database(), {sql,params}=makeAtomicEditorialStatement(changes);
  db.prepare('UPDATE models SET name=? WHERE id=?').run('Edição externa',base.models[1].id);
  const original=rows(db);
  assert.equal(classifyLiveRows(changes,original),'conflict');
  assert.equal(db.prepare(sql).all(...params).length,0);
  assert.deepEqual(rows(db),original);
});
test('gallery member names cannot be renamed and block the entire SQL batch', () => {
  const edits=planReviewedEditorial(canonicalText(base),canonicalText(changed));
  const db=database();
  db.prepare('INSERT INTO model_gallery_members(canonical_model_id,source_model_id) VALUES(?,?)')
    .run(base.models[0].id,base.models[1].id);
  const original=rows(db);
  assert.equal(classifyLiveRows(edits,original),'gallery_name_protected');
  const {sql,params}=makeAtomicEditorialStatement(edits);
  assert.equal(db.prepare(sql).all(...params).length,0,
    'Every row must stay unchanged if a renamed model belongs to a gallery');
  assert.deepEqual(rows(db),original);
  assert.throws(
    ()=>db.prepare('UPDATE models SET name=? WHERE id=?').run(
      'Unsafe manual rename',base.models[0].id),
    /gallery member scope is immutable/,
    'The SQLite fixture must enforce the actual production gallery trigger');
});

test('gallery members can change a variant while retaining the name', () => {
  const next=structuredClone(base);
  next.models[0].variantName='Edição especial';
  const edits=planReviewedEditorial(canonicalText(base),canonicalText(next));
  const db=database();
  db.prepare('INSERT INTO model_gallery_members(canonical_model_id,source_model_id) VALUES(?,?)')
    .run(base.models[0].id,base.models[1].id);
  const selectedRows = () => rows(db).filter(row => row.id === edits[0].id);
  assert.equal(classifyLiveRows(edits,selectedRows()),'ready');
  const {sql,params}=makeAtomicEditorialStatement(edits);
  assert.equal(db.prepare(sql).all(...params).length,1);
  assert.equal(classifyLiveRows(edits,selectedRows()),'already_applied');
});

test('missing gallery membership evidence cannot authorize an edit', () => {
  const edits=planReviewedEditorial(canonicalText(base),canonicalText(changed));
  const db=database();
  const unverified=rows(db).map(({gallery_name_locked,...row})=>row);
  assert.equal(classifyLiveRows(edits,unverified),'conflict');
});

test('approval requires a distinct reviewer on the current PR head',()=>{
  const head='a'.repeat(40),merge='b'.repeat(40);
  const pr={
    number:7,merged:true,merged_at:'2026-11-12T12:00:00Z',
    base:{ref:'main',repo:{full_name:'tonecosstudio/tonecosstudio'}},
    head:{ref:'editorial/tonart-admin-review',sha:head,
      repo:{full_name:'tonecosstudio/tonecosstudio'}},
    user:{login:'submitter'},merge_commit_sha:merge,
  };
  const reviewers=[{state:'APPROVED',commit_id:head,user:{login:'reviewer'}}];
  assert.doesNotThrow(()=>assertMergedReview(pr,reviewers,7,merge));
  assert.throws(()=>assertMergedReview(pr,[{...reviewers[0],commit_id:'c'.repeat(40)}],7,merge));
  assert.throws(()=>assertMergedReview(pr,[{...reviewers[0],user:{login:'submitter'}}],7,merge));
  assert.throws(()=>assertMergedReview({...pr,merged:false},reviewers,7,merge));
});
