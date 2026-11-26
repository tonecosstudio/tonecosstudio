import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {authorize,plan,validateTable,MIGRATION} from './promotion-schema-release.mjs';
import {stageOnly} from './m5-d1-bounded-release.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const schema=JSON.parse(readFileSync(join(root,'services/catalogo/config/catalog-schema-contract.json'),'utf8'));
const baseline=schema.requiredMigrations;
test('scope is exactly the independent 0054, never editorial migrations',()=>{
  assert.deepEqual(plan(baseline,baseline),[MIGRATION]);
  assert.deepEqual(plan([...baseline,MIGRATION],baseline),[]);
  assert.throws(()=>plan(baseline.slice(0,-1),baseline),/baseline_missing/);
  assert.throws(()=>plan([...baseline,'0034_editorial.sql'],baseline),/unrelated_migration/);
  assert.throws(()=>plan([...baseline,baseline[0]],baseline),/invalid_ledger/);
  const tmp=mkdtempSync(join(tmpdir(),'promotion-schema-'));
  try{
    const stage=join(tmp,'isolated');
    stageOnly(stage,[MIGRATION],{database_id:'87006366-60f3-4937-af73-2ef5a5f901fb',database_name:'tonecos-catalogo'},{name:'tonecos-catalogo-api',compatibility_date:'2026-01-01'});
    assert.deepEqual(readdirSync(join(stage,'migrations')),[MIGRATION]);
  }finally{rmSync(tmp,{recursive:true,force:true})}
});
test('migration creates only the verified selection table',()=>{
  const db=new DatabaseSync(':memory:');
  try{
    db.exec("CREATE TABLE models(id TEXT PRIMARY KEY); INSERT INTO models VALUES('original');");
    assert.throws(()=>validateTable([]),/physical_table/);
    db.exec(readFileSync(join(root,'services/catalogo/migrations',MIGRATION),'utf8'));
    validateTable(db.prepare("PRAGMA table_info(promotion_image_selections)").all());
    assert.equal(db.prepare('SELECT id FROM models').get().id,'original');
    assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name),['models','promotion_image_selections']);
  }finally{db.close()}
});
test('only exact manually authorized main dispatch can apply 0054',()=>{
  const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:'tonecosstudio/tonecosstudio',
    PROMOTION_OPERATION:'promotion-schema',PROMOTION_ACK:'GO-PROMOTION-SELECTION-0054-ONLY',CLOUDFLARE_API_TOKEN:'mock-cloudflare-token',GITHUB_TOKEN:'mock-github-token'};
  assert.doesNotThrow(()=>authorize(env));
  assert.throws(()=>authorize({...env,GITHUB_EVENT_NAME:'push'}),/canonical_main_dispatch/);
  assert.throws(()=>authorize({...env,PROMOTION_ACK:'GO-M5-0028-0033-20261125'}),/exact_ack/);
  assert.throws(()=>authorize({...env,GITHUB_REF:'refs/heads/other'}),/canonical_main_dispatch/);
  const workflow=readFileSync(join(root,'.github/workflows/quality.yml'),'utf8');
  assert.match(workflow,/inputs\.operation == 'promotion-schema'\)\).*tonart-catalog-production-writer/);
  assert.match(workflow,/promotion-schema-release\.mjs ready/);
});
