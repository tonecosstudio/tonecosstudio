import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { resolveApprovedCharacterScopes } from './resolve-approved-character-scope.mjs';
import { readFileSync } from 'node:fs';
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
  const reviewers=[{state:'APPROVED',commit_id:head,user:{login:'reviewer'},
    id:10,submitted_at:'2026-11-12T12:01:00Z'}];
  assert.doesNotThrow(()=>assertMergedReview(pr,reviewers,7,merge));
  assert.throws(()=>assertMergedReview(pr,[{...reviewers[0],commit_id:'c'.repeat(40)}],7,merge));
  assert.throws(()=>assertMergedReview(pr,[{...reviewers[0],user:{login:'submitter'}}],7,merge));
  assert.throws(()=>assertMergedReview({...pr,merged:false},reviewers,7,merge));
  const revoked=[...reviewers, {state:'CHANGES_REQUESTED',commit_id:head,
    id:11,user:{login:'reviewer'},submitted_at:'2026-11-12T12:02:00Z'}];
  assert.throws(()=>assertMergedReview(pr,revoked,7,merge),
    /editorial_review_not_approved_on_current_head/,
    'A later changes-requested decision must supersede an older approval');
  const reapproved=[...revoked, {state:'APPROVED',commit_id:head,
    id:12,user:{login:'reviewer'},submitted_at:'2026-11-12T12:03:00Z'}];
  assert.doesNotThrow(()=>assertMergedReview(pr,reapproved,7,merge));
  const dismissed=[...reviewers, {state:'DISMISSED',commit_id:head,
    id:14,user:{login:'reviewer'},submitted_at:'2026-11-12T12:04:00Z'}];
  assert.throws(()=>assertMergedReview(pr,dismissed,7,merge));
});

test('editorial FTS backfill remains unique across replay and synchronized on edits', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec("CREATE TABLE franchises (id INTEGER PRIMARY KEY); CREATE TABLE models (id TEXT PRIMARY KEY); INSERT INTO franchises VALUES (1); INSERT INTO models VALUES ('m1')");
    const migration = readFileSync(
      new URL('../../services/catalogo/migrations/0023_public_editorial_projection.sql', import.meta.url),
      'utf8',
    );
    db.exec(migration);
    db.prepare(`INSERT INTO editorial_public_universes(
      franchise_id, revision, reviewed_at, approval_ref,
      identity_evidence_ids_json, evidence_json
    ) VALUES (1, 'r1', '2026-11-18', 'approval1', '["e1"]', '[{}]')`).run();
    db.prepare(`INSERT INTO editorial_public_characters(
      id, slug, franchise_id, name, aliases_json,
      identity_evidence_ids_json, evidence_json,
      revision, reviewed_at, approval_ref
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'character-1', 'character-one', 1, 'Name One',
      JSON.stringify([{ value: 'Alias One' }]),
      '["e1"]', '[{}]', 'r1', '2026-11-18', 'approval1',
    );
    const count = () => db.prepare(
      'SELECT count(*) AS total FROM editorial_public_characters_fts',
    ).get().total;
    assert.equal(count(), 1);
    db.exec(migration);
    assert.equal(count(), 1, 'migration replay must not duplicate FTS rows');
    db.prepare('UPDATE editorial_public_characters SET name = ? WHERE id = ?')
      .run('Changed Name', 'character-1');
    assert.equal(
      db.prepare('SELECT count(*) AS total FROM editorial_public_characters_fts WHERE name LIKE ?')
        .get('%Changed%').total,
      1,
    );
    db.prepare('DELETE FROM editorial_public_characters WHERE id = ?')
      .run('character-1');
    assert.equal(count(), 0);
  } finally {
    db.close();
  }
});

function approvedCharacterFixture() {
  return {
    schemaVersion: 1,
    source: 'public.admin_export_approved_catalog_character_projection',
    generatedAt: '2026-11-18T04:00:00Z',
    characters: [{
      identityId: '3a63c732-fcf2-4328-ac2e-6b6c04884235',
      slug: 'character-example',
      franchiseName: 'Resident Evil',
      approvalRef: 'approval-1',
      profileRevision: 4,
      reviewedAt: '2026-11-18T02:00:00Z',
      approvedAt: '2026-11-18T03:00:00Z',
      profile: {
        slug: 'character-example',
        biography: 'Original source-backed editorial biography.',
        biographySources: [{
          title: 'Licensed publication',
          url: 'https://example.org/licensed-biography',
          kind: 'licensor',
        }],
        originWork: 'Original production',
        originWorkSources: [{
          title: 'Institutional work record',
          url: 'https://example.org/work-record',
          kind: 'institution',
        }],
        nameSources: [{
          title: 'Official character record',
          url: 'https://example.org/character-record',
          kind: 'official',
        }],
        franchiseSources: [{
          title: 'Reputable franchise reference',
          url: 'https://example.org/franchise-record',
          kind: 'reputable_reference',
        }],
        ageContext: null,
        ageSources: [],
        aliases: [],
        characteristics: [],
      },
      modelLinks: [{
        modelId: 'game-model',
        modelSlug: 'game-model-slug',
        evidenceUrl: 'https://example.org/official-character',
        evidenceTitle: 'Official verified character',
      }],
    }],
  };
}

function approvedCharacterD1Fixture() {
  return {
    franchises: [
      { id: 121, name: 'Resident Evil' },
      { id: 190, name: 'Resident Evil' },
    ],
    models: [
      { id: 'game-model', slug: 'game-model-slug', franchise_id: 121, published: 1 },
      { id: 'film-model', slug: 'film-model-slug', franchise_id: 190, published: 1 },
      { id: 'private-model', slug: 'private-model-slug', franchise_id: 121, published: 0 },
    ],
  };
}

test('approved character scope derives D1 franchise from linked model IDs, never duplicated labels', () => {
  const resolved = resolveApprovedCharacterScopes(
    approvedCharacterFixture(), approvedCharacterD1Fixture(),
  );
  assert.deepEqual(resolved, [{
    identityId: '3a63c732-fcf2-4328-ac2e-6b6c04884235',
    slug: 'character-example',
    franchiseId: 121,
    approvalRef: 'approval-1',
    modelIds: ['game-model'],
  }]);
});

test('approved character scope fails closed on ambiguous, missing or unpublished model associations', () => {
  const payload = approvedCharacterFixture();
  const d1 = approvedCharacterD1Fixture();
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [{ ...payload.characters[0], modelLinks: [] }],
  }, d1), /approved_character_scope_invalid/);
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [{
      ...payload.characters[0],
      modelLinks: [...payload.characters[0].modelLinks, {
        modelId: 'film-model',
        modelSlug: 'film-model-slug',
        evidenceUrl: 'https://example.org/evidence',
        evidenceTitle: 'Source',
      }],
    }],
  }, d1), /approved_character_franchise_ambiguous/);
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [{
      ...payload.characters[0], modelLinks: [{
        modelId: 'private-model', modelSlug: 'private-model-slug',
        evidenceUrl: 'https://example.org/evidence', evidenceTitle: 'Source',
      }],
    }],
  }, d1), /approved_character_model_not_public/);
});

test('approved character scope requires canonical slugs, explicit approval and independent HTTPS evidence', () => {
  const payload = approvedCharacterFixture();
  const d1 = approvedCharacterD1Fixture();
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, source: 'other-source',
  }, d1), /character_export_contract_invalid/);
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [{
      ...payload.characters[0], approvalRef: '',
    }],
  }, d1), /approved_character_scope_invalid/);
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [{
      ...payload.characters[0], modelLinks: [{
        ...payload.characters[0].modelLinks[0],
        evidenceUrl: 'http://example.org/evidence',
      }],
    }],
  }, d1), /approved_character_model_evidence_invalid/);
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [{
      ...payload.characters[0], modelLinks: [{
        ...payload.characters[0].modelLinks[0],
        modelSlug: 'incorrect-model',
      }],
    }],
  }, d1), /approved_character_model_identity_mismatch/);
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [payload.characters[0], payload.characters[0]],
  }, d1), /approved_character_scope_invalid/);
});

test('character scope requires reviewed, fully sourced claims; rejects unsupported evidence', () => {
  const payload = approvedCharacterFixture();
  const d1 = approvedCharacterD1Fixture();
  assert.deepEqual(resolveApprovedCharacterScopes(payload, d1)[0].modelIds, ['game-model']);
  const profile = payload.characters[0].profile;
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [{ ...payload.characters[0], profile: {
      ...profile, biographySources: [],
    } }],
  }, d1), /approved_character_biography_sources_invalid/);
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [{ ...payload.characters[0], profile: {
      ...profile, franchiseSources: [{ title: 'Bad', url: 'https://localhost/fake', kind: 'official' }],
    } }],
  }, d1), /approved_character_franchise_sources_invalid/);
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [{ ...payload.characters[0], profile: {
      ...profile, nameSources: [{ title: 'Invalid', url: 'https://example.org', kind: 'mystery' }],
    } }],
  }, d1), /approved_character_name_sources_invalid/);
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [{ ...payload.characters[0], profile: {
      ...profile, aliases: [{ name: 'Alias', sources: [] }],
    } }],
  }, d1), /approved_character_aliases_invalid/);
});

test('character scope blocks ambiguous freeform ages until the canonical public age shape is approved', () => {
  const payload = approvedCharacterFixture();
  const d1 = approvedCharacterD1Fixture();
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [{ ...payload.characters[0], profile: {
      ...payload.characters[0].profile,
      ageContext: '21 anos na fase posterior',
      ageSources: [{
        title: 'Official chronology',
        url: 'https://example.org/chronology',
        kind: 'publisher',
      }],
    } }],
  }, d1), /approved_character_age_projection_requires_canonical_split/);
  assert.throws(() => resolveApprovedCharacterScopes({
    ...payload, characters: [{ ...payload.characters[0],
      approvedAt: '2026-11-18T01:00:00Z',
    }],
  }, d1), /approved_character_approval_order_invalid/);
});
